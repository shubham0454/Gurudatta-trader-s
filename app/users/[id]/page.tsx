'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { apiRequest } from '@/lib/api'
import { showToast } from '@/components/Toast'

interface User {
  id: string
  name: string
  mobileNo: string
  address: string | null
  email: string | null
  bills: Array<{
    id: string
    billNumber: string
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    status: string
    createdAt: string
    items: Array<{
      feed: {
        name: string
        weight: number
      }
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
  }>
  transactions: Array<{
    id: string
    amount: number
    type: string
    description: string | null
    createdAt: string
  }>
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchUser()
  }, [params.id, router])

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/users/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBill || !paymentAmount) return

    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          billId: selectedBill,
          amount: parseFloat(paymentAmount),
          description: paymentDescription,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setPaymentModalOpen(false)
        setSelectedBill(null)
        setPaymentAmount('')
        setPaymentDescription('')
        fetchUser()
        showToast('Payment recorded successfully!', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to process payment', 'error')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showToast('An error occurred', 'error')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-slate-300">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">User not found</div>
        </div>
      </Layout>
    )
  }

  const totalPending = user.bills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
  const totalPaid = user.bills.reduce((sum, bill) => sum + bill.paidAmount, 0)

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-slate-400">{user.mobileNo}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-3 sm:px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 text-sm sm:text-base"
          >
            ← Back
          </button>
        </div>

        {/* User Info */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Name</p>
              <p className="text-white font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Mobile Number</p>
              <p className="text-white font-medium">{user.mobileNo}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Address</p>
              <p className="text-white font-medium">{user.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-white font-medium">{user.email || '-'}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Total Bills</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{user.bills.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Total Paid</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">₹{totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Total Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-400">₹{totalPending.toFixed(2)}</p>
          </div>
        </div>

        {/* Bills */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-700">
            <h2 className="text-base sm:text-lg font-semibold text-white">Bills</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Bill Number</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden sm:table-cell">Date</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Total</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden lg:table-cell">Paid</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Pending</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Status</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {user.bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-750">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm font-medium text-white">{bill.billNumber}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300 hidden sm:table-cell">
                      {new Date(bill.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white">₹{bill.totalAmount.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-green-400 hidden lg:table-cell">₹{bill.paidAmount.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-amber-400">₹{bill.pendingAmount.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bill.status === 'paid'
                            ? 'bg-green-900/50 text-green-300'
                            : bill.status === 'partial'
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-sm">
                      {bill.pendingAmount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill.id)
                            setPaymentAmount(bill.pendingAmount.toString())
                            setPaymentModalOpen(true)
                          }}
                          className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-700">
            <h2 className="text-base sm:text-lg font-semibold text-white">Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Date</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Type</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Description</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {user.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-750">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white capitalize">{transaction.type}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-400">{transaction.description || '-'}</td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-right font-medium text-green-400">
                      ₹{transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedBill(null)
            setPaymentAmount('')
            setPaymentDescription('')
          }}
          title="Make Payment"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false)
                  setSelectedBill(null)
                  setPaymentAmount('')
                  setPaymentDescription('')
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Process Payment
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

