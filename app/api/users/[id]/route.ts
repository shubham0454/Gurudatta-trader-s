import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { userSchema } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        bills: {
          include: {
            items: {
              include: {
                feed: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const body = await request.json()
    
    // Extract only the fields that are in the schema
    // Handle cases where body might contain extra fields from frontend
    // Convert null/undefined to empty string for optional fields
    const updateFields: any = {
      name: body.name || '',
      mobileNo: body.mobileNo || '',
    }
    
    // Optional fields - convert null to empty string for email, keep null for address
    if (body.address !== undefined) {
      updateFields.address = body.address === null ? null : (body.address || null)
    }
    if (body.email !== undefined) {
      // Convert null to empty string for email validation
      updateFields.email = body.email === null || body.email === '' ? '' : body.email
    }
    if (body.userCode) updateFields.userCode = body.userCode
    if (body.userType) updateFields.userType = body.userType
    if (body.status) updateFields.status = body.status
    
    // Validate the data
    try {
      var validatedData = userSchema.parse(updateFields)
    } catch (validationError: any) {
      console.error('Validation error:', validationError)
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: validationError.errors || validationError.message 
        },
        { status: 400 }
      )
    }

    // First, check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if mobileNo is being changed and if it conflicts with another user
    if (validatedData.mobileNo !== existingUser.mobileNo) {
      const mobileConflict = await prisma.user.findFirst({
        where: { mobileNo: validatedData.mobileNo },
      })
      if (mobileConflict && mobileConflict.id !== params.id) {
        return NextResponse.json(
          { error: 'Mobile number already exists for another user' },
          { status: 400 }
        )
      }
    }

    // Check if userCode is being changed and if it conflicts with another user
    if (validatedData.userCode && validatedData.userCode !== existingUser.userCode) {
      const codeConflict = await prisma.user.findUnique({
        where: { userCode: validatedData.userCode },
      })
      if (codeConflict && codeConflict.id !== params.id) {
        return NextResponse.json(
          { error: 'User code already exists for another user' },
          { status: 400 }
        )
      }
    }

    // Prepare update data - only include fields that should be updated
    const updateData: any = {
      name: validatedData.name,
      mobileNo: validatedData.mobileNo,
      address: validatedData.address || null,
      email: validatedData.email || null,
    }

    // Only update userCode if provided and different
    if (validatedData.userCode && validatedData.userCode !== existingUser.userCode) {
      updateData.userCode = validatedData.userCode
    }

    // Only update userType if provided
    if (validatedData.userType) {
      updateData.userType = validatedData.userType
    }

    // Only update status if provided
    if (validatedData.status) {
      updateData.status = validatedData.status
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ user })
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
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('mobileNo')) {
        return NextResponse.json(
          { error: 'Mobile number already exists' },
          { status: 400 }
        )
      }
      if (error.meta?.target?.includes('userCode')) {
        return NextResponse.json(
          { error: 'User code already exists' },
          { status: 400 }
        )
      }
    }
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

