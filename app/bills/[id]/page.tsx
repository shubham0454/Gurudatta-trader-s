'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { apiRequest } from '@/lib/api'
import { showToast } from '@/components/Toast'

interface Bill {
  id: string
  billNumber: string
  user: {
    id: string
    name: string
    mobileNo: string
    address: string | null
  }
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
  transactions: Array<{
    id: string
    amount: number
    description: string | null
    createdAt: string
  }>
}

export default function BillDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchBill()
    
    // Change document title for printing
    const originalTitle = document.title
    document.title = "Gurudatta trader's"
    
    return () => {
      document.title = originalTitle
    }
  }, [params.id, router])

  const fetchBill = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/bills/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setBill(data.bill)
    } catch (error) {
      console.error('Error fetching bill:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!paymentAmount) return

    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          billId: bill?.id,
          amount: parseFloat(paymentAmount),
          description: paymentDescription,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setPaymentModalOpen(false)
        setPaymentAmount('')
        setPaymentDescription('')
        fetchBill()
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

  const handlePrint = () => {
    // Change document title for print header
    const originalTitle = document.title
    document.title = "Gurudatta trader's"
    
    // Wait a moment for title to update, then print
    setTimeout(() => {
      window.print()
      // Restore original title after print dialog closes
      setTimeout(() => {
        document.title = originalTitle
      }, 100)
    }, 100)
  }

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Helper function to add text
      const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: string; align?: string; color?: number[] }) => {
        doc.setFontSize(options?.fontSize || 10)
        doc.setFont(undefined, options?.fontStyle || 'normal')
        if (options?.color) {
          doc.setTextColor(options.color[0], options.color[1], options.color[2])
        } else {
          doc.setTextColor(0, 0, 0)
        }
        doc.text(text, x, y, { align: options?.align || 'left' })
      }

      // Helper function to add line
      const addLine = (x1: number, y1: number, x2: number, y2: number, color: number[] = [0, 0, 0]) => {
        doc.setDrawColor(color[0], color[1], color[2])
        doc.line(x1, y1, x2, y2)
      }

      // Header Section - Simple black and white
      doc.setFillColor(255, 255, 255) // White background
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setDrawColor(0, 0, 0) // Black border
      doc.setLineWidth(1)
      doc.line(0, 35, pageWidth, 35)
      doc.setLineWidth(0.2) // Reset
      
      addText("Gurudatta trader's", pageWidth / 2, 20, { fontSize: 20, fontStyle: 'bold', align: 'center', color: [0, 0, 0] })
      addText("Bill Invoice", pageWidth / 2, 30, { fontSize: 12, align: 'center', color: [0, 0, 0] })
      
      yPos = 45

      // Bill Number and Date Section
      addText(`Bill Number: ${bill.billNumber}`, margin, yPos, { fontSize: 12, fontStyle: 'bold' })
      yPos += 7
      addText(`Date: ${new Date(bill.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPos, { fontSize: 10 })
      yPos += 10

      // Customer Information Box - Simple white with black border
      doc.setFillColor(255, 255, 255) // White background
      doc.rect(margin, yPos, pageWidth - margin * 2, 35, 'F')
      doc.setDrawColor(0, 0, 0) // Black border
      doc.setLineWidth(0.5)
      doc.rect(margin, yPos, pageWidth - margin * 2, 35, 'S')
      doc.setLineWidth(0.2) // Reset
      
      addText("Customer Information", margin + 3, yPos + 7, { fontSize: 11, fontStyle: 'bold' })
      yPos += 10
      addText(`Name: ${bill.user.name}`, margin + 3, yPos, { fontSize: 10 })
      yPos += 6
      addText(`Mobile: ${bill.user.mobileNo}`, margin + 3, yPos, { fontSize: 10 })
      yPos += 6
      if (bill.user.address) {
        const addressLines = doc.splitTextToSize(`Address: ${bill.user.address}`, pageWidth - margin * 2 - 6)
        doc.text(addressLines, margin + 3, yPos)
        yPos += addressLines.length * 5
      }
      yPos += 10

      // Items Table Header
      addText("Items", margin, yPos, { fontSize: 11, fontStyle: 'bold' })
      yPos += 7

      // Table Header Background - Simple black
      doc.setFillColor(0, 0, 0) // Black background
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      
      // Table Headers
      addText("Feed Name", margin + 2, yPos + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] })
      addText("Weight", margin + 60, yPos + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] })
      addText("Qty", margin + 85, yPos + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] })
      addText("Unit Price", margin + 105, yPos + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] })
      addText("Total", pageWidth - margin - 2, yPos + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255], align: 'right' })
      
      yPos += 8
      addLine(margin, yPos, pageWidth - margin, yPos, [0, 0, 0])

      // Table Rows
      bill.items.forEach((item, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }

        // Alternate row colors - Simple light gray
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245) // Very light gray
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        }

        addText(item.feed.name, margin + 2, yPos + 5.5, { fontSize: 9 })
        addText(`${item.feed.weight} kg`, margin + 60, yPos + 5.5, { fontSize: 9 })
        addText(item.quantity.toFixed(0), margin + 85, yPos + 5.5, { fontSize: 9 })
        addText(`₹${item.unitPrice.toFixed(2)}`, margin + 105, yPos + 5.5, { fontSize: 9 })
        addText(`₹${item.totalPrice.toFixed(2)}`, pageWidth - margin - 2, yPos + 5.5, { fontSize: 9, align: 'right' })
        
        yPos += 8
        addLine(margin, yPos, pageWidth - margin, yPos, [200, 200, 200])
      })

      yPos += 10

      // Summary Section
      const summaryX = pageWidth - margin - 80
      const summaryWidth = 80
      const summaryBoxHeight = 40 // Increased height to fit all content

      // Summary Box - Simple white background with border
      doc.setFillColor(255, 255, 255) // White
      doc.rect(summaryX, yPos, summaryWidth, summaryBoxHeight, 'F')
      doc.setDrawColor(0, 0, 0) // Black border
      doc.setLineWidth(0.5)
      doc.rect(summaryX, yPos, summaryWidth, summaryBoxHeight, 'S')
      doc.setLineWidth(0.2) // Reset

      addText("Summary", summaryX + 3, yPos + 7, { fontSize: 11, fontStyle: 'bold' })
      yPos += 10

      doc.setTextColor(0, 0, 0) // Black
      addText("Total Amount:", summaryX + 3, yPos, { fontSize: 10 })
      addText(`₹${bill.totalAmount.toFixed(2)}`, summaryX + summaryWidth - 3, yPos, { fontSize: 10, align: 'right', fontStyle: 'bold' })
      yPos += 7

      addText("Paid Amount:", summaryX + 3, yPos, { fontSize: 10 })
      addText(`₹${bill.paidAmount.toFixed(2)}`, summaryX + summaryWidth - 3, yPos, { fontSize: 10, align: 'right', fontStyle: 'bold' })
      yPos += 7

      addText("Pending Amount:", summaryX + 3, yPos, { fontSize: 10 })
      addText(`₹${bill.pendingAmount.toFixed(2)}`, summaryX + summaryWidth - 3, yPos, { fontSize: 10, align: 'right', fontStyle: 'bold' })
      yPos += 7

      // Status Badge - Simple black border
      doc.setDrawColor(0, 0, 0)
      doc.setFillColor(240, 240, 240) // Light gray
      doc.roundedRect(summaryX + 3, yPos, 30, 6, 2, 2, 'F')
      doc.setDrawColor(0, 0, 0)
      doc.roundedRect(summaryX + 3, yPos, 30, 6, 2, 2, 'S')
      doc.setTextColor(0, 0, 0) // Black text
      addText(bill.status.toUpperCase(), summaryX + 18, yPos + 4.5, { fontSize: 8, fontStyle: 'bold', align: 'center' })

      // Footer
      yPos = pageHeight - 15
      doc.setTextColor(150, 150, 150)
      addText("Thank you for your business!", pageWidth / 2, yPos, { fontSize: 9, align: 'center' })

      // Save PDF
      doc.save(`Bill-${bill.billNumber}-${Date.now()}.pdf`)
      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF', 'error')
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

  if (!bill) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">Bill not found</div>
        </div>
      </Layout>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide buttons and non-print elements */
          button,
          .no-print {
            display: none !important;
          }
          
          /* Hide payment history section */
          .payment-history {
            display: none !important;
          }
          
          /* Hide links */
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
          
          /* Hide Layout navigation and sidebar */
          nav,
          aside,
          header {
            display: none !important;
          }
          
          /* Page setup */
          @page {
            margin: 15mm !important;
            size: A4;
            /* Remove browser print headers and footers */
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          
          /* Hide browser print headers/footers */
          @page {
            @top-center { content: ""; }
            @bottom-center { content: ""; }
            @top-left { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-right { content: ""; }
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            background: white !important;
          }
          
          /* Print header styling */
          .print-header {
            display: block !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            padding-bottom: 15px !important;
            border-bottom: 3px solid #000 !important;
          }
          
          .print-header h1 {
            font-size: 28px !important;
            font-weight: bold !important;
            margin: 0 0 5px 0 !important;
            color: #000 !important;
            letter-spacing: 1px !important;
          }
          
          /* Main content container */
          .bg-slate-800 {
            background: white !important;
            border: 2px solid #000 !important;
            border-radius: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
          }
          
          /* Bill Information Section */
          h2 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin: 15px 0 10px 0 !important;
            color: #000 !important;
            border-bottom: 2px solid #333 !important;
            padding-bottom: 5px !important;
          }
          
          /* Text styling */
          p, span, div {
            color: #000 !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          
          .text-slate-400 {
            color: #555 !important;
            font-weight: 500 !important;
          }
          
          .font-medium {
            font-weight: 600 !important;
            color: #000 !important;
          }
          
          /* Table styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 15px 0 !important;
            font-size: 11px !important;
          }
          
          thead {
            background: #333 !important;
          }
          
          thead th {
            background: #333 !important;
            color: white !important;
            padding: 10px 8px !important;
            text-align: left !important;
            font-weight: bold !important;
            font-size: 11px !important;
            border: 1px solid #000 !important;
          }
          
          tbody td {
            padding: 8px !important;
            border: 1px solid #ddd !important;
            color: #000 !important;
            font-size: 11px !important;
          }
          
          tbody tr:nth-child(even) {
            background: #f9f9f9 !important;
          }
          
          tbody tr:hover {
            background: #f0f0f0 !important;
          }
          
          /* Summary section */
          .border-t {
            border-top: 2px solid #000 !important;
            padding-top: 15px !important;
            margin-top: 20px !important;
          }
          
          .print-summary {
            background: #f5f5f5 !important;
            padding: 15px !important;
            border: 1px solid #ddd !important;
            border-radius: 4px !important;
          }
          
          .print-summary-row {
            padding: 6px 0 !important;
            font-size: 12px !important;
          }
          
          /* Status badge */
          .px-2.py-1.rounded-full {
            border: 1px solid #000 !important;
            padding: 4px 10px !important;
            font-weight: bold !important;
            font-size: 10px !important;
          }
          
          /* Grid layout */
          .grid {
            display: grid !important;
            gap: 15px !important;
          }
          
          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: 1fr 1fr !important;
          }
          
          /* Spacing */
          .space-y-2 > * + * {
            margin-top: 8px !important;
          }
          
          .space-y-4 > * + * {
            margin-top: 12px !important;
          }
          
          .mb-4 {
            margin-bottom: 15px !important;
          }
          
          .mb-6 {
            margin-bottom: 20px !important;
          }
          
          /* Remove shadows */
          .shadow-lg {
            box-shadow: none !important;
          }
          
          /* Ensure proper page breaks */
          .print-bill,
          table,
          .border-t {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Footer message */
          .print-footer {
            display: block !important;
            margin-top: 30px !important;
            padding-top: 15px !important;
            border-top: 1px solid #ddd !important;
            text-align: center !important;
            font-style: italic !important;
            color: #666 !important;
            font-size: 10px !important;
          }
        }
      `}} />
      <Layout>
        {/* Print-only header */}
        <div className="print-header" style={{ display: 'none' }}>
          <h1>Gurudatta trader&apos;s</h1>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>Bill Invoice</p>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Bill: {bill.billNumber}</h1>
              <p className="text-slate-400">
                {bill.user.name} ({bill.user.mobileNo})
              </p>
            </div>
          <div className="flex flex-wrap gap-2 no-print">
            {bill.pendingAmount > 0 && (
              <button
                onClick={() => {
                  setPaymentAmount(bill.pendingAmount.toString())
                  setPaymentModalOpen(true)
                }}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              >
                Make Payment
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 text-sm sm:text-base"
            >
              🖨️ Print
            </button>
            {/* <button
              onClick={handleDownloadPDF}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base"
            >
              📄 Download PDF
            </button> */}
            <button
              onClick={() => router.back()}
              className="px-3 sm:px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 text-sm sm:text-base"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Bill Information</h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-slate-400">Bill Number:</span>{' '}
                  <span className="font-medium text-white">{bill.billNumber}</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-400">Date:</span>{' '}
                  <span className="font-medium text-white">
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-400">Status:</span>{' '}
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
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Customer Information</h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-slate-400">Name:</span>{' '}
                  <span className="font-medium text-white">{bill.user.name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-400">Mobile:</span>{' '}
                  <span className="font-medium text-white">{bill.user.mobileNo}</span>
                </p>
                {bill.user.address && (
                  <p className="text-sm">
                    <span className="text-slate-400">Address:</span>{' '}
                    <span className="font-medium text-white">{bill.user.address}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-slate-200">Feed</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-slate-200">Weight</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-slate-200">Quantity</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-slate-200">Unit Price</th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm font-medium text-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {bill.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-750">
                      <td className="px-2 sm:px-4 py-2 text-sm text-white">{item.feed.name}</td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-slate-300">{item.feed.weight} kg</td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-slate-300">{item.quantity.toFixed(0)}</td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-slate-300">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-right font-medium text-white">
                        ₹{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-slate-700 pt-4 print-summary">
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-2 print-summary-content">
                <div className="flex justify-between text-sm print-summary-row">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-medium text-white">₹{bill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm print-summary-row">
                  <span className="text-slate-400">Paid Amount:</span>
                  <span className="font-medium text-green-400">₹{bill.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm print-summary-row">
                  <span className="text-slate-400">Pending Amount:</span>
                  <span className="font-medium text-amber-400">₹{bill.pendingAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Print Footer */}
          <div className="print-footer" style={{ display: 'none' }}>
            <p>Thank you for your business!</p>
          </div>
        </div>

        {/* Transactions */}
        {bill.transactions.length > 0 && (
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden payment-history">
            <div className="p-4 sm:p-6 border-b border-slate-700">
              <h2 className="text-base sm:text-lg font-semibold text-white">Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Date</th>
                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Description</th>
                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {bill.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-750">
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-400">
                        {transaction.description || '-'}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-right font-medium text-green-400">
                        ₹{transaction.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Modal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
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
                max={bill.pendingAmount}
              />
              <p className="mt-1 text-xs text-slate-400">
                Pending: ₹{bill.pendingAmount.toFixed(2)}
              </p>
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
    </>
  )
}

