import { z } from "zod";

export const layoutSchema = z.object({
  rows: z.number().int().min(3).max(20),
  cols: z.number().int().min(3).max(20)
});
