import { getCached, setCached, invalidateCache } from './cache'

// Custom error class for network errors
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = false
): Promise<Response> {
  const token = localStorage.getItem('token')

  // Check cache for GET requests
  if (useCache && options.method === undefined || options.method === 'GET') {
    const cached = getCached(endpoint)
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  try {
  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return response
  }

  // Cache successful GET responses
  if (useCache && response.ok && (options.method === undefined || options.method === 'GET')) {
    const data = await response.clone().json()
    setCached(endpoint, data)
  }

  // Invalidate cache on mutations
  if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    // Invalidate related caches
    if (endpoint.includes('/bills')) {
      invalidateCache('/api/bills')
      invalidateCache('/api/dashboard/stats')
    }
    if (endpoint.includes('/users')) {
      invalidateCache('/api/users')
      invalidateCache('/api/dashboard/stats')
    }
    if (endpoint.includes('/feeds')) {
      invalidateCache('/api/feeds')
    }
  }

  return response
  } catch (error: any) {
    // Handle network errors (no internet connection, server unreachable, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - no internet connection or server unreachable
      const networkError = new NetworkError(
        'Network Error: No internet connection or server unreachable. Please check your internet connection and try again.'
      )
      throw networkError
    }
    
    // Handle other fetch errors
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      const networkError = new NetworkError(
        'Network Error: Unable to connect to the server. Please check your internet connection and try again.'
      )
      throw networkError
    }
    
    // Re-throw other errors
    throw error
  }
}

