import prisma from "@/lib/db";
import { CreateAssetInput, UpdateAssetInput } from "@/lib/validation/asset";
import { AssetStatus } from "@prisma/client";

export class AssetService {
  async listAssets(params?: {
    departmentId?: string;
    category?: string;
    status?: AssetStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: import("@prisma/client").Prisma.AssetWhereInput = {};

    if (params?.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { assetTag: { contains: params.search, mode: "insensitive" } },
        { locationId: { contains: params.search, mode: "insensitive" } },
        { modelNumber: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: params?.skip || 0,
        take: params?.take || 100,
        include: {
          _count: {
            select: { issues: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      assets: assets.map((a) => ({
        ...a,
        reportedIssuesCount: a._count?.issues ?? a.reportedIssuesCount,
      })),
      total,
      skip: params?.skip || 0,
      take: params?.take || 100,
    };
  }

  async getAssetById(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        issues: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            reporter: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async getAssetByTag(assetTag: string) {
    return prisma.asset.findUnique({
      where: { assetTag },
    });
  }

  async createAsset(input: CreateAssetInput) {
    return prisma.asset.create({
      data: {
        name: input.name,
        assetTag: input.assetTag.toUpperCase().trim(),
        category: input.category,
        departmentId: input.departmentId,
        locationId: input.locationId,
        status: (input.status as AssetStatus) || AssetStatus.OPERATIONAL,
        modelNumber: input.modelNumber,
        serialNumber: input.serialNumber,
        imageUrl: input.imageUrl,
      },
    });
  }

  async updateAsset(id: string, input: UpdateAssetInput) {
    const data: import("@prisma/client").Prisma.AssetUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.assetTag !== undefined) data.assetTag = input.assetTag.toUpperCase().trim();
    if (input.category !== undefined) data.category = input.category;
    if (input.departmentId !== undefined) data.departmentId = input.departmentId;
    if (input.locationId !== undefined) data.locationId = input.locationId;
    if (input.status !== undefined) data.status = input.status as AssetStatus;
    if (input.modelNumber !== undefined) data.modelNumber = input.modelNumber;
    if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.lastServicedAt !== undefined) {
      data.lastServicedAt = new Date(input.lastServicedAt);
    }

    return prisma.asset.update({
      where: { id },
      data,
    });
  }

  async deleteAsset(id: string) {
    return prisma.asset.delete({
      where: { id },
    });
  }
}

export const assetService = new AssetService();
