import type { ApiResponse } from './types'

export class ApiError extends Error {
  code: number

  constructor(message: string, code = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super('请先登录', 401)
    this.name = 'UnauthorizedError'
  }
}

async function parse<T>(resp: Response): Promise<ApiResponse<T>> {
  if (resp.status === 401) {
    throw new UnauthorizedError()
  }
  const contentType = resp.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new UnauthorizedError()
  }
  const body = (await resp.json()) as ApiResponse<T>
  if (body.code !== 200) {
    throw new ApiError(body.message || '请求失败', body.code)
  }
  return body
}

function withJsonFormat(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_format=json`
}

function redirectToLogin(url: string) {
  if (url === '/' || url.startsWith('/api/login') || url.startsWith('/login/')) {
    return
  }
  if (window.location.hash.startsWith('#/login')) {
    return
  }
  window.location.assign('/spa/#/login')
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const search = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value))
      }
    }
  }
  const target = withJsonFormat(url) + (search.size > 0 ? `&${search.toString()}` : '')
  const resp = await fetch(target, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  try {
    return (await parse<T>(resp)).data
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToLogin(url)
    }
    throw error
  }
}

export async function apiPost<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const body = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          body.append(key, String(item))
        }
      } else {
        body.set(key, String(value))
      }
    }
  }
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  try {
    return (await parse<T>(resp)).data
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToLogin(url)
    }
    throw error
  }
}

let cachedCsrfToken: { token: string; timestamp: number } | null = null

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken && Date.now() - cachedCsrfToken.timestamp < 10 * 60 * 1000) {
    return cachedCsrfToken.token
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await apiGet<{ token: string }>('/csrf/token')
      cachedCsrfToken = { token: data.token, timestamp: Date.now() }
      return data.token
    } catch (error) {
      if (attempt === 0 && error instanceof ApiError && error.message.includes('请求速度过快')) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200))
        continue
      }
      throw error
    }
  }
}

export async function apiPostForm<T>(url: string, form: FormData): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: form,
  })
  return (await parse<T>(resp)).data
}
