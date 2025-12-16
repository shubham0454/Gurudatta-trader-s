import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { paymentSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    authMiddleware(request)

    const body = await request.json()
    const validatedData = paymentSchema.parse(body)

    // Get bill
    const bill = await prisma.bill.findUnique({
      where: { id: validatedData.billId },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    if (validatedData.amount > bill.pendingAmount) {
      return NextResponse.json(
        { error: 'Payment amount exceeds pending amount' },
        { status: 400 }
      )
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: bill.userId,
        billId: bill.id,
        amount: validatedData.amount,
        type: 'payment',
        description: validatedData.description || `Payment for ${bill.billNumber}`,
      },
    })

    // Update bill
    const newPaidAmount = bill.paidAmount + validatedData.amount
    const newPendingAmount = bill.pendingAmount - validatedData.amount
    const newStatus = newPendingAmount === 0 ? 'paid' : newPendingAmount < bill.totalAmount ? 'partial' : 'pending'

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

