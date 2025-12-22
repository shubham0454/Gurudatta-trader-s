import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { userSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const { searchParams } = new URL(request.url)
    const userType = searchParams.get('userType') // Filter by BMC, Dabhadi, or Customer

    const where: any = {}
    if (userType && (userType === 'BMC' || userType === 'Dabhadi' || userType === 'Customer')) {
      where.userType = userType
    }

    try {
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          userCode: true,
          name: true,
          mobileNo: true,
          address: true,
          email: true,
          userType: true,
          status: true,
          createdAt: true,
          bills: {
            select: {
              pendingAmount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ users })
    } catch (dbError: any) {
      // If fields don't exist yet (database not migrated), fetch without new fields
      const errorMessage = dbError.message || ''
      const isFieldError = 
        dbError.code === 'P2009' || 
        errorMessage.includes('Unknown field') ||
        errorMessage.includes('Unknown column') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('userCode') ||
        errorMessage.includes('userType') ||
        errorMessage.includes('status')

      if (isFieldError) {
        // Fetch without new fields (database not migrated yet)
        const users = await prisma.user.findMany({
          where: {},
          select: {
            id: true,
            name: true,
            mobileNo: true,
            address: true,
            email: true,
            createdAt: true,
            bills: {
              select: {
                pendingAmount: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Add default values for missing fields
        const usersWithDefaults = users.map((user: any, index: number) => ({
          ...user,
          userCode: `BMC-${String(index + 1).padStart(4, '0')}`,
          userType: 'BMC',
          status: 'active',
        }))

        return NextResponse.json({ users: usersWithDefaults })
      }
      throw dbError
    }
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    authMiddleware(request)

    const body = await request.json()
    const validatedData = userSchema.parse(body)

    // Generate unique user code if not provided
    let userCode = validatedData.userCode
    if (!userCode) {
      const userCount = await prisma.user.count()
      let prefix = 'BMC'
      if (validatedData.userType === 'Dabhadi') {
        prefix = 'DAB'
      } else if (validatedData.userType === 'Customer') {
        prefix = 'CUS'
      }
      userCode = `${prefix}-${String(userCount + 1).padStart(4, '0')}`
      
      // Ensure uniqueness
      let counter = 1
      while (await prisma.user.findUnique({ where: { userCode } })) {
        userCode = `${prefix}-${String(userCount + 1 + counter).padStart(4, '0')}`
        counter++
      }
    }

    const user = await prisma.user.create({
      data: {
        userCode,
        name: validatedData.name,
        mobileNo: validatedData.mobileNo,
        address: validatedData.address || null,
        email: validatedData.email || null,
        userType: validatedData.userType || 'BMC',
        status: validatedData.status || 'active',
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('userCode')) {
        return NextResponse.json(
          { error: 'User code already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Mobile number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

