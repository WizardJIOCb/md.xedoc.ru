import path from "node:path";
import { config } from "../src/config.js";
import { createDocumentFromFile } from "../src/storage.js";

type ParsedArgs = {
  filePath: string;
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

  if (!positionals[0]) {
    throw new Error("Usage: pnpm import <file.md> [--title <title>]");
  }

  return { filePath: positionals[0], title };
}

const { filePath, title } = parseArgs(process.argv.slice(2));
const metadata = await createDocumentFromFile(path.resolve(filePath), title);
const baseUrl = config.PUBLIC_BASE_URL ?? `http://${config.HOST}:${config.PORT}`;

console.log(
  JSON.stringify(
    {
      document: metadata,
      links: {
        publicUrl: new URL(`/s/${metadata.slug}`, baseUrl).toString(),
        rawUrl: new URL(`/raw/${metadata.slug}`, baseUrl).toString(),
        downloadUrl: new URL(`/download/${metadata.slug}`, baseUrl).toString()
      }
    },
    null,
    2
  )
);
