import path from "node:path";
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PUBLIC_BASE_URL: z.string().url().optional(),
  UPLOAD_TOKEN: z.string().min(24).optional(),
  DATA_DIR: z.string().min(1).default(path.join(process.cwd(), "data")),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(50),
  MAX_RENDER_MB: z.coerce.number().int().min(1).max(50).default(5)
});

export const config = envSchema.parse(process.env);

export const maxUploadBytes = config.MAX_UPLOAD_MB * 1024 * 1024;
export const maxRenderBytes = config.MAX_RENDER_MB * 1024 * 1024;

export function publicBaseUrlFromRequest(requestBase: string): string {
  return config.PUBLIC_BASE_URL ?? requestBase;
}
