import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // default to month

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Determine date range based on period
    let startDate: Date
    if (period === 'today') {
      startDate = startOfToday
    } else if (period === 'year') {
      startDate = startOfYear
    } else {
      // month (default)
      startDate = startOfMonth
    }

    // Optimize: Run all queries in parallel and use aggregates
    const [
      todaySalesResult,
      monthSalesResult,
      pendingResult,
      totalUsers,
      totalFeeds,
      totalStockResult,
      creditors,
      debtorsCount,
      chartDataResult,
      feedSalesResult
    ] = await Promise.all([
      // Today's sales - use aggregate
      prisma.bill.aggregate({
        where: {
          createdAt: { gte: startOfToday },
        },
        _sum: { totalAmount: true },
      }),
      // Month sales - use aggregate
      prisma.bill.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      // Pending amount - use aggregate
      prisma.bill.aggregate({
        where: {
          status: { in: ['pending', 'partial'] },
        },
        _sum: { pendingAmount: true },
      }),
      // Total users
      prisma.user.count(),
      // Total feeds
      prisma.feed.count(),
      // Total stock - use aggregate
      prisma.feed.aggregate({
        _sum: { stock: true },
      }),
      // Creditors - optimized query
      prisma.user.findMany({
        where: {
          bills: {
            some: {
              status: { in: ['pending', 'partial'] },
            },
          },
        },
        select: {
          id: true,
          name: true,
          mobileNo: true,
          bills: {
            where: {
              status: { in: ['pending', 'partial'] },
            },
            select: {
              pendingAmount: true,
            },
          },
        },
      }),
      // Debtors count
      prisma.user.count({
        where: {
          bills: {
            every: {
              status: 'paid',
            },
          },
        },
      }),
      // Chart data - based on period
      prisma.bill.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      // Feed sales data for pie chart
      prisma.billItem.findMany({
        where: {
          bill: {
            createdAt: {
              gte: startDate,
            },
          },
        },
        select: {
          feed: {
            select: {
              id: true,
              name: true,
              brand: true,
              weight: true,
            },
          },
          quantity: true,
          totalPrice: true,
        },
      }),
    ])

    const todaySales = todaySalesResult._sum.totalAmount || 0
    const monthSales = monthSalesResult._sum.totalAmount || 0
    const pendingAmount = pendingResult._sum.pendingAmount || 0
    const totalStock = totalStockResult._sum.stock || 0

    const creditorsData = creditors.map(user => ({
      id: user.id,
      name: user.name,
      mobileNo: user.mobileNo,
      totalPending: user.bills.reduce((sum, bill) => sum + bill.pendingAmount, 0),
    }))

    // Process chart data based on period
    const chartMap = new Map<string, number>()
    chartDataResult.forEach(item => {
      let dateKey: string
      if (period === 'today') {
        // Group by hour for today
        const date = new Date(item.createdAt)
        dateKey = `${date.getHours()}:00`
      } else if (period === 'year') {
        // Group by month for year
        const date = new Date(item.createdAt)
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else {
        // Group by day for month
        dateKey = new Date(item.createdAt).toISOString().split('T')[0]
      }
      const existing = chartMap.get(dateKey) || 0
      chartMap.set(dateKey, existing + (item.totalAmount || 0))
    })

    // Generate chart data based on period
    let chartData: Array<{ date: string; sales: number }> = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    if (period === 'today') {
      // Last 24 hours
      for (let i = 23; i >= 0; i--) {
        const hour = new Date()
        hour.setHours(hour.getHours() - i, 0, 0, 0)
        const hourKey = `${hour.getHours()}:00`
        chartData.push({
          date: hourKey,
          sales: chartMap.get(hourKey) || 0,
        })
      }
    } else if (period === 'year') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i, 1)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const displayDate = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
        chartData.push({
          date: displayDate,
          sales: chartMap.get(monthKey) || 0,
        })
      }
    } else {
      // Last 30 days (month) - default
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const dateStr = date.toISOString().split('T')[0]
        const displayDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
        chartData.push({
          date: displayDate,
          sales: chartMap.get(dateStr) || 0,
        })
      }
    }

    // Process feed sales data for pie chart
    const feedSalesMap = new Map<string, { name: string; quantity: number; totalPrice: number }>()
    feedSalesResult.forEach(item => {
      const feedName = `${item.feed.name}${item.feed.brand ? ` (${item.feed.brand})` : ''} - ${item.feed.weight}kg`
      const existing = feedSalesMap.get(feedName) || { name: feedName, quantity: 0, totalPrice: 0 }
      feedSalesMap.set(feedName, {
        name: feedName,
        quantity: existing.quantity + item.quantity,
        totalPrice: existing.totalPrice + item.totalPrice,
      })
    })

    // Convert to array and sort by quantity (most sold first)
    const feedSalesData = Array.from(feedSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        name: item.name,
        value: item.quantity,
        totalPrice: item.totalPrice,
      }))

    return NextResponse.json({
      todaySales,
      monthSales,
      pendingAmount,
      totalUsers,
      totalFeeds,
      totalStock,
      creditors: creditorsData,
      debtors: debtorsCount,
      chartData,
      feedSalesData,
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

