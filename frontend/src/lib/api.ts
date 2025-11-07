/**
 * API Client Utilities
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: {
    user_id: string
    email: string
    plan: 'free' | 'pro'
  }
}

export interface Link {
  slug: string
  destination: string
  custom_domain?: string
  created_at: string
  expires_at?: string
  click_count: number
}

export interface ShortenRequest {
  url: string
  custom_slug?: string
  custom_domain?: string
  expires_at?: string
  password?: string
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

/**
 * Store auth tokens
 */
export function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

/**
 * Clear auth tokens
 */
export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

/**
 * Get stored user
 */
export function getUser() {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Store user
 */
export function storeUser(user: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
}

/**
 * API request wrapper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = getAccessToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data as T
}

/**
 * Sign up
 */
export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })

  storeTokens(response.access_token, response.refresh_token)
  storeUser(response.user)

  return response
}

/**
 * Login
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  storeTokens(response.access_token, response.refresh_token)
  storeUser(response.user)

  return response
}

/**
 * Logout
 */
export async function logout() {
  const refreshToken = getRefreshToken()

  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  clearTokens()
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await apiRequest<{ access_token: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  storeTokens(response.access_token, refreshToken)
  return response.access_token
}

/**
 * Shorten URL
 */
export async function shortenUrl(request: ShortenRequest) {
  return apiRequest<{ slug: string; short_url: string; expires_in?: number }>(
    '/api/shorten',
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
}

/**
 * Get user's links
 */
export async function getLinks(): Promise<{ links: Link[]; total: number }> {
  return apiRequest<{ links: Link[]; total: number }>('/api/links')
}

/**
 * Update link
 */
export async function updateLink(slug: string, destination: string) {
  return apiRequest(`/api/links/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ destination }),
  })
}

/**
 * Delete link
 */
export async function deleteLink(slug: string) {
  return apiRequest(`/api/links/${slug}`, {
    method: 'DELETE',
  })
}

/**
 * Get link stats
 */
export async function getLinkStats(slug: string) {
  return apiRequest(`/api/stats/${slug}`)
}
