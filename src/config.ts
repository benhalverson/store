import { z } from "zod";

const zEnv = z.object({
  VITE_BASE_URL: z.string().url(),
  VITE_DOMAIN: z.string().min(1).max(100),
  VITE_COLOR_PICKER_VERSION: z.enum(["v1", "v2"]).optional(),
});

const parsed = zEnv.parse(import.meta.env);

export const BASE_URL = parsed.VITE_BASE_URL;
export const DOMAIN = parsed.VITE_DOMAIN;
export const COLOR_PICKER_VERSION = parsed.VITE_COLOR_PICKER_VERSION ?? "v1";
