import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { jsPDF } from 'jspdf'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'monthly'
    const userId = searchParams.get('userId')

    const now = new Date()
    let startDate: Date
    let endDate = new Date()

    if (type === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0))
    } else if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1) // Year start
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (userId) {
      where.userId = userId
    }

    // Fetch ALL bills without any limit
    const bills = await prisma.bill.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNo: true,
            address: true,
            email: true,
            userType: true,
            status: true,
          },
        },
        items: {
          include: {
            feed: {
              select: {
                id: true,
                name: true,
                weight: true,
                brand: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Helper function to safely format text
    const safeText = (text: any): string => {
      if (!text) return ''
      let result = String(text).trim()
      result = result.replace(/\0/g, '')
      return result
    }

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return parseFloat(amount.toFixed(2)).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    }

    // Calculate Summary Statistics
    const totalSales = bills.reduce((sum, bill) => sum + bill.totalAmount, 0)
    const totalPaid = bills.reduce((sum, bill) => sum + bill.paidAmount, 0)
    const totalPending = bills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
    const paidBills = bills.filter(b => b.status === 'paid').length
    const partialBills = bills.filter(b => b.status === 'partial').length
    const pendingBills = bills.filter(b => b.status === 'pending').length

    const reportTypeText = type === 'today' ? 'Today' : type === 'monthly' ? 'This Month' : 'This Year'
    const dateRange = `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`

    // Create PDF document
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const fontSize = options.fontSize || 10
      const maxWidth = options.maxWidth || pageWidth - margin * 2
      doc.setFontSize(fontSize)
      if (options.bold) {
        doc.setFont(undefined, 'bold')
      } else {
        doc.setFont(undefined, 'normal')
      }
      if (options.color) {
        if (typeof options.color === 'string') {
          // Convert hex to RGB
          const hex = options.color.replace('#', '')
          const r = parseInt(hex.substring(0, 2), 16)
          const g = parseInt(hex.substring(2, 4), 16)
          const b = parseInt(hex.substring(4, 6), 16)
          doc.setTextColor(r, g, b)
        } else if (Array.isArray(options.color)) {
          doc.setTextColor(options.color[0], options.color[1], options.color[2])
        }
      }
      const lines = doc.splitTextToSize(safeText(text), maxWidth)
      const align = options.align || 'left'
      if (align === 'center') {
        doc.text(lines, x, y, { align: 'center' })
      } else {
        doc.text(lines, x, y)
      }
      return lines.length * fontSize * 0.4
    }

    // Helper function to add colored box
    const addColoredBox = (text: string, x: number, y: number, width: number, height: number, bgColor: number[], textColor: number[] = [0, 0, 0], fontSize: number = 10) => {
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(x, y - height, width, height, 'F')
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      addText(text, x + 2, y - height / 2 + fontSize / 3, { fontSize, bold: true })
      doc.setTextColor(0, 0, 0)
    }

    // Header with colors
      doc.setFillColor(30, 64, 175) // Blue
      doc.rect(0, 0, pageWidth, 25, 'F')
      doc.setTextColor(255, 255, 255)
      addText("Gurudatta trader's", pageWidth / 2, 12, { fontSize: 20, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      
      doc.setFillColor(59, 130, 246) // Lighter blue
      doc.rect(0, 25, pageWidth, 15, 'F')
      addText('Sales Report', pageWidth / 2, 33, { fontSize: 16, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      
      doc.setTextColor(0, 0, 0)
    yPos = 50

    // Report Info Box
    doc.setFillColor(30, 64, 175) // Blue header
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    addText(`Report Type: ${reportTypeText}`, margin + 4, yPos + 5, { fontSize: 10, bold: true })
    yPos += 10

    if (userId && bills[0]?.user) {
      doc.setFillColor(243, 244, 246) // Light gray
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(0, 0, 0)
      addText(`Customer: ${safeText(bills[0].user.name)} (${bills[0].user.mobileNo})`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 10
    }

    doc.setFillColor(255, 255, 255)
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(0, 0, 0)
    addText(`Period: ${dateRange}`, margin + 4, yPos + 5, { fontSize: 10 })
    yPos += 10

    doc.setFillColor(243, 244, 246) // Light gray
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    addText(`Total Bills: ${bills.length}`, margin + 4, yPos + 5, { fontSize: 10 })
    yPos += 15

    // Summary Boxes with colors
    const boxWidth = (pageWidth - margin * 3) / 2
    const boxHeight = 20

    // Total Sales - Green
    doc.setFillColor(16, 185, 129) // Green
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
      doc.setTextColor(255, 255, 255)
    addText('Total Sales', margin + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(209, 250, 229) // Light green
    doc.rect(margin, yPos + 8, boxWidth, 12, 'F')
      doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalSales)}`, margin + 4, yPos + 16, { fontSize: 14, bold: true })

    // Total Paid - Blue
    doc.setFillColor(59, 130, 246) // Blue
    doc.rect(margin * 2 + boxWidth, yPos, boxWidth, boxHeight, 'F')
      doc.setTextColor(255, 255, 255)
    addText('Total Paid', margin * 2 + boxWidth + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(219, 234, 254) // Light blue
    doc.rect(margin * 2 + boxWidth, yPos + 8, boxWidth, 12, 'F')
      doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalPaid)}`, margin * 2 + boxWidth + 4, yPos + 16, { fontSize: 14, bold: true })
    yPos += 25

    // Total Pending - Red
    doc.setFillColor(239, 68, 68) // Red
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
      doc.setTextColor(255, 255, 255)
    addText('Total Pending', margin + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(254, 226, 226) // Light red
    doc.rect(margin, yPos + 8, boxWidth, 12, 'F')
      doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalPending)}`, margin + 4, yPos + 16, { fontSize: 14, bold: true })

    // Payment Status - Purple
    doc.setFillColor(139, 92, 246) // Purple
    doc.rect(margin * 2 + boxWidth, yPos, boxWidth, boxHeight, 'F')
      doc.setTextColor(255, 255, 255)
    addText('Payment Status', margin * 2 + boxWidth + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(243, 232, 255) // Light purple
    doc.rect(margin * 2 + boxWidth, yPos + 8, boxWidth, 12, 'F')
      doc.setTextColor(0, 0, 0)
    addText(`Paid: ${paidBills}`, margin * 2 + boxWidth + 4, yPos + 12, { fontSize: 9 })
    addText(`Partial: ${partialBills}`, margin * 2 + boxWidth + 4, yPos + 16, { fontSize: 9 })
    addText(`Pending: ${pendingBills}`, margin * 2 + boxWidth + 4, yPos + 20, { fontSize: 9 })
    yPos += 30

      // Bills Overview Table Header
      doc.setFillColor(99, 102, 241) // Indigo
      doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Bills Overview', pageWidth / 2, yPos + 6, { fontSize: 14, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      yPos += 15

      // Table Headers
      doc.setFillColor(30, 64, 175) // Blue
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
    const colWidths = [40, (pageWidth - margin * 2 - 40) / 3, (pageWidth - margin * 2 - 40) / 3, (pageWidth - margin * 2 - 40) / 3]
    let xPos = margin + 2
    addText('Bill #', xPos, yPos + 5, { fontSize: 10, bold: true })
    xPos += colWidths[0]
    addText('Customer', xPos, yPos + 5, { fontSize: 10, bold: true })
    xPos += colWidths[1]
    addText('Date', xPos, yPos + 5, { fontSize: 10, bold: true })
    xPos += colWidths[2]
    addText('Amount', xPos, yPos + 5, { fontSize: 10, bold: true })
    yPos += 10

    // Table Rows (limit to 15 for overview)
    bills.slice(0, 15).forEach((bill, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        yPos = margin
      }
        const bgColor = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        doc.setTextColor(0, 0, 0)
        xPos = margin + 2
        addText(bill.billNumber, xPos, yPos + 5, { fontSize: 9 })
        xPos += colWidths[0]
        addText(safeText(bill.user.name) || '[No Name]', xPos, yPos + 5, { fontSize: 9 })
        xPos += colWidths[1]
        addText(new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), xPos, yPos + 5, { fontSize: 9 })
        xPos += colWidths[2]
        doc.setTextColor(5, 150, 105) // Green for amount
        addText(`Rs. ${formatCurrency(bill.totalAmount)}`, xPos, yPos + 5, { fontSize: 9, bold: true })
        doc.setTextColor(0, 0, 0)
      yPos += 8
    })

      if (bills.length > 15) {
        yPos += 5
        doc.setTextColor(102, 102, 102) // Gray
        addText(`... and ${bills.length - 15} more bills (see detailed pages)`, margin, yPos, { fontSize: 9 })
        doc.setTextColor(0, 0, 0)
        yPos += 10
      }

    // Individual Bill Details
    bills.forEach((bill, billIndex) => {
      if (billIndex > 0 || yPos > pageHeight - 50) {
        doc.addPage()
        yPos = margin
      }

      // Bill Header with colors
      doc.setFillColor(30, 64, 175) // Blue
      doc.rect(0, 0, pageWidth, 25, 'F')
      doc.setTextColor(255, 255, 255)
      addText("Gurudatta trader's", pageWidth / 2, 12, { fontSize: 22, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      
      doc.setFillColor(59, 130, 246) // Lighter blue
      doc.rect(0, 25, pageWidth, 15, 'F')
      addText('Bill Invoice', pageWidth / 2, 33, { fontSize: 14, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 50

      // Bill Info
      doc.setFillColor(99, 102, 241) // Indigo
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText(`Bill Number: ${bill.billNumber}`, margin + 4, yPos + 5, { fontSize: 11, bold: true })
      yPos += 10

      doc.setFillColor(243, 244, 246) // Light gray
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(0, 0, 0)
      const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      addText(`Date: ${billDate}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 15

      // Customer Information
      doc.setFillColor(16, 185, 129) // Green
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Customer Information', margin + 4, yPos + 5, { fontSize: 12, bold: true })
      yPos += 10

      doc.setFillColor(255, 255, 255)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(0, 0, 0)
      addText(`Name: ${safeText(bill.user.name) || '[No Name]'}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 10

      doc.setFillColor(243, 244, 246) // Light gray
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      addText(`Mobile: ${bill.user.mobileNo}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 10

      if (bill.user.address) {
        doc.setFillColor(255, 255, 255)
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        addText(`Address: ${safeText(bill.user.address)}`, margin + 4, yPos + 5, { fontSize: 10 })
        yPos += 10
      }
      yPos += 5

      // Items Table Header
      doc.setFillColor(139, 92, 246) // Purple
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Items', pageWidth / 2, yPos + 5, { fontSize: 12, bold: true, maxWidth: pageWidth - margin * 2, align: 'center' })
      yPos += 10

      // Items Table Headers
      doc.setFillColor(30, 64, 175) // Blue
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      const itemColWidths = [
        (pageWidth - margin * 2) * 0.4,
        (pageWidth - margin * 2) * 0.15,
        (pageWidth - margin * 2) * 0.15,
        (pageWidth - margin * 2) * 0.15,
        (pageWidth - margin * 2) * 0.15
      ]
      xPos = margin + 2
      addText('Feed Name', xPos, yPos + 5, { fontSize: 10, bold: true })
      xPos += itemColWidths[0]
      addText('Weight', xPos, yPos + 5, { fontSize: 10, bold: true })
      xPos += itemColWidths[1]
      addText('Qty', xPos, yPos + 5, { fontSize: 10, bold: true })
      xPos += itemColWidths[2]
      addText('Unit Price', xPos, yPos + 5, { fontSize: 10, bold: true })
      xPos += itemColWidths[3]
      addText('Total', xPos, yPos + 5, { fontSize: 10, bold: true })
      yPos += 10

      // Items Rows
      bill.items.forEach((item, itemIndex) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin
        }
        const bgColor = itemIndex % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        doc.setTextColor(0, 0, 0)
        xPos = margin + 2
        addText(safeText(item.feed.name), xPos, yPos + 5, { fontSize: 9 })
        xPos += itemColWidths[0]
        addText(`${item.feed.weight} kg`, xPos, yPos + 5, { fontSize: 9 })
        xPos += itemColWidths[1]
        addText(item.quantity.toFixed(0), xPos, yPos + 5, { fontSize: 9 })
        xPos += itemColWidths[2]
        addText(`Rs. ${parseFloat(item.unitPrice.toString()).toFixed(2)}`, xPos, yPos + 5, { fontSize: 9 })
        xPos += itemColWidths[3]
        doc.setTextColor(5, 150, 105) // Green for total
        addText(`Rs. ${parseFloat(item.totalPrice.toString()).toFixed(2)}`, xPos, yPos + 5, { fontSize: 9, bold: true })
        doc.setTextColor(0, 0, 0)
        yPos += 8
      })
      yPos += 5

      // Summary - Right aligned
      const summaryWidth = 85
      const summaryX = pageWidth - margin - summaryWidth
      
      doc.setFillColor(99, 102, 241) // Indigo
      doc.rect(summaryX, yPos, summaryWidth, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Summary', summaryX + summaryWidth / 2, yPos + 5, { fontSize: 12, bold: true, maxWidth: summaryWidth, align: 'center' })
      yPos += 10

      doc.setFillColor(255, 255, 255)
      doc.rect(summaryX, yPos, summaryWidth, 8, 'F')
      doc.setTextColor(0, 0, 0)
      addText(`Total Amount: Rs. ${parseFloat(bill.totalAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 5, { fontSize: 10 })
      doc.setTextColor(5, 150, 105) // Green
      addText(`Rs. ${parseFloat(bill.totalAmount.toString()).toFixed(2)}`, summaryX + summaryWidth - 2, yPos + 5, { fontSize: 10, bold: true })
      doc.setTextColor(0, 0, 0)
      yPos += 10

      // Only show Paid Amount if > 0
      if (parseFloat(bill.paidAmount.toString()) > 0) {
        doc.setFillColor(243, 244, 246) // Light gray
        doc.rect(summaryX, yPos, summaryWidth, 8, 'F')
        addText(`Paid Amount: Rs. ${parseFloat(bill.paidAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 5, { fontSize: 10 })
        doc.setTextColor(59, 130, 246) // Blue
        addText(`Rs. ${parseFloat(bill.paidAmount.toString()).toFixed(2)}`, summaryX + summaryWidth - 2, yPos + 5, { fontSize: 10, bold: true })
        doc.setTextColor(0, 0, 0)
        yPos += 10
      }

      // Only show Pending Amount if > 0
      if (parseFloat(bill.pendingAmount.toString()) > 0) {
        doc.setFillColor(255, 255, 255)
        doc.rect(summaryX, yPos, summaryWidth, 8, 'F')
        addText(`Pending: Rs. ${parseFloat(bill.pendingAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 5, { fontSize: 10 })
        doc.setTextColor(239, 68, 68) // Red
        addText(`Rs. ${parseFloat(bill.pendingAmount.toString()).toFixed(2)}`, summaryX + summaryWidth - 2, yPos + 5, { fontSize: 10, bold: true })
        doc.setTextColor(0, 0, 0)
        yPos += 10
      }
    })

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-report-${type}-${Date.now()}.pdf"`,
      },
    })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
