import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

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

    // Fetch ALL bills without any limit to ensure everything is in PDF
    const bills = await prisma.bill.findMany({
      where,
      include: {
        user: true,
        items: {
          include: {
            feed: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      // No limit - include all bills in PDF
    })

    // Generate PDF
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const lineHeight = 6

    // Helper function to safely format numbers
    const formatCurrency = (amount: number): string => {
      return parseFloat(amount.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    // Helper function to safely add text
    const addText = (text: string | string[], x: number, y: number, options?: any) => {
      if (Array.isArray(text)) {
        text.forEach((line, index) => {
          let cleanText = String(line).trim()
          // Don't remove numbers and currency symbols
          if (cleanText) {
            doc.text(cleanText, x, y + (index * (lineHeight + 1)), options)
          }
        })
      } else {
        let cleanText = String(text).trim()
        // Don't remove numbers and currency symbols
        if (cleanText) {
          doc.text(cleanText, x, y, options)
        }
      }
    }
    
    // Helper function to format currency properly
    const formatPrice = (amount: number): string => {
      return 'Rs. ' + amount.toFixed(2)
    }

    // Helper function to draw a line
    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: number[] = [0, 0, 0]) => {
      doc.setDrawColor(color[0], color[1], color[2])
      doc.line(x1, y1, x2, y2)
      doc.setDrawColor(0, 0, 0) // Reset to black
    }

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number, currentY: number): { newPage: boolean; yPos: number } => {
      if (currentY + requiredSpace > pageHeight - 25) {
        doc.addPage()
        return { newPage: true, yPos: 15 }
      }
      return { newPage: false, yPos: currentY }
    }

    // ============================================
    // PAGE 1: SUMMARY/OVERVIEW PAGE
    // ============================================
    let yPos = 15

    // Header - Light blue gradient
    doc.setFillColor(70, 130, 180) // Steel blue
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setDrawColor(50, 100, 150)
    doc.setLineWidth(1)
    doc.line(0, 40, pageWidth, 40)
    doc.setLineWidth(0.2)
    
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    addText('Gurudatta trader\'s', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(16)
    addText('Sales Report', pageWidth / 2, 32, { align: 'center' })
    
    yPos = 50

    // Report Info Box - Light blue tint
    doc.setFillColor(240, 248, 255) // Alice blue
    doc.rect(margin, yPos, pageWidth - margin * 2, 35, 'F')
    doc.setDrawColor(70, 130, 180) // Steel blue border
    doc.setLineWidth(0.5)
    doc.rect(margin, yPos, pageWidth - margin * 2, 35, 'S')
    doc.setLineWidth(0.2)
    doc.setTextColor(50, 50, 50)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const reportTypeText = type === 'today' ? 'Today' : type === 'monthly' ? 'This Month' : 'This Year'
    addText('Report Type: ' + reportTypeText, margin + 3, yPos + 7)
    yPos += lineHeight + 2
    
    if (userId) {
      const user = bills[0]?.user
      if (user) {
        addText('Customer: ' + user.name + ' (' + user.mobileNo + ')', margin + 3, yPos + 7)
        yPos += lineHeight + 2
      }
    }
    
    const dateRange = `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    addText('Period: ' + dateRange, margin + 3, yPos + 7)
    yPos += lineHeight + 2
    addText('Total Bills: ' + bills.length.toString(), margin + 3, yPos + 7)
    yPos += 25

    // Calculate Summary Statistics
    const totalSales = bills.reduce((sum, bill) => sum + bill.totalAmount, 0)
    const totalPaid = bills.reduce((sum, bill) => sum + bill.paidAmount, 0)
    const totalPending = bills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
    const paidBills = bills.filter(b => b.status === 'paid').length
    const partialBills = bills.filter(b => b.status === 'partial').length
    const pendingBills = bills.filter(b => b.status === 'pending').length

    // Summary Boxes - Attractive Layout
    const boxWidth = (pageWidth - margin * 3) / 2
    const boxHeight = 30
    const boxSpacing = 10

    // Top Row - Financial Summary
    // Box 1: Total Sales - Light blue
    doc.setFillColor(230, 240, 255) // Very light blue
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
    doc.setDrawColor(70, 130, 180) // Steel blue border
    doc.setLineWidth(0.5)
    doc.rect(margin, yPos, boxWidth, boxHeight, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    addText('Total Sales', margin + 5, yPos + 8)
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    addText('Rs. ' + formatCurrency(totalSales), margin + 5, yPos + 18, { fontStyle: 'bold' })

    // Box 2: Total Paid - Light green
    doc.setFillColor(230, 255, 240) // Very light green
    doc.rect(margin + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'F')
    doc.setDrawColor(0, 150, 0) // Green border
    doc.setLineWidth(0.5)
    doc.rect(margin + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    addText('Total Paid', margin + boxWidth + boxSpacing + 5, yPos + 8)
    doc.setFontSize(14)
    doc.setTextColor(0, 128, 0) // Green
    addText('Rs. ' + formatCurrency(totalPaid), margin + boxWidth + boxSpacing + 5, yPos + 18, { fontStyle: 'bold' })

    yPos += boxHeight + boxSpacing

    // Second Row - Financial Summary
    // Box 3: Total Pending - Light orange
    doc.setFillColor(255, 240, 230) // Very light orange
    doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
    doc.setDrawColor(255, 140, 0) // Orange border
    doc.setLineWidth(0.5)
    doc.rect(margin, yPos, boxWidth, boxHeight, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    addText('Total Pending', margin + 5, yPos + 8)
    doc.setFontSize(14)
    doc.setTextColor(255, 140, 0) // Orange
    addText('Rs. ' + formatCurrency(totalPending), margin + 5, yPos + 18, { fontStyle: 'bold' })

    // Box 4: Payment Status Summary - Light purple
    doc.setFillColor(250, 240, 255) // Very light purple
    doc.rect(margin + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'F')
    doc.setDrawColor(150, 100, 200) // Purple border
    doc.setLineWidth(0.5)
    doc.rect(margin + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    addText('Payment Status', margin + boxWidth + boxSpacing + 5, yPos + 8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 128, 0) // Green
    addText(`Paid: ${paidBills}`, margin + boxWidth + boxSpacing + 5, yPos + 15)
    doc.setTextColor(255, 140, 0) // Orange
    addText(`Partial: ${partialBills}`, margin + boxWidth + boxSpacing + 5, yPos + 21)
    doc.setTextColor(220, 20, 60) // Red
    addText(`Pending: ${pendingBills}`, margin + boxWidth + boxSpacing + 5, yPos + 27)

    yPos += boxHeight + 20

    // Bills List Summary Table
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    addText('Bills Overview', margin, yPos)
    yPos += lineHeight + 5

    // Table Header - Light blue
    doc.setFillColor(70, 130, 180) // Steel blue
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    addText('Bill Number', margin + 3, yPos + 5.5)
    addText('Customer', margin + 50, yPos + 5.5)
    addText('Date', margin + 120, yPos + 5.5)
    addText('Amount', margin + 150, yPos + 5.5)
    addText('Status', margin + 180, yPos + 5.5)
    yPos += 10

    // Table Rows
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    for (let i = 0; i < Math.min(bills.length, 15); i++) { // Show first 15 bills on summary page
      const bill = bills[i]
      const result = checkPageBreak(8, yPos)
      if (result.newPage) {
        yPos = result.yPos
        // Redraw header if new page
        doc.setFillColor(0, 0, 0)
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        addText('Bill Number', margin + 3, yPos + 5.5)
        addText('Customer', margin + 50, yPos + 5.5)
        addText('Date', margin + 120, yPos + 5.5)
        addText('Amount', margin + 150, yPos + 5.5)
        addText('Status', margin + 180, yPos + 5.5)
        yPos += 10
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
      }

      // Alternate row colors - Light pastel
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 255) // Very light blue
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F')
      } else {
        doc.setFillColor(255, 250, 250) // Very light pink
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F')
      }
      
      doc.setTextColor(30, 30, 30) // Dark gray text

      const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      addText(bill.billNumber, margin + 3, yPos + 5)
      addText(bill.user.name.substring(0, 20), margin + 50, yPos + 5)
      addText(billDate, margin + 120, yPos + 5)
      addText('Rs. ' + formatCurrency(bill.totalAmount), margin + 150, yPos + 5)
      addText(bill.status.toUpperCase(), margin + 180, yPos + 5)
      
      drawLine(margin, yPos + 7, pageWidth - margin, yPos + 7)
      yPos += 7
    }

    if (bills.length > 15) {
      yPos += 5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      addText(`... and ${bills.length - 15} more bills (see detailed pages)`, margin, yPos)
    }

    // ============================================
    // PAGE 2+: INDIVIDUAL BILLS
    // ============================================
    
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i]
      
      // Start each bill on a new page
      if (i === 0) {
        doc.addPage()
      } else {
        doc.addPage()
      }
      
      yPos = 15

      // Bill Header with attractive styling - Light blue gradient
      doc.setFillColor(70, 130, 180) // Steel blue
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setDrawColor(50, 100, 150)
      doc.setLineWidth(1)
      doc.line(0, 40, pageWidth, 40)
      
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      addText('Gurudatta trader\'s', pageWidth / 2, 22, { align: 'center' })
      doc.setFontSize(12)
      addText('Bill Invoice', pageWidth / 2, 33, { align: 'center' })
      
      yPos = 50

      // Bill Number and Date - Light background
      const billInfoHeight = 22
      doc.setFillColor(240, 248, 255) // Alice blue
      doc.rect(margin, yPos, pageWidth - margin * 2, billInfoHeight, 'F')
      doc.setDrawColor(70, 130, 180)
      doc.setLineWidth(0.5)
      doc.rect(margin, yPos, pageWidth - margin * 2, billInfoHeight, 'S')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      addText(`Bill Number: ${bill.billNumber}`, margin + 5, yPos + 8)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      addText(`Date: ${billDate}`, margin + 5, yPos + 16)
      yPos += billInfoHeight + 8 // Add spacing after box

      // Customer Information Box - Light green tint (dynamic height)
      const customerInfoStartY = yPos
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const customerHeaderHeight = 8
      let customerContentHeight = customerHeaderHeight + 3
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      customerContentHeight += 6 // Name
      customerContentHeight += 6 // Mobile
      if (bill.user.address) {
        const addressLines = doc.splitTextToSize(`Address: ${bill.user.address}`, pageWidth - margin * 2 - 10)
        customerContentHeight += addressLines.length * 5
      }
      customerContentHeight += 5 // Bottom padding
      
      const customerBoxHeight = customerContentHeight
      doc.setFillColor(245, 255, 250) // Mint cream
      doc.rect(margin, customerInfoStartY, pageWidth - margin * 2, customerBoxHeight, 'F')
      doc.setDrawColor(144, 238, 144) // Light green border
      doc.setLineWidth(0.5)
      doc.rect(margin, customerInfoStartY, pageWidth - margin * 2, customerBoxHeight, 'S')
      
      yPos = customerInfoStartY + 3
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      addText('Customer Information', margin + 5, yPos + 5)
      yPos += customerHeaderHeight + 2
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      addText(`Name: ${bill.user.name}`, margin + 5, yPos)
      yPos += 6
      addText(`Mobile: ${bill.user.mobileNo}`, margin + 5, yPos)
      yPos += 6
      if (bill.user.address) {
        const addressLines = doc.splitTextToSize(`Address: ${bill.user.address}`, pageWidth - margin * 2 - 10)
        addText(addressLines, margin + 5, yPos)
        yPos += addressLines.length * 5
      }
      yPos = customerInfoStartY + customerBoxHeight + 8 // Add spacing after box

      // Items Table Header
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      addText('Items', margin, yPos)
      yPos += 8 // More spacing before table

      // Table Header Background - Light blue
      // Calculate column positions properly (define once for the bill)
      const tableWidth = pageWidth - margin * 2
      const col1X = margin + 3 // Feed Name
      const col2X = margin + tableWidth * 0.35 // Weight
      const col3X = margin + tableWidth * 0.50 // Qty
      const col4X = margin + tableWidth * 0.65 // Unit Price
      const col5X = pageWidth - margin - 3 // Total (right aligned)
      
      doc.setFillColor(70, 130, 180) // Steel blue
      doc.rect(margin, yPos, tableWidth, 8, 'F')
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      addText('Feed Name', col1X, yPos + 5.5)
      addText('Weight', col2X, yPos + 5.5)
      addText('Qty', col3X, yPos + 5.5)
      addText('Unit Price', col4X, yPos + 5.5)
      addText('Total', col5X, yPos + 5.5, { align: 'right' })
      
      yPos += 8
      drawLine(margin, yPos, pageWidth - margin, yPos, [0, 0, 0])

      // Table Rows
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      
      for (let itemIndex = 0; itemIndex < bill.items.length; itemIndex++) {
        const item = bill.items[itemIndex]
        const result = checkPageBreak(10, yPos)
        if (result.newPage) {
          yPos = result.yPos
          // Redraw header on new page - Light blue
          doc.setFillColor(70, 130, 180) // Steel blue
          doc.rect(margin, yPos, tableWidth, 8, 'F')
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          addText('Feed Name', col1X, yPos + 5.5)
          addText('Weight', col2X, yPos + 5.5)
          addText('Qty', col3X, yPos + 5.5)
          addText('Unit Price', col4X, yPos + 5.5)
          addText('Total', col5X, yPos + 5.5, { align: 'right' })
          yPos += 8
          drawLine(margin, yPos, pageWidth - margin, yPos, [0, 0, 0])
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
        }

        // Alternate row colors - Light pastel colors
        if (itemIndex % 2 === 0) {
          doc.setFillColor(250, 250, 255) // Very light blue
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        } else {
          doc.setFillColor(255, 250, 250) // Very light pink
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F')
        }

        doc.setTextColor(30, 30, 30) // Dark gray text
        // Use calculated column positions
        addText(item.feed.name, col1X, yPos + 5.5)
        addText(`${item.feed.weight} kg`, col2X, yPos + 5.5)
        addText(item.quantity.toFixed(0), col3X, yPos + 5.5)
        // Fix number formatting - use proper string conversion
        const unitPrice = parseFloat(item.unitPrice.toString()).toFixed(2)
        const totalPrice = parseFloat(item.totalPrice.toString()).toFixed(2)
        addText(formatPrice(parseFloat(unitPrice)), col4X, yPos + 5.5)
        addText(formatPrice(parseFloat(totalPrice)), col5X, yPos + 5.5, { align: 'right' })
        
        yPos += 8
        drawLine(margin, yPos, pageWidth - margin, yPos, [200, 200, 200])
      }

      yPos += 12 // More spacing before summary

      // Summary Section - Light orange/yellow tint
      // Position summary box properly, ensure it doesn't overlap
      const summaryWidth = 85
      const summaryX = pageWidth - margin - summaryWidth
      const summaryBoxHeight = 45 // Increased for better spacing

      // Check if summary fits on current page
      const result = checkPageBreak(summaryBoxHeight + 10, yPos)
      if (result.newPage) {
        yPos = result.yPos
      }

      doc.setFillColor(255, 250, 240) // Light orange tint
      doc.rect(summaryX, yPos, summaryWidth, summaryBoxHeight, 'F')
      doc.setDrawColor(255, 165, 0) // Orange border
      doc.setLineWidth(0.5)
      doc.rect(summaryX, yPos, summaryWidth, summaryBoxHeight, 'S')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      addText('Summary', summaryX + 5, yPos + 8)
      yPos += 12

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      addText('Total Amount:', summaryX + 5, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const totalAmt = parseFloat(bill.totalAmount.toString()).toFixed(2)
      addText(formatPrice(parseFloat(totalAmt)), summaryX + summaryWidth - 5, yPos, { align: 'right' })
      yPos += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      addText('Paid Amount:', summaryX + 5, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 128, 0) // Green for paid
      const paidAmt = parseFloat(bill.paidAmount.toString()).toFixed(2)
      addText(formatPrice(parseFloat(paidAmt)), summaryX + summaryWidth - 5, yPos, { align: 'right' })
      yPos += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      addText('Pending:', summaryX + 5, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 140, 0) // Orange for pending
      const pendingAmt = parseFloat(bill.pendingAmount.toString()).toFixed(2)
      addText(formatPrice(parseFloat(pendingAmt)), summaryX + summaryWidth - 5, yPos, { align: 'right' })
      yPos += 8

      // Status Badge - Color coded
      let statusColor = [200, 200, 200] // Default gray
      let statusBgColor = [240, 240, 240]
      if (bill.status === 'paid') {
        statusColor = [0, 128, 0] // Green
        statusBgColor = [220, 255, 220] // Light green
      } else if (bill.status === 'partial') {
        statusColor = [255, 140, 0] // Orange
        statusBgColor = [255, 240, 220] // Light orange
      } else {
        statusColor = [220, 20, 60] // Red
        statusBgColor = [255, 220, 220] // Light red
      }
      
      doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2])
      doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2])
      const badgeWidth = 35
      const badgeX = summaryX + (summaryWidth - badgeWidth) / 2 // Center the badge
      doc.roundedRect(badgeX, yPos, badgeWidth, 7, 2, 2, 'F')
      doc.roundedRect(badgeX, yPos, badgeWidth, 7, 2, 2, 'S')
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      addText(bill.status.toUpperCase(), badgeX + badgeWidth / 2, yPos + 4.5, { align: 'center' })

      // Footer
      yPos = pageHeight - 15
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      addText('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' })
    }

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
