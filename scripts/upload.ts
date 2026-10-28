import { promises as fs } from "node:fs";
import path from "node:path";
import "dotenv/config";

type ParsedArgs = {
  filePath: string;
  serviceUrl: string;
  title?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  let title: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--title") {
      title = argv[index + 1];
      index += 1;
      continue;
    }

    positionals.push(value);
  }

  const filePath = positionals[0];
  const serviceUrl = positionals[1] ?? process.env.MD_SERVICE_URL;

  if (!filePath || !serviceUrl) {
    throw new Error("Usage: pnpm upload <file.md> <service-url> [--title <title>]");
  }

  return { filePath, serviceUrl, title };
}

const { filePath, serviceUrl, title } = parseArgs(process.argv.slice(2));
const token = process.env.MD_UPLOAD_TOKEN ?? process.env.UPLOAD_TOKEN;

if (!token) {
  throw new Error("Set MD_UPLOAD_TOKEN or UPLOAD_TOKEN before uploading");
}

const absolutePath = path.resolve(filePath);
const file = await fs.readFile(absolutePath);
const form = new FormData();

if (title?.trim()) {
  form.append("title", title.trim());
}

form.append(
  "file",
  new Blob([file], { type: "text/markdown; charset=utf-8" }),
  path.basename(absolutePath)
);

const endpoint = new URL("/api/documents", serviceUrl);
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: form
});

const result = await response.json().catch(() => null);

if (!response.ok) {
  throw new Error(result?.error ?? `Upload failed with HTTP ${response.status}`);
}

console.log(JSON.stringify(result, null, 2));
