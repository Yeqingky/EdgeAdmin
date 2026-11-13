import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, PriorCheckbox } from './editors'
import type { LocationBaseData } from './types'

interface FirewallConfig {
  isPrior: boolean
  isOn: boolean
  firewallPolicyId: number
  ignoreGlobalRules: boolean
  defaultCaptchaType: string
}

interface FirewallPolicy {
  id: number
  name: string
  isOn: boolean
  mode: string
  modeInfo: { code: string; name: string } | null
  captchaOptions?: { geeTestConfig?: { isOn: boolean } } | null
}

interface WafData extends LocationBaseData {
  webId: number
  firewallConfig: FirewallConfig | null
  firewallPolicy: FirewallPolicy | null
}

const CAPTCHA_TYPES: Array<{ code: string; name: string; description: string }> = [
  { code: 'default', name: '验证码', description: '通过输入验证码来验证人机。' },
  { code: 'oneClick', name: '点击验证', description: '通过点击界面元素来验证人机。' },
  { code: 'slide', name: '滑动解锁', description: '通过滑动方块解锁来验证人机。' },
  { code: 'geetest', name: '极验-行为验', description: '使用极验-行为验提供的人机验证方式。' },
]

function normalizeConfig(config: FirewallConfig | null): FirewallConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    firewallPolicyId: config?.firewallPolicyId ?? 0,
    ignoreGlobalRules: config?.ignoreGlobalRules ?? false,
    defaultCaptchaType: config?.defaultCaptchaType || 'none',
  }
}

export function WafPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<WafData>('/servers/server/settings/locations/waf', 'location-waf')
  const [config, setConfig] = useState<FirewallConfig>(normalizeConfig(null))
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      const next = normalizeConfig(query.data.firewallConfig)
      const geeTestIsOn = query.data.firewallPolicy?.captchaOptions?.geeTestConfig?.isOn ?? false
      if (!geeTestIsOn && next.defaultCaptchaType === 'geetest') {
        next.defaultCaptchaType = 'none'
      }
      setConfig(next)
    }
  }, [query.data])

  if (locationId === 0) {
    return <MissingLocation />
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const policy = query.data.firewallPolicy
  const geeTestIsOn = policy?.captchaOptions?.geeTestConfig?.isOn ?? false
  const captchaTypes = CAPTCHA_TYPES.filter((type) => type.code !== 'geetest' || geeTestIsOn)
  const currentCaptcha = CAPTCHA_TYPES.find((type) => type.code === config.defaultCaptchaType)
  const modeClass = policy?.modeInfo
    ? policy.modeInfo.code === 'defend'
      ? 'green'
      : policy.modeInfo.code === 'observe'
        ? 'blue'
        : 'grey'
    : ''

  function update(patch: Partial<FirewallConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/waf', {
        webId: query.data.webId,
        firewallJSON: JSON.stringify(config),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-waf', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocationShell data={query.data}>
      <form className="ui form" onSubmit={submit}>
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">全局WAF策略</td>
              <td>
                {policy ? (
                  <div>
                    {policy.name}{' '}
                    {policy.modeInfo ? (
                      <span className={modeClass}>
                        &nbsp;[{policy.modeInfo.name}]&nbsp;
                      </span>
                    ) : null}
                    <a href={`#/servers/components/waf/policy?firewallPolicyId=${policy.id}`} title="查看策略">
                      [查看]
                    </a>
                    <p className="comment">当前网站所在集群的设置。</p>
                  </div>
                ) : (
                  <span className="red">当前集群没有设置WAF策略，当前配置无法生效。</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <FormTable>
          <PriorCheckbox checked={config.isPrior} onChange={(isPrior) => update({ isPrior })} />
          {config.isPrior ? (
            <tbody>
              <FormRow title="启用Web防火墙">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
                <p className="comment">选中后，表示启用当前网站的WAF功能。</p>
              </FormRow>
            </tbody>
          ) : null}
          {config.isOn ? (
            <tbody>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {config.isOn && moreOptionsVisible ? (
            <tbody>
              <FormRow title="人机识别验证方式">
                <select className="ui dropdown auto-width" value={config.defaultCaptchaType} onChange={(event) => update({ defaultCaptchaType: event.target.value })}>
                  <option value="none">默认</option>
                  {captchaTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="comment">
                  {config.defaultCaptchaType === 'none'
                    ? '使用系统默认的设置。你需要在入站规则中添加规则集来决定哪些请求需要人机识别验证。'
                    : `${currentCaptcha?.description || ''}你需要在入站规则中添加规则集来决定哪些请求需要人机识别验证。`}
                </p>
              </FormRow>
              <FormRow title="启用系统全局规则">
                <Checkbox checked={!config.ignoreGlobalRules} onChange={(checked) => update({ ignoreGlobalRules: !checked })} />
                <p className="comment">选中后，表示使用系统全局WAF策略中定义的规则。</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
