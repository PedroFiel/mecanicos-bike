import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";
import { resolveDatabaseUrl } from "./prisma/database-url";

const url = resolveDatabaseUrl(process.env.DATABASE_URL);
if (url) process.env.DATABASE_URL = url;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
