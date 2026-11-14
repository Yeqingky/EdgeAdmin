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

test('sidebar expands at most current group plus one', async ({ page }) => {
  await login(page)
  const headers = page.locator('.main-menu .item.module-item[role="button"]')
  const sites = headers.nth(0)
  const dns = headers.nth(2)
  const users = headers.nth(3)

  // 子列表页面: 当前分组自动展开
  await page.goto('/servers')
  await expect(sites).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.main-menu .sub-items a[href="/servers"]')).toBeVisible()

  // 展开另一个分组: 两个同时展开
  await users.click()
  await expect(users).toHaveAttribute('aria-expanded', 'true')
  await expect(sites).toHaveAttribute('aria-expanded', 'true')

  // 展开第三个分组: 用户管理收起, 网站列表保持
  await dns.click()
  await expect(dns).toHaveAttribute('aria-expanded', 'true')
  await expect(users).toHaveAttribute('aria-expanded', 'false')
  await expect(sites).toHaveAttribute('aria-expanded', 'true')

  // 点击当前分组: 可以收起
  await sites.click()
  await expect(sites).toHaveAttribute('aria-expanded', 'false')
  await expect(dns).toHaveAttribute('aria-expanded', 'true')

  // 刷新后当前分组自动展开, 其他分组收起
  await page.reload()
  await expect(sites).toHaveAttribute('aria-expanded', 'true')
  await expect(dns).toHaveAttribute('aria-expanded', 'false')

  // 非子列表页面: 最多展开一个
  await page.goto('/log')
  await expect(sites).toHaveAttribute('aria-expanded', 'false')
  await users.click()
  await expect(users).toHaveAttribute('aria-expanded', 'true')
  await dns.click()
  await expect(dns).toHaveAttribute('aria-expanded', 'true')
  await expect(users).toHaveAttribute('aria-expanded', 'false')
})
