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
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      startDate = today
      endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
    } else if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1) // Year start
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) // Year end
    }

    // Fetch all bills in date range first (without billStatus filter)
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
    let bills = await prisma.bill.findMany({
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

    // Filter active bills in memory (MongoDB query for billStatus might not work correctly)
    bills = bills.filter((bill: any) => {
      // Include bills with billStatus='active' or bills without billStatus (null/undefined)
      return bill.billStatus === 'active' || bill.billStatus === null || bill.billStatus === undefined
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

    // Calculate Feed-wise Sales Statistics
    interface FeedSales {
      feedId: string
      feedName: string
      feedWeight: number
      totalQuantity: number
      totalAmount: number
      averagePrice: number
      billCount: number
    }

    const feedSalesMap = new Map<string, FeedSales>()

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const feedKey = `${item.feed.id}_${item.feed.weight}`
        const existing = feedSalesMap.get(feedKey)
        
        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalAmount += item.totalPrice
          existing.billCount += 1
          existing.averagePrice = existing.totalAmount / existing.totalQuantity
        } else {
          feedSalesMap.set(feedKey, {
            feedId: item.feed.id,
            feedName: item.feed.name,
            feedWeight: item.feed.weight,
            totalQuantity: item.quantity,
            totalAmount: item.totalPrice,
            averagePrice: item.unitPrice,
            billCount: 1,
          })
        }
      })
    })

    const feedSales = Array.from(feedSalesMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount) // Sort by total amount descending

    // Check if no bills found
    if (bills.length === 0) {
      // Return a PDF with "No data" message
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.setFontSize(20)
      doc.text('No Data Available', pageWidth / 2, 50, { align: 'center' })
      doc.setFontSize(12)
      const reportTypeText = type === 'today' ? 'Today' : type === 'monthly' ? 'This Month' : 'This Year'
      doc.text(`No bills found for ${reportTypeText}`, pageWidth / 2, 70, { align: 'center' })
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="sales-report-${type}-${Date.now()}.pdf"`,
        },
      })
    }

    const reportTypeText = type === 'today' ? 'Today' : type === 'monthly' ? 'This Month' : 'This Year'
    const dateRange = `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`

    // Create PDF document
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const fontSize = options.fontSize || 10
      const maxWidth = options.maxWidth || pageWidth - margin * 2
      doc.setFontSize(fontSize)
      if (options.bold) {
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setFont('helvetica', 'normal')
      }
      if (options.color) {
        if (Array.isArray(options.color)) {
          doc.setTextColor(options.color[0], options.color[1], options.color[2])
        }
      } else {
        doc.setTextColor(0, 0, 0)
      }
      const lines = doc.splitTextToSize(safeText(text), maxWidth)
      const align = options.align || 'left'
      doc.text(lines, x, y, { align })
      return lines.length * fontSize * 0.4
    }

    // ============================================
    // PAGE 1: SUMMARY PAGE WITH ALL INFORMATION
    // ============================================
    
    // Header
    doc.setFillColor(30, 64, 175) // Blue
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor(255, 255, 255)
    addText("Gurudatta trader's", pageWidth / 2, 15, { fontSize: 22, bold: true, align: 'center' })
    addText('Monthly Sales Report', pageWidth / 2, 25, { fontSize: 16, bold: true, align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    yPos = 40

    // Report Period
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    addText(`Period: ${dateRange}`, margin + 4, yPos + 5, { fontSize: 10 })
    addText(`Total Bills: ${bills.length}`, pageWidth - margin - 4, yPos + 5, { fontSize: 10, align: 'right' })
    yPos += 12

    // Summary Statistics Boxes
    const boxWidth = (pageWidth - margin * 3) / 2
    const boxHeight = 18

    // Total Sales
    doc.setFillColor(16, 185, 129) // Green
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
    doc.setTextColor(255, 255, 255)
    addText('Total Sales', margin + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(209, 250, 229)
    doc.rect(margin, yPos + 8, boxWidth, 10, 'F')
    doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalSales)}`, margin + 4, yPos + 15, { fontSize: 13, bold: true })

    // Total Paid
    doc.setFillColor(59, 130, 246) // Blue
    doc.rect(margin * 2 + boxWidth, yPos, boxWidth, boxHeight, 'F')
    doc.setTextColor(255, 255, 255)
    addText('Total Paid', margin * 2 + boxWidth + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(219, 234, 254)
    doc.rect(margin * 2 + boxWidth, yPos + 8, boxWidth, 10, 'F')
    doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalPaid)}`, margin * 2 + boxWidth + 4, yPos + 15, { fontSize: 13, bold: true })
    yPos += 22

    // Total Pending
    doc.setFillColor(239, 68, 68) // Red
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
    doc.setTextColor(255, 255, 255)
    addText('Total Pending', margin + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(254, 226, 226)
    doc.rect(margin, yPos + 8, boxWidth, 10, 'F')
    doc.setTextColor(0, 0, 0)
    addText(`Rs. ${formatCurrency(totalPending)}`, margin + 4, yPos + 15, { fontSize: 13, bold: true })

    // Payment Status
    doc.setFillColor(139, 92, 246) // Purple
    doc.rect(margin * 2 + boxWidth, yPos, boxWidth, boxHeight, 'F')
    doc.setTextColor(255, 255, 255)
    addText('Payment Status', margin * 2 + boxWidth + 4, yPos + 6, { fontSize: 10, bold: true })
    doc.setFillColor(243, 232, 255)
    doc.rect(margin * 2 + boxWidth, yPos + 8, boxWidth, 10, 'F')
    doc.setTextColor(0, 0, 0)
    addText(`Paid: ${paidBills} | Partial: ${partialBills} | Pending: ${pendingBills}`, margin * 2 + boxWidth + 4, yPos + 15, { fontSize: 9 })
    yPos += 25

    // Feed-wise Sales Breakdown
    doc.setFillColor(99, 102, 241) // Indigo
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    addText('Feed-wise Sales Breakdown', pageWidth / 2, yPos + 5, { fontSize: 12, bold: true, align: 'center' })
    yPos += 12

    // Feed Sales Table Headers
    doc.setFillColor(30, 64, 175)
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    const feedColWidths = [
      (pageWidth - margin * 2) * 0.35, // Feed Name
      (pageWidth - margin * 2) * 0.15, // Weight
      (pageWidth - margin * 2) * 0.15, // Quantity
      (pageWidth - margin * 2) * 0.15, // Avg Price
      (pageWidth - margin * 2) * 0.20, // Total Amount
    ]
    let xPos = margin + 2
    addText('Feed Name', xPos, yPos + 5, { fontSize: 9, bold: true })
    xPos += feedColWidths[0]
    addText('Weight', xPos, yPos + 5, { fontSize: 9, bold: true })
    xPos += feedColWidths[1]
    addText('Qty Sold', xPos, yPos + 5, { fontSize: 9, bold: true })
    xPos += feedColWidths[2]
    addText('Avg Price', xPos, yPos + 5, { fontSize: 9, bold: true })
    xPos += feedColWidths[3]
    addText('Total Amount', xPos, yPos + 5, { fontSize: 9, bold: true })
    yPos += 10

    // Feed Sales Rows
    feedSales.forEach((feed, index) => {
      // Check if we need a new page before adding this row
      if (yPos + 7 > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        // Redraw headers on new page
        doc.setFillColor(30, 64, 175)
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        doc.setTextColor(255, 255, 255)
        xPos = margin + 2
        addText('Feed Name', xPos, yPos + 5, { fontSize: 9, bold: true })
        xPos += feedColWidths[0]
        addText('Weight', xPos, yPos + 5, { fontSize: 9, bold: true })
        xPos += feedColWidths[1]
        addText('Qty Sold', xPos, yPos + 5, { fontSize: 9, bold: true })
        xPos += feedColWidths[2]
        addText('Avg Price', xPos, yPos + 5, { fontSize: 9, bold: true })
        xPos += feedColWidths[3]
        addText('Total Amount', xPos, yPos + 5, { fontSize: 9, bold: true })
        yPos += 10
      }

      const bgColor = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F')
      doc.setTextColor(0, 0, 0)
      
      xPos = margin + 2
      addText(safeText(feed.feedName), xPos, yPos + 4.5, { fontSize: 9 })
      xPos += feedColWidths[0]
      addText(`${feed.feedWeight} kg`, xPos, yPos + 4.5, { fontSize: 9 })
      xPos += feedColWidths[1]
      addText(feed.totalQuantity.toFixed(0), xPos, yPos + 4.5, { fontSize: 9 })
      xPos += feedColWidths[2]
      addText(`Rs. ${feed.averagePrice.toFixed(2)}`, xPos, yPos + 4.5, { fontSize: 9 })
      xPos += feedColWidths[3]
      doc.setTextColor(5, 150, 105) // Green
      addText(`Rs. ${formatCurrency(feed.totalAmount)}`, xPos, yPos + 4.5, { fontSize: 9, bold: true })
      doc.setTextColor(0, 0, 0)
      yPos += 7
    })

    // ============================================
    // PAGE 2+: INDIVIDUAL BILLS (ONE BILL PER PAGE)
    // ============================================
    
    // Always start bills section on a new page
    // Check if current page has enough space, if not add new page
    if (yPos + 150 > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    } else {
      // Add new page to ensure bills start on separate page from summary
      doc.addPage()
      yPos = margin
    }
    
    bills.forEach((bill, billIndex) => {
      // Always start each bill on a new page (except first one which is already on new page)
      if (billIndex > 0) {
        doc.addPage()
        yPos = margin
      }

      // Bill Header
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setTextColor(255, 255, 255)
      addText("Gurudatta trader's", pageWidth / 2, 15, { fontSize: 20, bold: true, align: 'center' })
      addText('Bill Invoice', pageWidth / 2, 25, { fontSize: 14, bold: true, align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40

      // Bill Number and Date
      doc.setFillColor(99, 102, 241)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText(`Bill Number: ${bill.billNumber}`, margin + 4, yPos + 5, { fontSize: 11, bold: true })
      yPos += 10

      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(0, 0, 0)
      const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      addText(`Date: ${billDate}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 12

      // Customer Information
      doc.setFillColor(16, 185, 129)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Customer Information', margin + 4, yPos + 5, { fontSize: 11, bold: true })
      yPos += 10

      doc.setFillColor(255, 255, 255)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(0, 0, 0)
      addText(`Name: ${safeText(bill.user.name) || '[No Name]'}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 8

      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      addText(`Mobile: ${bill.user.mobileNo}`, margin + 4, yPos + 5, { fontSize: 10 })
      yPos += 8

      if (bill.user.address) {
        doc.setFillColor(255, 255, 255)
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        addText(`Address: ${safeText(bill.user.address)}`, margin + 4, yPos + 5, { fontSize: 10 })
        yPos += 8
      }
      yPos += 5

      // Items Table
      doc.setFillColor(139, 92, 246)
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      addText('Items', pageWidth / 2, yPos + 5, { fontSize: 11, bold: true, align: 'center' })
      yPos += 10

      // Items Table Headers
      doc.setFillColor(30, 64, 175)
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
        if (yPos > pageHeight - 50) {
          // Should not happen as each bill is on separate page, but just in case
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
        doc.setTextColor(5, 150, 105) // Green
        addText(`Rs. ${parseFloat(item.totalPrice.toString()).toFixed(2)}`, xPos, yPos + 5, { fontSize: 9, bold: true })
        doc.setTextColor(0, 0, 0)
        yPos += 8
      })
      yPos += 8

      // Summary Section - Right aligned, single line per item
      const summaryWidth = 80
      const summaryX = pageWidth - margin - summaryWidth
      
      doc.setFillColor(99, 102, 241)
      doc.rect(summaryX, yPos, summaryWidth, 8, 'F')
          doc.setTextColor(255, 255, 255)
      addText('Summary', summaryX + summaryWidth / 2, yPos + 5, { fontSize: 11, bold: true, align: 'center' })
      yPos += 10

      // Paid Amount (if > 0)
      if (parseFloat(bill.paidAmount.toString()) > 0) {
        doc.setFillColor(243, 244, 246)
        doc.rect(summaryX, yPos, summaryWidth, 7, 'F')
          doc.setTextColor(0, 0, 0)
        addText(`Paid Amount: Rs. ${parseFloat(bill.paidAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 4.5, { fontSize: 9 })
        yPos += 8
      }

      // Pending Amount (if > 0)
      if (parseFloat(bill.pendingAmount.toString()) > 0) {
        doc.setFillColor(255, 255, 255)
        doc.rect(summaryX, yPos, summaryWidth, 7, 'F')
        doc.setTextColor(0, 0, 0)
        addText(`Pending Amount: Rs. ${parseFloat(bill.pendingAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 4.5, { fontSize: 9 })
        yPos += 8
      }

      // Total Amount (always shown)
      doc.setFillColor(255, 255, 255)
      doc.rect(summaryX, yPos, summaryWidth, 7, 'F')
      doc.setTextColor(0, 0, 0)
      addText(`Total Amount: Rs. ${parseFloat(bill.totalAmount.toString()).toFixed(2)}`, summaryX + 2, yPos + 4.5, { fontSize: 9, bold: true })
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
