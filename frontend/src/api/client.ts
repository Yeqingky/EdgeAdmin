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
  return (await parse<T>(resp)).data
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
  return (await parse<T>(resp)).data
}

export async function getCsrfToken(): Promise<string> {
  const data = await apiGet<{ token: string }>('/csrf/token')
  return data.token
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
