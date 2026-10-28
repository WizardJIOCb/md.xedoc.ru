import multipart from "@fastify/multipart";
import Fastify, { type FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config, publicBaseUrlFromRequest } from "./config.js";
import { AppError } from "./errors.js";
import { faviconSvg } from "./favicon.js";
import { documentPage, errorPage, notFoundPage, uploadPage } from "./pages.js";
import {
  createDocumentFromStream,
  ensureDataDirs,
  listDocuments,
  readDocument,
  readMetadata,
  validateSlug
} from "./storage.js";

const uploadFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200).optional()
});

const paramsSchema = z.object({
  slug: z.string().min(3).max(96)
});

const headersSchema = z
  .object({
    authorization: z.string().optional(),
    "x-upload-token": z.string().optional()
  })
  .passthrough();

export async function buildServer() {
  await ensureDataDirs();

  const app = Fastify({
    trustProxy: true,
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie", "req.headers.x-upload-token"]
    }
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.MAX_UPLOAD_MB * 1024 * 1024,
      fields: 4
    }
  });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(uploadPage());
  });

  app.get("/favicon.svg", async (_request, reply) => {
    return reply
      .type("image/svg+xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=86400")
      .send(faviconSvg);
  });

  app.get("/favicon.ico", async (_request, reply) => {
    return reply.redirect("/favicon.svg", 302);
  });

  app.get("/healthz", async () => ({ ok: true }));

  app.post("/api/documents", async (request, reply) => {
    requireUploadToken(request);

    if (!request.isMultipart()) {
      throw new AppError("Expected multipart/form-data", 415);
    }

    const fields: Record<string, string> = {};
    let createdDocument: Awaited<ReturnType<typeof createDocumentFromStream>> | null = null;

    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (typeof part.value === "string") {
          fields[part.fieldname] = part.value;
        }
        continue;
      }

      if (part.fieldname !== "file") {
        part.file.resume();
        throw new AppError("Unexpected file field");
      }

      if (createdDocument) {
        part.file.resume();
        throw new AppError("Only one file can be uploaded");
      }

      const parsedFields = uploadFieldsSchema.parse(fields);
      createdDocument = await createDocumentFromStream({
        stream: part.file,
        filename: part.filename,
        title: parsedFields.title
      });
    }

    if (!createdDocument) {
      throw new AppError("Missing file");
    }

    return reply.code(201).send({
      document: createdDocument,
      links: makeLinks(request, createdDocument.slug)
    });
  });

  app.get("/api/documents", async (request) => {
    requireUploadToken(request);
    const documents = await listDocuments();
    return { documents };
  });

  app.get("/s/:slug", async (request, reply) => {
    const slug = parseSlugParam(request.params);
    const [metadata, content] = await Promise.all([readMetadata(slug), readDocument(slug)]);

    if (!metadata || content === null) {
      return reply.code(404).type("text/html; charset=utf-8").send(notFoundPage());
    }

    return reply
      .type("text/html; charset=utf-8")
      .send(documentPage(metadata, content, makeLinks(request, slug)));
  });

  app.get("/raw/:slug", async (request, reply) => {
    const slug = parseSlugParam(request.params);
    const [metadata, content] = await Promise.all([readMetadata(slug), readDocument(slug)]);

    if (!metadata || content === null) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header("Cache-Control", "public, max-age=300")
      .send(content);
  });

  app.get("/download/:slug", async (request, reply) => {
    const slug = parseSlugParam(request.params);
    const metadata = await readMetadata(slug);

    if (!metadata) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header("Content-Disposition", contentDispositionAttachment(metadata.originalName))
      .send(await readDocument(slug));
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    app.log.error(error);
    return reply.code(500).type("text/html; charset=utf-8").send(errorPage("Internal server error"));
  });

  return app;
}

function requireUploadToken(request: FastifyRequest): void {
  if (!config.UPLOAD_TOKEN) {
    throw new AppError("Upload token is not configured", 503);
  }

  const headers = headersSchema.parse(request.headers);
  const bearer = headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? headers["x-upload-token"];

  if (!token || !constantTimeEqual(token, config.UPLOAD_TOKEN)) {
    throw new AppError("Unauthorized", 401);
  }
}

function constantTimeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function parseSlugParam(params: unknown): string {
  const parsed = paramsSchema.parse(params);
  return validateSlug(parsed.slug);
}

function makeLinks(request: FastifyRequest, slug: string) {
  const base = publicBaseUrlFromRequest(`${request.protocol}://${request.hostname}`);
  return {
    publicUrl: new URL(`/s/${slug}`, base).toString(),
    rawUrl: new URL(`/raw/${slug}`, base).toString(),
    downloadUrl: new URL(`/download/${slug}`, base).toString()
  };
}

function contentDispositionAttachment(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\\r\n]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const isDirectRun = process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts");

if (isDirectRun) {
  const app = await buildServer();
  await app.listen({ host: config.HOST, port: config.PORT });
}
