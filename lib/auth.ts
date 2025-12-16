import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export interface JWTPayload {
  adminId: string
  mobileNo: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function authenticateAdmin(mobileNo: string, password: string) {
  const admin = await prisma.admin.findUnique({
    where: { mobileNo },
  })

  if (!admin) {
    return null
  }

  const isValid = await verifyPassword(password, admin.password)
  if (!isValid) {
    return null
  }

  const token = generateToken({
    adminId: admin.id,
    mobileNo: admin.mobileNo,
  })

  return {
    admin: {
      id: admin.id,
      mobileNo: admin.mobileNo,
      name: admin.name,
    },
    token,
  }
}

