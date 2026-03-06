'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import ConfirmModal from '@/components/ConfirmModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feedSchema, type FeedInput } from '@/lib/validation'
import { apiRequest } from '@/lib/api'
import { LoadingSpinner, EditIcon, DeleteIcon, AddIcon } from '@/components/Icons'
import { showToast } from '@/components/Toast'

interface Feed {
  id: string
  name: string
  brand: string | null
  weight: number
  defaultPrice: number
  stock: number // Current available stock (legacy)
  shopStock?: number // Stock in shop
  godownStock?: number // Stock in godown
  soldStock?: number // Total sold stock
  totalStock?: number // Total stock (current + sold)
}

export default function FeedsPage() {
  const router = useRouter()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [allFeeds, setAllFeeds] = useState<Feed[]>([]) // Store all feeds for search
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false) // Prevent duplicate calls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [feedToDelete, setFeedToDelete] = useState<Feed | null>(null)
  const [isDeletingFeed, setIsDeletingFeed] = useState(false)
  const [newFeedLocation, setNewFeedLocation] = useState<'shop' | 'godown'>('godown') // Location for new feed stock
  const [editFeedLocation, setEditFeedLocation] = useState<'shop' | 'godown'>('godown') // When editing: stock in one place only
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const emptyFeedValues: FeedInput = {
    name: '',
    brand: '',
    weight: 0,
    defaultPrice: 0,
    stock: 0,
    shopStock: 0,
    godownStock: 0,
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedInput>({
    resolver: zodResolver(feedSchema),
    defaultValues: emptyFeedValues,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchFeeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only fetch once on mount

  const fetchFeeds = async () => {
    if (isFetching) return // Prevent duplicate calls
    try {
      setIsFetching(true)
      const token = localStorage.getItem('token')
      const response = await apiRequest('/api/feeds', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, true) // Use cache
      const data = await response.json()
      const feedsData = data.feeds || []
      setAllFeeds(feedsData)
      setFeeds(feedsData)
    } catch (error: any) {
      console.error('Error fetching feeds:', error)
      if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
        showToast('Network Error: No internet connection. Please check your connection and try again.', 'error')
      } else {
        showToast('Failed to load feeds. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFeeds(allFeeds || [])
      setCurrentPage(1)
      return
    }

    const filtered = (allFeeds || []).filter(
      (feed) =>
        feed.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (feed.brand && feed.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        feed.weight.toString().includes(searchQuery)
    )
    setFeeds(filtered)
    setCurrentPage(1)
  }, [searchQuery, allFeeds])

  // Pagination
  const feedsList = feeds || []
  const totalPages = Math.ceil(feedsList.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedFeeds = feedsList.slice(startIndex, endIndex)

  const onSubmit = async (data: FeedInput) => {
    try {
      const token = localStorage.getItem('token')
      const url = editingFeed ? `/api/feeds/${editingFeed.id}` : '/api/feeds'
      const method = editingFeed ? 'PUT' : 'POST'

      // Prepare data with location-based stock
      const feedData: any = {
        name: data.name,
        brand: data.brand || '',
        weight: data.weight,
        defaultPrice: data.defaultPrice,
        stock: data.stock || 0, // Legacy stock
      }

      // For new feeds, add stock to selected location
      if (!editingFeed) {
        if (newFeedLocation === 'shop') {
          feedData.shopStock = data.stock || 0
          feedData.godownStock = 0
        } else {
          feedData.shopStock = 0
          feedData.godownStock = data.stock || 0
        }
      } else {
        // For editing: stock is in one location only (godown OR shop)
        if (editFeedLocation === 'shop') {
          feedData.shopStock = data.shopStock ?? 0
          feedData.godownStock = 0
        } else {
          feedData.shopStock = 0
          feedData.godownStock = data.godownStock ?? 0
        }
        feedData.stock = feedData.shopStock + feedData.godownStock
      }

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(feedData),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setIsModalOpen(false)
        reset()
        setEditingFeed(null)
        setNewFeedLocation('godown')
        setEditFeedLocation('godown')
        fetchFeeds()
        showToast(editingFeed ? 'Feed updated successfully!' : 'Feed created successfully!', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to save feed', 'error')
      }
    } catch (error: any) {
      console.error('Error saving feed:', error)
      if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
        showToast('Network Error: No internet connection. Please check your connection and try again.', 'error')
      } else {
        showToast('An error occurred. Please try again.', 'error')
      }
    }
  }

  const handleEdit = (feed: Feed) => {
    setEditingFeed(feed)
    const shopStock = feed.shopStock || 0
    const godownStock = feed.godownStock || 0
    // Show only one location: whichever has stock; if both, prefer godown
    const location: 'shop' | 'godown' = godownStock > 0 ? 'godown' : 'shop'
    const totalStock = shopStock + godownStock
    setEditFeedLocation(location)
    reset({
      name: feed.name,
      brand: feed.brand || '',
      weight: feed.weight,
      defaultPrice: feed.defaultPrice,
      stock: feed.stock,
      shopStock: location === 'shop' ? totalStock : 0,
      godownStock: location === 'godown' ? totalStock : 0,
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (feed: Feed) => {
    setFeedToDelete(feed)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    const feedToDeleteId = feedToDelete?.id || editingFeed?.id
    if (!feedToDeleteId || isDeletingFeed) return
    setIsDeletingFeed(true)
    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/feeds/${feedToDeleteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setDeleteConfirmOpen(false)
        setFeedToDelete(null)
        setIsModalOpen(false)
        setEditingFeed(null)
        reset()
        fetchFeeds()
        showToast('Feed deleted successfully! It has been hidden from the list.', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to delete feed', 'error')
        setDeleteConfirmOpen(false)
        setFeedToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting feed:', error)
      showToast('An error occurred while deleting the feed', 'error')
      setDeleteConfirmOpen(false)
      setFeedToDelete(null)
    } finally {
      setIsDeletingFeed(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setFeedToDelete(null)
  }



  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-slate-300">
            <LoadingSpinner />
            <span>Loading...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Feeds</h1>
          <button
            onClick={() => {
              setEditingFeed(null)
              setNewFeedLocation('godown')
              setEditFeedLocation('godown')
              reset(emptyFeedValues)
              setIsModalOpen(true)
            }}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <AddIcon />
            <span>Add Feed</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
          <input
            type="text"
            placeholder="Search by name, brand, or weight..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
          />
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Name</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden sm:table-cell">Brand</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Weight</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden lg:table-cell">Price</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Stock (Godown or Shop)</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden sm:table-cell">Sold Stock</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden md:table-cell">Total Stock</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {paginatedFeeds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      {searchQuery ? 'No feeds found matching your search' : 'No feeds found'}
                    </td>
                  </tr>
                ) : (
                  paginatedFeeds.map((feed) => (
                    <tr key={feed.id} className="hover:bg-slate-750">
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm font-medium text-white">
                        {feed.name}
                        {feed.brand && <span className="block text-xs text-slate-400 sm:hidden">{feed.brand}</span>}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300 hidden sm:table-cell">
                        {feed.brand || '-'}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300">
                        {feed.weight} kg
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white hidden lg:table-cell">
                        ₹{feed.defaultPrice.toFixed(2)}
                        <span className="block text-xs text-slate-400">₹{(feed.defaultPrice / feed.weight).toFixed(2)}/kg</span>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                        <div className="flex flex-col space-y-1">
                          {(() => {
                            // Each feed has stock in one location only: show that one (Godown or Shop)
                            const shopStock = feed.shopStock || 0
                            const godownStock = feed.godownStock || 0
                            const legacyStock = (feed.stock > 0 && !shopStock && !godownStock) ? feed.stock : 0
                            let currentStock = 0
                            let stockLocation = ''
                            if (godownStock > 0) {
                              currentStock = godownStock
                              stockLocation = 'Godown'
                            } else if (shopStock > 0) {
                              currentStock = shopStock
                              stockLocation = 'Shop'
                            } else if (legacyStock > 0) {
                              currentStock = legacyStock
                              stockLocation = 'Godown'
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <span className={currentStock < 100 ? 'text-red-400 font-bold' : currentStock < 200 ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
                                  {currentStock.toFixed(0)}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {stockLocation || '—'}
                                </span>
                              </div>
                            )
                          })()}
                          {/* Mobile view: Show sold and total stock */}
                          <div className="sm:hidden mt-1 space-y-0.5">
                            <span className="text-xs text-blue-400">
                              Sold: {(feed.soldStock || 0).toFixed(0)}
                            </span>
                            <span className="text-xs text-purple-400 block">
                              Total: {(feed.totalStock || feed.stock).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300 hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="text-blue-400 font-semibold">
                            {(feed.soldStock || 0).toFixed(0)}
                          </span>
                          <span className="text-xs text-slate-400">
                            Sold
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300 hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-purple-400 font-semibold">
                            {(feed.totalStock || feed.stock).toFixed(0)}
                          </span>
                          <span className="text-xs text-slate-400">
                            Total
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-sm font-medium space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleEdit(feed)}
                          className="p-1.5 sm:px-2 sm:py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        {/* Delete button commented out
                        <button
                          onClick={() => handleDeleteClick(feed)}
                          className="p-1.5 sm:px-2 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Delete"
                        >
                          <DeleteIcon />
                        </button>
                        */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingFeed(null)
            setNewFeedLocation('godown')
            setEditFeedLocation('godown')
            reset(emptyFeedValues)
          }}
          title={editingFeed ? 'Edit Feed' : 'Add Feed'}
        >
          {/* Quick Options - Commented out
          {!editingFeed && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-sm font-medium text-blue-300 mb-2">Quick Options:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Tiwana',
                      brand: 'Premium',
                      weight: 25,
                      defaultPrice: 850,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Tiwana 25kg Premium
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Tiwana',
                      brand: 'Premium',
                      weight: 50,
                      defaultPrice: 1650,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Tiwana 50kg Premium
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Tiwana',
                      brand: 'Standard',
                      weight: 25,
                      defaultPrice: 750,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Tiwana 25kg Standard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Tiwana',
                      brand: 'Standard',
                      weight: 50,
                      defaultPrice: 1450,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Tiwana 50kg Standard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Cattle Feed',
                      brand: 'Premium',
                      weight: 25,
                      defaultPrice: 900,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Cattle Feed 25kg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      name: 'Cattle Feed',
                      brand: 'Premium',
                      weight: 50,
                      defaultPrice: 1750,
                      stock: 0,
                    })
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 border border-blue-600 rounded hover:bg-blue-900/50 text-slate-200"
                >
                  Cattle Feed 50kg
                </button>
              </div>
              <p className="text-xs text-blue-300 mt-2">Click any option to auto-fill, then adjust as needed</p>
            </div>
          )}
          */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Feed Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                placeholder="e.g., Tiwana"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Brand
              </label>
              <input
                {...register('brand')}
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.brand && (
                <p className="mt-1 text-sm text-red-400">{errors.brand.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Weight (kg) *
              </label>
              <input
                {...register('weight', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                placeholder="e.g., 25 or 50"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-400">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Default Price (₹) *
              </label>
              <input
                {...register('defaultPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.defaultPrice && (
                <p className="mt-1 text-sm text-red-400">{errors.defaultPrice.message}</p>
              )}
            </div>

            {!editingFeed && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Stock in (one location only) *
                  </label>
                  <select
                    value={newFeedLocation}
                    onChange={(e) => setNewFeedLocation(e.target.value as 'shop' | 'godown')}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  >
                    <option value="godown">Godown</option>
                    <option value="shop">Shop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {newFeedLocation === 'shop' ? 'Shop' : 'Godown'} stock quantity *
                  </label>
                  <input
                    {...register('stock', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder={`Enter ${newFeedLocation} stock`}
                  />
                  {errors.stock && (
                    <p className="mt-1 text-sm text-red-400">{errors.stock.message}</p>
                  )}
                </div>
              </>
            )}

            {editingFeed && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Stock location
                  </label>
                  <select
                    value={editFeedLocation}
                    onChange={(e) => {
                      const loc = e.target.value as 'shop' | 'godown'
                      setEditFeedLocation(loc)
                      const total = (watch('shopStock') || 0) + (watch('godownStock') || 0)
                      setValue('shopStock', loc === 'shop' ? total : 0)
                      setValue('godownStock', loc === 'godown' ? total : 0)
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  >
                    <option value="godown">Godown</option>
                    <option value="shop">Shop</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">
                    Feed stock is in one location only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {editFeedLocation === 'shop' ? 'Shop' : 'Godown'} stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFeedLocation === 'shop' ? watch('shopStock') ?? '' : watch('godownStock') ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setValue(editFeedLocation === 'shop' ? 'shopStock' : 'godownStock', val)
                      setValue(editFeedLocation === 'shop' ? 'godownStock' : 'shopStock', 0)
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder={`Enter ${editFeedLocation} stock`}
                  />
                  {editFeedLocation === 'shop' && errors.shopStock && (
                    <p className="mt-1 text-sm text-red-400">{errors.shopStock.message}</p>
                  )}
                  {editFeedLocation === 'godown' && errors.godownStock && (
                    <p className="mt-1 text-sm text-red-400">{errors.godownStock.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-4">
              {editingFeed && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedToDelete(editingFeed)
                    setDeleteConfirmOpen(true)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Feed
                </button>
              )}
              {!editingFeed && <div></div>}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingFeed(null)
                    setEditFeedLocation('godown')
                    reset()
                  }}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingFeed ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </Modal>


        <ConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Feed"
          message="Are you sure you want to delete this feed? It will be hidden from the list but not permanently deleted."
          confirmLabel="Yes, delete"
          cancelLabel="No"
          variant="danger"
          isLoading={isDeletingFeed}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
            <div className="text-sm text-slate-400">
              Showing {startIndex + 1} to {Math.min(endIndex, feedsList.length)} of {feedsList.length} feeds
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

