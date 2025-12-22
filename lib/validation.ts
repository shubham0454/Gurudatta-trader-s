import { z } from 'zod'

export const loginSchema = z.object({
  mobileNo: z.string().min(10, 'Mobile number must be at least 10 digits').max(15),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobileNo: z.string().min(10, 'Mobile number must be at least 10 digits').max(15),
  address: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  userCode: z.string().optional(), // Auto-generated if not provided
  userType: z.enum(['BMC', 'Dabhadi', 'Customer']).default('BMC'),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const feedSchema = z.object({
  name: z.string().min(1, 'Feed name is required'),
  brand: z.string().optional(),
  weight: z.number().positive('Weight must be positive'),
  defaultPrice: z.number().nonnegative('Price must be non-negative'),
  stock: z.number().nonnegative('Stock must be non-negative').default(0),
})

export const billItemSchema = z.object({
  feedId: z.string().min(1, 'Feed is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
})

export const billSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  status: z.enum(['pending', 'partial', 'paid']).optional(),
  paidAmount: z.number().nonnegative('Paid amount must be non-negative').optional(),
})

export const paymentSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type UserInput = z.infer<typeof userSchema>
export type FeedInput = z.infer<typeof feedSchema>
export type BillInput = z.infer<typeof billSchema>
export type PaymentInput = z.infer<typeof paymentSchema>

