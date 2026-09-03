import { z } from "zod";

// Issue status enum
export const IssueStatusEnum = z.enum([
  "REPORTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "RESOLUTION_SUBMITTED",
  "VERIFIED",
  "CLOSED",
  "REOPENED",
  "DISPUTED",
]);

export type IssueStatus = z.infer<typeof IssueStatusEnum>;

// Issue priority enum
export const IssuePriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export type IssuePriority = z.infer<typeof IssuePriorityEnum>;

// Moderation status enum
export const ModerationStatusEnum = z.enum([
  "NORMAL",
  "FLAGGED",
  "UNDER_REVIEW",
  "APPROVED",
  "DUPLICATE",
  "REMOVED",
]);

export type ModerationStatus = z.infer<typeof ModerationStatusEnum>;

// Issue creation request schema
export const CreateIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  suspectedCause: z.string().optional(),
  proposedSolution: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  assetId: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : undefined)),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;

// Issue update schema
export const UpdateIssueSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  suspectedCause: z.string().optional(),
  proposedSolution: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  assetId: z.string().optional(),
  status: IssueStatusEnum.optional(),
  priority: IssuePriorityEnum.optional(),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueSchema>;

// Status transition schema
export const IssueStatusTransitionSchema = z.object({
  toStatus: IssueStatusEnum,
  reason: z.string().optional(),
});

export type IssueStatusTransitionInput = z.infer<
  typeof IssueStatusTransitionSchema
>;

// Zod schemas for responses
export const IssueResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  status: IssueStatusEnum,
  priority: IssuePriorityEnum,
  moderationStatus: ModerationStatusEnum,
  reporterId: z.string(),
  affectedUserCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IssueResponse = z.infer<typeof IssueResponseSchema>;
