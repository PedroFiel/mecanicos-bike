import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import 'dotenv/config'
import { resolveDatabaseUrl } from './database-url'

const globalForPrisma = global as unknown as { 
    prisma: PrismaClient
}

const tursoUrl = process.env.TURSO_DATABASE_URL
const prisma = globalForPrisma.prisma ?? (tursoUrl
  ? new PrismaClient({
      adapter: new PrismaLibSQL({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN }),
    })
  : new PrismaClient({ datasourceUrl: resolveDatabaseUrl(process.env.DATABASE_URL) }))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

