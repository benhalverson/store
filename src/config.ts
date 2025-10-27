import { z } from "zod";

const zEnv = z.object({
  VITE_BASE_URL: z.string().url(),
  VITE_DOMAIN: z.string().min(1).max(100),
});

const parsed = zEnv.parse(import.meta.env);

export const BASE_URL = parsed.VITE_BASE_URL;
export const DOMAIN = parsed.VITE_DOMAIN;
