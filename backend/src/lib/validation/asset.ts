import { z } from "zod";

export const AssetStatusEnum = z.enum([
  "OPERATIONAL",
  "DEGRADED",
  "OUT_OF_SERVICE",
  "UNDER_MAINTENANCE",
]);

export type AssetStatus = z.infer<typeof AssetStatusEnum>;

export const CreateAssetSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters").max(100),
  assetTag: z.string().min(2, "Asset tag is required").max(50),
  category: z.string().min(1, "Category is required"),
  departmentId: z.string().min(1, "Department is required"),
  locationId: z.string().min(1, "Location is required"),
  status: AssetStatusEnum.optional().default("OPERATIONAL"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  assetTag: z.string().min(2).max(50).optional(),
  category: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  status: AssetStatusEnum.optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  lastServicedAt: z.string().or(z.date()).optional(),
  imageUrl: z.string().optional(),
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
