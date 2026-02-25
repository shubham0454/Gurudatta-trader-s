import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { TDocumentDefinitions } from 'pdfmake/interfaces'
import fs from 'fs'
import path from 'path'

// Get PDFMake printer with fonts configured
function getPdfPrinter() {
  // Use require() for server-side to avoid Next.js webpack bundling issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PdfPrinterModule = require('pdfmake/js/printer')
  const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule
  
  // Font configuration - use Roboto fonts
  const fonts: any = {}
  
  const robotoFonts = {
    Roboto: {
      normal: path.join(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
      bold: path.join(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
      italics: path.join(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
      bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
    }
  }
  
  // Add Roboto if fonts exist
  if (fs.existsSync(robotoFonts.Roboto.normal)) {
    fonts.Roboto = robotoFonts.Roboto
  }
  
  try {
    if (Object.keys(fonts).length > 0) {
      return new PdfPrinter(fonts)
    }
    // Fallback to empty fonts
    return new PdfPrinter({})
  } catch (error) {
    console.error('Error initializing PDFMake fonts:', error)
    // Fallback to empty fonts
    return new PdfPrinter({})
  }
}

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
      // Ensure text is properly converted to string and trimmed
      let result = String(text).trim()
      // Remove any null bytes or invalid characters that might break PDF rendering
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

    // Build PDF document definition
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [15, 15, 15, 15],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#333333',
      },
      content: [
        // Header with gradient background effect
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: "Gurudatta trader's",
                  fontSize: 24,
                  bold: true,
                  alignment: 'center',
                  color: '#FFFFFF',
                  fillColor: '#1e40af', // Blue background
                  margin: [0, 10, 0, 10]
                }
              ],
              [
                {
                  text: 'Sales Report',
                  fontSize: 18,
                  bold: true,
                  alignment: 'center',
                  color: '#FFFFFF',
                  fillColor: '#3b82f6', // Lighter blue
                  margin: [0, 5, 0, 5]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20]
        },
        
        // Report Info Box with colors
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: [
                    { text: 'Report Type: ', bold: true, color: '#FFFFFF' },
                    { text: reportTypeText, color: '#FFFFFF' }
                  ],
                  border: [true, true, true, true],
                  fillColor: '#1e40af' // Blue header
                }
              ],
              ...(userId && bills[0]?.user ? [
                [
                  {
                    text: [
                      { text: 'Customer: ', bold: true, color: '#1f2937' },
                      { 
                        text: safeText(bills[0].user.name) || '[No Name]',
                        color: '#1f2937'
                      },
                      { text: ' (' + bills[0].user.mobileNo + ')', color: '#6b7280' }
                    ],
                    border: [true, false, true, true],
                    fillColor: '#f3f4f6' // Light gray
                  }
                ]
              ] : []),
              [
                {
                  text: [
                    { text: 'Period: ', bold: true, color: '#1f2937' },
                    { text: dateRange, color: '#1f2937' }
                  ],
                  border: [true, false, true, true],
                  fillColor: '#ffffff'
                }
              ],
              [
                {
                  text: [
                    { text: 'Total Bills: ', bold: true, color: '#1f2937' },
                    { text: bills.length.toString(), color: '#1f2937' }
                  ],
                  border: [true, false, true, true],
                  fillColor: '#f3f4f6' // Light gray
                }
              ]
            ]
          },
          layout: {
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
            hLineWidth: () => 0,
            vLineWidth: () => 0
          },
          margin: [0, 0, 0, 20]
        },

        // Summary Boxes with attractive colors
        {
          columns: [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Total Sales',
                      fontSize: 10,
                      bold: true,
                      color: '#FFFFFF',
                      border: [true, true, true, false],
                      fillColor: '#10b981' // Green
                    }
                  ],
                  [
                    {
                      text: 'Rs. ' + formatCurrency(totalSales),
                      fontSize: 14,
                      bold: true,
                      color: '#1f2937',
                      border: [true, false, true, true],
                      fillColor: '#d1fae5' // Light green
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 8,
                paddingBottom: () => 8,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              width: '48%'
            },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Total Paid',
                      fontSize: 10,
                      bold: true,
                      color: '#FFFFFF',
                      border: [true, true, true, false],
                      fillColor: '#3b82f6' // Blue
                    }
                  ],
                  [
                    {
                      text: 'Rs. ' + formatCurrency(totalPaid),
                      fontSize: 14,
                      bold: true,
                      color: '#1f2937',
                      border: [true, false, true, true],
                      fillColor: '#dbeafe' // Light blue
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 8,
                paddingBottom: () => 8,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              width: '48%',
              margin: [10, 0, 0, 0]
            }
          ],
          margin: [0, 0, 0, 15]
        },
        {
          columns: [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Total Pending',
                      fontSize: 10,
                      bold: true,
                      color: '#FFFFFF',
                      border: [true, true, true, false],
                      fillColor: '#ef4444' // Red
                    }
                  ],
                  [
                    {
                      text: 'Rs. ' + formatCurrency(totalPending),
                      fontSize: 14,
                      bold: true,
                      color: '#1f2937',
                      border: [true, false, true, true],
                      fillColor: '#fee2e2' // Light red
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 8,
                paddingBottom: () => 8,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              width: '48%'
            },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Payment Status',
                      fontSize: 10,
                      bold: true,
                      color: '#FFFFFF',
                      border: [true, true, true, false],
                      fillColor: '#8b5cf6' // Purple
                    }
                  ],
                  [
                    {
                      text: [
                        { text: 'Paid: ', color: '#059669' },
                        { text: paidBills.toString() + '\n', bold: true, color: '#1f2937' },
                        { text: 'Partial: ', color: '#d97706' },
                        { text: partialBills.toString() + '\n', bold: true, color: '#1f2937' },
                        { text: 'Pending: ', color: '#dc2626' },
                        { text: pendingBills.toString(), bold: true, color: '#1f2937' }
                      ],
                      fontSize: 9,
                      border: [true, false, true, true],
                      fillColor: '#f3e8ff' // Light purple
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 8,
                paddingBottom: () => 8,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              width: '48%',
              margin: [10, 0, 0, 0]
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // Bills Overview Table with colorful design
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'Bills Overview',
                  fontSize: 14,
                  bold: true,
                  color: '#FFFFFF',
                  fillColor: '#6366f1', // Indigo
                  alignment: 'center',
                  margin: [0, 5, 0, 5]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: [40, '*', 50, 50],
            body: [
              // Header row with gradient colors
              [
                {
                  text: 'Bill Number',
                  bold: true,
                  fillColor: '#1e40af', // Blue
                  color: '#FFFFFF',
                  fontSize: 10
                },
                {
                  text: 'Customer',
                  bold: true,
                  fillColor: '#1e40af',
                  color: '#FFFFFF',
                  fontSize: 10
                },
                {
                  text: 'Date',
                  bold: true,
                  fillColor: '#1e40af',
                  color: '#FFFFFF',
                  fontSize: 10
                },
                {
                  text: 'Amount',
                  bold: true,
                  fillColor: '#1e40af',
                  color: '#FFFFFF',
                  fontSize: 10
                }
              ],
              // Data rows with alternating colors
              ...bills.slice(0, 15).map((bill, index) => [
                {
                  text: bill.billNumber,
                  fillColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                  color: '#1f2937',
                  fontSize: 9
                },
                {
                  text: safeText(bill.user.name) || '[No Name]',
                  fillColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                  color: '#1f2937',
                  fontSize: 9
                },
                {
                  text: new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                  fillColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                  color: '#1f2937',
                  fontSize: 9
                },
                {
                  text: 'Rs. ' + formatCurrency(bill.totalAmount),
                  fillColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                  color: '#059669',
                  bold: true,
                  fontSize: 9
                }
              ])
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb'
          },
          margin: [0, 0, 0, 15]
        },
        ...(bills.length > 15 ? [
          {
            text: `... and ${bills.length - 15} more bills (see detailed pages)`,
            fontSize: 9,
            italics: true,
            margin: [0, 0, 0, 20]
          }
        ] : []),

        // Individual Bill Details
        ...bills.map((bill, billIndex) => {
      const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })

          return [
            // Page break before each bill (except first)
            ...(billIndex > 0 ? [{ text: '', pageBreak: 'before' }] : [{ text: '', pageBreak: 'before' }]),
            
            // Bill Header with colors
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: "Gurudatta trader's",
                      fontSize: 22,
                      bold: true,
                      alignment: 'center',
                      color: '#FFFFFF',
                      fillColor: '#1e40af',
                      margin: [0, 10, 0, 10]
                    }
                  ],
                  [
                    {
                      text: 'Bill Invoice',
                      fontSize: 14,
                      bold: true,
                      alignment: 'center',
                      color: '#FFFFFF',
                      fillColor: '#3b82f6',
                      margin: [0, 5, 0, 5]
                    }
                  ]
                ]
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 15]
            },

            // Bill Info with colors
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: [
                        { text: 'Bill Number: ', bold: true, fontSize: 11, color: '#FFFFFF' },
                        { text: bill.billNumber, fontSize: 11, color: '#FFFFFF' }
                      ],
                      border: [true, true, true, false],
                      fillColor: '#6366f1' // Indigo
                    }
                  ],
                  [
                    {
                      text: [
                        { text: 'Date: ', bold: true, fontSize: 10, color: '#1f2937' },
                        { text: billDate, fontSize: 10, color: '#1f2937' }
                      ],
                      border: [true, false, true, true],
                      fillColor: '#f3f4f6' // Light gray
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              margin: [0, 0, 0, 15]
            },

            // Customer Information with colors
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Customer Information',
                      bold: true,
                      fontSize: 12,
                      color: '#FFFFFF',
                      border: [true, true, true, false],
                      fillColor: '#10b981' // Green
                    }
                  ],
                  [
                    {
                      text: [
                        { text: 'Name: ', bold: true, color: '#1f2937' },
                        { 
                          text: safeText(bill.user.name) || '[No Name]',
                          color: '#1f2937'
                        }
                      ],
                      border: [true, false, true, false],
                      fillColor: '#ffffff'
                    }
                  ],
                  [
                    {
                      text: [
                        { text: 'Mobile: ', bold: true, color: '#1f2937' },
                        { text: bill.user.mobileNo, color: '#1f2937' }
                      ],
                      border: [true, false, true, false],
                      fillColor: '#f3f4f6' // Light gray
                    }
                  ],
                  ...(bill.user.address ? [
                    [
                      {
                        text: [
                          { text: 'Address: ', bold: true, color: '#1f2937' },
                          { 
                            text: safeText(bill.user.address) || '[No Address]',
                            color: '#1f2937'
                          }
                        ],
                        border: [true, false, true, true],
                        fillColor: '#ffffff'
                      }
                    ]
                  ] : [
                    [
                      {
                        text: '',
                        border: [true, false, true, true],
                        fillColor: '#ffffff'
                      }
                    ]
                  ])
                ]
              },
              layout: {
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              margin: [0, 0, 0, 15]
            },

            // Items Table with colors
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'Items',
                      fontSize: 12,
                      bold: true,
                      color: '#FFFFFF',
                      fillColor: '#8b5cf6', // Purple
                      alignment: 'center',
                      margin: [0, 5, 0, 5]
                    }
                  ]
                ]
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 8]
            },
            {
              table: {
                headerRows: 1,
                widths: ['*', 50, 40, 50, 50],
                body: [
                  // Header with colors
                  [
                    {
                      text: 'Feed Name',
                      bold: true,
                      fillColor: '#1e40af', // Blue
                      color: '#FFFFFF',
                      fontSize: 10
                    },
                    {
                      text: 'Weight',
                      bold: true,
                      fillColor: '#1e40af',
                      color: '#FFFFFF',
                      fontSize: 10
                    },
                    {
                      text: 'Qty',
                      bold: true,
                      fillColor: '#1e40af',
                      color: '#FFFFFF',
                      fontSize: 10
                    },
                    {
                      text: 'Unit Price',
                      bold: true,
                      fillColor: '#1e40af',
                      color: '#FFFFFF',
                      fontSize: 10
                    },
                    {
                      text: 'Total',
                      bold: true,
                      fillColor: '#1e40af',
                      color: '#FFFFFF',
                      fontSize: 10,
                      alignment: 'right'
                    }
                  ],
                  // Items with alternating colors
                  ...bill.items.map((item, itemIndex) => [
                    {
                      text: safeText(item.feed.name),
                      fillColor: itemIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
                      color: '#1f2937',
                      fontSize: 9
                    },
                    {
                      text: `${item.feed.weight} kg`,
                      fillColor: itemIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
                      color: '#1f2937',
                      fontSize: 9
                    },
                    {
                      text: item.quantity.toFixed(0),
                      fillColor: itemIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
                      color: '#1f2937',
                      fontSize: 9
                    },
                    {
                      text: 'Rs. ' + parseFloat(item.unitPrice.toString()).toFixed(2),
                      fillColor: itemIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
                      color: '#1f2937',
                      fontSize: 9
                    },
                    {
                      text: 'Rs. ' + parseFloat(item.totalPrice.toString()).toFixed(2),
                      fillColor: itemIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
                      color: '#059669',
                      bold: true,
                      fontSize: 9,
                      alignment: 'right'
                    }
                  ])
                ]
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#e5e7eb',
                vLineColor: () => '#e5e7eb'
              },
              margin: [0, 0, 0, 15]
            },

            // Summary with colors - conditionally show Paid and Pending amounts, positioned on right side
            {
              columns: [
                { text: '', width: '*' }, // Spacer to push summary to right
                {
                  width: 120,
                  table: {
                    widths: [120],
                    body: [
                      [
                        {
                          text: 'Summary',
                          bold: true,
                          fontSize: 12,
                          color: '#FFFFFF',
                          border: [true, true, true, false],
                          fillColor: '#6366f1' // Indigo
                        }
                      ],
                      [
                        {
                          text: [
                            { text: 'Total Amount: ', fontSize: 10, color: '#1f2937' },
                            { text: 'Rs. ' + parseFloat(bill.totalAmount.toString()).toFixed(2), bold: true, fontSize: 10, color: '#059669' }
                          ],
                          alignment: 'right',
                          border: [true, false, true, parseFloat(bill.paidAmount.toString()) === 0 && parseFloat(bill.pendingAmount.toString()) === 0 ? true : false],
                          fillColor: '#ffffff'
                        }
                      ],
                      // Only show Paid Amount if it's greater than 0
                      ...(parseFloat(bill.paidAmount.toString()) > 0 ? [
                        [
                          {
                            text: [
                              { text: 'Paid Amount: ', fontSize: 10, color: '#1f2937' },
                              { text: 'Rs. ' + parseFloat(bill.paidAmount.toString()).toFixed(2), bold: true, fontSize: 10, color: '#3b82f6' }
                            ],
                            alignment: 'right',
                            border: [true, false, true, parseFloat(bill.pendingAmount.toString()) === 0 ? true : false],
                            fillColor: '#f3f4f6' // Light gray
                          }
                        ]
                      ] : []),
                      // Only show Pending Amount if it's greater than 0
                      ...(parseFloat(bill.pendingAmount.toString()) > 0 ? [
                        [
                          {
                            text: [
                              { text: 'Pending: ', fontSize: 10, color: '#1f2937' },
                              { text: 'Rs. ' + parseFloat(bill.pendingAmount.toString()).toFixed(2), bold: true, fontSize: 10, color: '#ef4444' }
                            ],
                            alignment: 'right',
                            border: [true, false, true, true],
                            fillColor: '#ffffff'
                          }
                        ]
                      ] : [])
                    ]
                  },
                  layout: {
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                    hLineWidth: () => 0,
                    vLineWidth: () => 0
                  }
                }
              ],
              margin: [0, 0, 0, 15]
            },

          ]
        }).flat()
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#000000'
        }
      }
    }

    // Generate PDF with Unicode support
    const printer = getPdfPrinter()
    // createPdfKitDocument is async, so we need to await it
    const pdfDoc = await printer.createPdfKitDocument(docDefinition)
    
    // Convert to buffer
    const chunks: Buffer[] = []
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
    
    return new Promise<NextResponse>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-report-${type}-${Date.now()}.pdf"`,
      },
          })
        )
      })
      
      pdfDoc.on('error', (error: Error) => {
        console.error('PDF generation error:', error)
        reject(
          NextResponse.json(
            { error: 'Failed to generate PDF', details: error.message },
            { status: 500 }
          )
        )
      })
      
      pdfDoc.end()
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
