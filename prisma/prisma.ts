import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import 'dotenv/config'

const globalForPrisma = global as unknown as { 
    prisma: PrismaClient
}

const adapter = new PrismaLibSQL({
  url: `${process.env.TURSO_DATABASE_URL}`,
  authToken: `${process.env.TURSO_AUTH_TOKEN}`,
})

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

