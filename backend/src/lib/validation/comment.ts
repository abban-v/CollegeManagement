import { z } from "zod";

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
