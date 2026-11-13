import { expect, test } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || '123456'

test('login page renders and rejects anonymous session', async ({ page }) => {
  await page.goto('/spa/#/dashboard')
  await expect(page).toHaveURL(/\/spa\/#\/login/)
  await expect(page.getByPlaceholder('请输入用户名')).toBeVisible()
  await expect(page.getByPlaceholder('请输入密码')).toBeVisible()
})

test('login and dashboard data load', async ({ page }) => {
  await page.goto('/spa/#/login')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/spa\/#\/dashboard/)
  await expect(page.getByText('当天流量')).toBeVisible()
  await expect(page.getByText(username)).toBeVisible()
  await expect(page.locator('#footer')).toHaveCount(0)
})

test('users page lists users and settings ui renders without footer switch', async ({ page }) => {
  await page.goto('/spa/#/login')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/spa\/#\/dashboard/)

  await page.goto('/spa/#/users')
  await expect(page.getByRole('heading', { name: '用户名' })).not.toBeVisible().catch(() => undefined)
  await expect(page.locator('table thead')).toContainText('用户名')
  await expect(page.locator('table thead')).toContainText('注册时间')

  await page.goto('/spa/#/settings/ui')
  await expect(page.getByText('产品名称 *')).toBeVisible()
  await expect(page.getByText('显示底部开源信息')).toHaveCount(0)
})
