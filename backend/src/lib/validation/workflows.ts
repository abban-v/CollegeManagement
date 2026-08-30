import { z } from "zod";
import { ModerationStatusEnum } from "@/lib/validation/issue";

const evidenceUrl = z.string().trim().min(1).max(2048);

export const ResolutionEvidenceSchema = z.object({
  storageKey: z.string().trim().min(1).max(2048),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
});

export const SubmitResolutionSchema = z.object({
  description: z.string().trim().min(10).max(3000),
  evidenceImages: z.array(ResolutionEvidenceSchema).min(1).max(5),
});

export type SubmitResolutionInput = z.infer<typeof SubmitResolutionSchema>;

export const DisputeResolutionSchema = z.object({
  reason: z.string().trim().min(10).max(1500),
  evidenceUrls: z.array(evidenceUrl).max(5).optional().default([]),
});

export type DisputeResolutionInput = z.infer<typeof DisputeResolutionSchema>;

export const ReportIssueSchema = z.object({
  reason: z.enum([
    "spam",
    "duplicate",
    "inappropriate",
    "misleading",
    "sensitive_info",
    "other",
  ]),
  details: z.string().trim().max(1000).optional(),
});

export type ReportIssueInput = z.infer<typeof ReportIssueSchema>;

export const ModerateIssueSchema = z.object({
  moderationStatus: ModerationStatusEnum,
  reason: z.string().trim().min(3).max(1000).optional(),
});

export type ModerateIssueInput = z.infer<typeof ModerateIssueSchema>;
