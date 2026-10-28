import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { z } from "zod";
import { config, maxUploadBytes } from "./config.js";
import { AppError, PayloadTooLargeError } from "./errors.js";
import { normalizeMarkdownSource } from "./normalize.js";

const slugSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);

export const documentMetadataSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(200),
  originalName: z.string().min(1).max(255),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.literal("text/markdown"),
  createdAt: z.string().datetime()
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

const allowedExtensions = new Set([".md", ".markdown"]);

const documentsDir = path.join(config.DATA_DIR, "documents");
const metadataDir = path.join(config.DATA_DIR, "metadata");
const tmpDir = path.join(config.DATA_DIR, "tmp");

export async function ensureDataDirs(): Promise<void> {
  await Promise.all([
    fs.mkdir(documentsDir, { recursive: true }),
    fs.mkdir(metadataDir, { recursive: true }),
    fs.mkdir(tmpDir, { recursive: true })
  ]);
}

export function validateSlug(slug: string): string {
  return slugSchema.parse(slug);
}

export function documentPath(slug: string): string {
  return path.join(documentsDir, `${validateSlug(slug)}.md`);
}

function metadataPath(slug: string): string {
  return path.join(metadataDir, `${validateSlug(slug)}.json`);
}

function normalizeOriginalName(filename: string): string {
  const name = path.basename(filename.trim()).replace(/\0/g, "");
  if (!name || name === "." || name === "..") {
    throw new AppError("Missing filename");
  }

  if (name.length > 255) {
    throw new AppError("Filename is too long");
  }

  const extension = path.extname(name).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new AppError("Only .md and .markdown files are supported");
  }

  return name;
}

function slugify(input: string): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return ascii.slice(0, 64) || "document";
}

async function createUniqueSlug(base: string): Promise<string> {
  for (let index = 0; index < 10; index += 1) {
    const suffix = crypto.randomBytes(5).toString("hex");
    const slug = `${base}-${suffix}`.slice(0, 96).replace(/-+$/g, "");
    const exists = await fileExists(metadataPath(slug));
    if (!exists) {
      return slug;
    }
  }

  throw new AppError("Could not allocate a document slug", 500);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().slice(0, 200);
}

async function inferTitle(filePath: string, fallbackName: string): Promise<string> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(128 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const preview = buffer.subarray(0, bytesRead).toString("utf8");
    const heading = preview.match(/^\s{0,3}#\s+(.+)$/m)?.[1];
    return cleanTitle(heading ?? path.basename(fallbackName, path.extname(fallbackName)));
  } finally {
    await handle.close();
  }
}

async function writeMetadata(metadata: DocumentMetadata): Promise<void> {
  const parsed = documentMetadataSchema.parse(metadata);
  await fs.writeFile(metadataPath(parsed.slug), `${JSON.stringify(parsed, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
}

type CreateDocumentInput = {
  stream: NodeJS.ReadableStream;
  filename: string;
  title?: string;
};

export async function createDocumentFromStream(input: CreateDocumentInput): Promise<DocumentMetadata> {
  await ensureDataDirs();

  const originalName = normalizeOriginalName(input.filename);
  const requestedTitle = input.title ? cleanTitle(input.title) : "";
  const base = slugify(path.basename(originalName, path.extname(originalName)));
  const slug = await createUniqueSlug(base);
  const tmpPath = path.join(tmpDir, `${slug}.${process.pid}.${Date.now()}.tmp`);
  const finalPath = documentPath(slug);
  let bytes = 0;

  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxUploadBytes) {
        callback(new PayloadTooLargeError(`File exceeds ${config.MAX_UPLOAD_MB} MB`));
        return;
      }

      callback(null, chunk);
    }
  });

  try {
    await pipeline(input.stream, limiter, createWriteStream(tmpPath, { flags: "wx" }));

    if (bytes === 0) {
      throw new AppError("File is empty");
    }

    await fs.rename(tmpPath, finalPath);
    const rawContent = await fs.readFile(finalPath, "utf8");
    const normalizedContent = normalizeMarkdownSource(rawContent);
    if (normalizedContent !== rawContent) {
      await fs.writeFile(finalPath, normalizedContent, "utf8");
    }

    const storedBytes = Buffer.byteLength(normalizedContent, "utf8");
    const title = requestedTitle || (await inferTitle(finalPath, originalName));
    const metadata: DocumentMetadata = {
      slug,
      title,
      originalName,
      bytes: storedBytes,
      sha256: crypto.createHash("sha256").update(normalizedContent, "utf8").digest("hex"),
      contentType: "text/markdown",
      createdAt: new Date().toISOString()
    };

    await writeMetadata(metadata);
    return metadata;
  } catch (error) {
    await Promise.allSettled([fs.unlink(tmpPath), fs.unlink(finalPath), fs.unlink(metadataPath(slug))]);
    throw error;
  }
}

export async function createDocumentFromFile(filePath: string, title?: string): Promise<DocumentMetadata> {
  const sourcePath = path.resolve(filePath);
  const stat = await fs.stat(sourcePath);
  if (!stat.isFile()) {
    throw new AppError("Source path is not a file");
  }

  return createDocumentFromStream({
    stream: createReadStream(sourcePath),
    filename: path.basename(sourcePath),
    title
  });
}

export async function readMetadata(slug: string): Promise<DocumentMetadata | null> {
  try {
    const raw = await fs.readFile(metadataPath(slug), "utf8");
    return documentMetadataSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function readDocument(slug: string): Promise<string | null> {
  try {
    return await fs.readFile(documentPath(slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  await ensureDataDirs();
  const files = await fs.readdir(metadataDir);
  const documents = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(metadataDir, file), "utf8");
        return documentMetadataSchema.parse(JSON.parse(raw));
      })
  );

  return documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
