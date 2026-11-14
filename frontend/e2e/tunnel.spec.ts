import { expect, test } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || '123456'

test('a tunnel can be selected and retained by a website origin', async ({ page }) => {
  const suffix = Date.now().toString()
  const tunnelName = `e2e-tunnel-${suffix}`
  const domain = `e2e-${suffix}.example.com`

  await page.goto('/login')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto('/clusters/cluster/settings/frp?clusterId=1')
  await page.getByRole('row').filter({ hasText: '启用 FRP' }).getByRole('checkbox').check()
  await page.getByRole('row').filter({ hasText: '认证 Token' }).getByRole('textbox').fill('e2e-cluster-token')
  await page.getByRole('button', { name: '保存' }).click()

  await page.goto('/tunnels/nodes/create')
  await page.getByRole('row').filter({ hasText: '名称' }).getByRole('textbox').fill(tunnelName)
  await page.getByRole('button', { name: '创建' }).click()
  await expect(page.getByRole('heading', { name: 'Linux 安装' })).toBeVisible()

  await page.goto('/servers/create')
  await page.getByRole('row').filter({ hasText: '所属用户' }).getByRole('combobox').selectOption({ label: `${username}(${username})` })
  await page.getByText('[添加源站地址]').click()
  const tunnelSelect = page.getByRole('row').filter({ hasText: 'Tunnel' }).getByRole('combobox')
  await tunnelSelect.selectOption({ label: tunnelName })
  await page.getByRole('row').filter({ hasText: '源站地址' }).getByRole('textbox').fill('127.0.0.1:18080')
  await page.getByRole('button', { name: '保存' }).last().click()
  await page.getByText('[添加域名]').click()
  await page.getByRole('row').filter({ hasText: '单个域名' }).getByRole('textbox').fill(domain)
  await page.getByRole('button', { name: '保存' }).last().click()
  await expect(page.getByRole('row').filter({ hasText: '单个域名' })).toBeHidden()
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByRole('link', { name: domain })).toBeVisible()

  await page.getByRole('link', { name: domain }).click()
  await page.getByRole('link', { name: '设置', exact: true }).last().click()
  await page.locator('a[href^="/servers/server/settings/reverseProxy?"]').click()
  await page.getByRole('link', { name: '修改', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Tunnel' }).locator('option:checked')).toHaveText(tunnelName)
})
