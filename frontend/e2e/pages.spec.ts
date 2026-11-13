import { expect, test, type Page } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || '123456'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('user create page renders', async ({ page }) => {
  await login(page)
  await page.goto('/users/create')
  await expect(page.getByRole('heading', { name: '创建用户' })).toBeVisible()
  await expect(page.getByText('关联集群 *')).toBeVisible()
})

test('admin and db and log pages render', async ({ page }) => {
  await login(page)

  await page.goto('/admins')
  await expect(page.getByText('[创建管理员]')).toBeVisible()

  await page.goto('/db')
  await expect(page.getByText('[添加节点]')).toBeVisible()

  await page.goto('/log')
  await expect(page.getByText('操作日志')).toBeVisible()
  await expect(page.getByText('日志设置')).toBeVisible()
})

test('user detail and access keys render', async ({ page }) => {
  await login(page)
  await page.goto('/users')
  const firstDetail = page.locator('table tbody tr a', { hasText: '详情' }).first()
  if (await firstDetail.count()) {
    await firstDetail.click()
    await expect(page.getByText('用户详情')).toBeVisible()
    await page.goto('/users/accesskeys?userId=1')
    await expect(page.getByText('[创建AccessKey]')).toBeVisible()
  }
})

test('setup route either renders the wizard or redirects to login when configured', async ({ page }) => {
  await page.goto('/setup')
  await expect(
    page.getByRole('button', { name: '开始' }).or(page.getByPlaceholder('请输入用户名')),
  ).toBeVisible()
})
