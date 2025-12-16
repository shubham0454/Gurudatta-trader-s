import { getCached, setCached, invalidateCache } from './cache'

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
}

