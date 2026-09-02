// This file handles Prisma client initialization and singleton management across serverless lambdas
import { PrismaClient } from "@prisma/client";

function getEffectiveDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url && process.env.DIRECT_URL) {
    url = process.env.DIRECT_URL;
  }
  if (url && url.includes("pooler.supabase.com:5432")) {
    // Port 5432 on pooler host times out. Use transaction pooler port 6543 with pgbouncer=true
    url = url.replace(":5432/", ":6543/");
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
  }
  return url;
}

const prismaClientSingleton = () => {
  const url = getEffectiveDatabaseUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

// Always preserve singleton on globalThis across all environments (including production lambdas)
globalThis.prisma = prisma;
