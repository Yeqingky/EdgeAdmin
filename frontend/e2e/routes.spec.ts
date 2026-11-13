import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || '123456'

function collectRoutes(): string[] {
  const dir = path.join(process.cwd(), 'src/pages')
  const files: string[] = []
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name === 'routes.tsx') {
        files.push(full)
      }
    }
  }
  walk(dir)
  const routes = new Set<string>()
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(/path:\s*'([^']+)'/g)) {
      routes.add(match[1])
    }
  }
  const app = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')
  for (const match of app.matchAll(/path="([^"]+)"/g)) {
    if (match[1].startsWith('/')) {
      routes.add(match[1])
    }
  }
  return [...routes].filter((route) => !route.startsWith('/login') && !route.startsWith('/setup') && !route.startsWith('/recover') && route !== '/index')
}

async function login(page: Page) {
  await page.goto('/spa/#/login')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/spa\/#\/dashboard/)
}

test('every registered route renders without the migration placeholder', async ({ page }) => {
  test.setTimeout(15 * 60 * 1000)
  await login(page)
  const routes = collectRoutes()
  const failed: string[] = []
  for (const route of routes) {
    await page.goto(`/spa/#${route}`)
    await page.waitForTimeout(120)
    const body = await page.locator('body').innerText()
    if (body.includes('正在迁移中')) {
      failed.push(route)
    }
  }
  expect(failed, `routes still using placeholder:\n${failed.join('\n')}`).toEqual([])
})
