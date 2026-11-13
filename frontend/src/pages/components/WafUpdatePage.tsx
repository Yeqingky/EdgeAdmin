import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { formatBytes } from '../../utils/format'
import { postFormValues, WafMenu, type WafModeInfo } from './common'

interface WafUpdateGroup {
  code: string
  name: string
  isOn: boolean
}

interface WafUpdatePolicy {
  id: number
  name: string
  description: string
  isOn: boolean
  mode: string
  blockOptions: Record<string, unknown>
  pageOptions: Record<string, unknown>
  captchaOptions: Record<string, unknown> | null
  jsCookieOptions: Record<string, unknown> | null
  useLocalFirewall: boolean
  synFloodConfig: Record<string, unknown>
  log: Record<string, unknown>
  maxRequestBodySize: string
  denyCountryHTML: string
  denyProvinceHTML: string
}

interface WafUpdateData {
  firewallPolicy: WafUpdatePolicy
  modes: WafModeInfo[]
  groups: WafUpdateGroup[]
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

export function WafUpdatePage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['waf-update', firewallPolicyId],
    queryFn: () => apiGet<WafUpdateData>('/servers/components/waf/update', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const [policy, setPolicy] = useState<WafUpdatePolicy | null>(null)
  const [groupCodes, setGroupCodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setPolicy(query.data.firewallPolicy)
      setGroupCodes(query.data.groups.filter((group) => group.isOn).map((group) => group.code))
    }
  }, [query.data])

  if (query.isLoading || !policy) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const blockOptions = policy.blockOptions || {}
  const pageOptions = policy.pageOptions || {}
  const captchaOptions = policy.captchaOptions || {}
  const jsCookieOptions = policy.jsCookieOptions || {}
  const synFloodConfig = policy.synFloodConfig || {}
  const logConfig = policy.log || {}

  function update(patch: Partial<WafUpdatePolicy>) {
    setPolicy((current) => (current ? { ...current, ...patch } : current))
  }

  function patchOptions(
    key: 'blockOptions' | 'pageOptions' | 'captchaOptions' | 'jsCookieOptions' | 'synFloodConfig' | 'log',
    optionKey: string,
    value: unknown,
  ) {
    setPolicy((current) => {
      if (!current) {
        return current
      }
      const currentOptions = (current[key] || {}) as Record<string, unknown>
      return { ...current, [key]: { ...currentOptions, [optionKey]: value } }
    })
  }

  async function submit() {
    if (!policy) {
      return
    }
    if (!policy.name.trim()) {
      toast('请输入策略名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postFormValues('/servers/components/waf/update', {
        firewallPolicyId,
        name: policy.name,
        groupCodes,
        blockOptionsJSON: JSON.stringify(policy.blockOptions || {}),
        pageOptionsJSON: JSON.stringify(policy.pageOptions || {}),
        captchaOptionsJSON: JSON.stringify(policy.captchaOptions || {}),
        jsCookieOptionsJSON: JSON.stringify(policy.jsCookieOptions || {}),
        description: policy.description,
        isOn: policy.isOn ? 1 : '',
        mode: policy.mode,
        useLocalFirewall: policy.useLocalFirewall ? 1 : '',
        synFloodJSON: JSON.stringify(policy.synFloodConfig || {}),
        logJSON: JSON.stringify(policy.log || {}),
        maxRequestBodySize: Number(policy.maxRequestBodySize) || 0,
        denyCountryHTML: policy.denyCountryHTML,
        denyProvinceHTML: policy.denyProvinceHTML,
      })
      toast('保存成功')
      navigate(`/servers/components/waf/policy?firewallPolicyId=${firewallPolicyId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="update"
      />

      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">策略名称 *</td>
              <td>
                <input type="text" maxLength={100} value={policy.name} onChange={(event) => update({ name: event.target.value })} autoFocus />
                <p className="comment">给策略起一个容易识别的名字.</p>
              </td>
            </tr>
            <tr>
              <td>当前模式</td>
              <td>
                <select className="ui dropdown auto-width" value={policy.mode} onChange={(event) => update({ mode: event.target.value })}>
                  {data.modes.map((mode) => (
                    <option key={mode.code} value={mode.code}>
                      {mode.name}
                    </option>
                  ))}
                </select>
                {data.modes
                  .filter((mode) => mode.code === policy.mode)
                  .map((mode) => (
                    <p key={mode.code} className="comment">
                      {mode.description}
                    </p>
                  ))}
              </td>
            </tr>
            <tr>
              <td>启用预置的规则</td>
              <td>
                {data.groups.map((group) => (
                  <div key={group.code} className="ui checkbox" style={{ width: '10em', marginBottom: '0.5em' }}>
                    <input
                      type="checkbox"
                      checked={groupCodes.includes(group.code)}
                      onChange={(event) =>
                        setGroupCodes((current) =>
                          event.target.checked ? [...current, group.code] : current.filter((code) => code !== group.code),
                        )
                      }
                    />
                    <label>{group.name}</label>
                  </div>
                ))}
                <p className="comment">可以启用一些我们预置的规则组.</p>
              </td>
            </tr>
          </tbody>
        </table>

        <h4>动作配置</h4>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">阻止动作配置</td>
              <td>
                <div className="ui fields inline">
                  <div className="ui field">
                    <label>状态码</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(blockOptions.statusCode ?? '')}
                      onChange={(event) => patchOptions('blockOptions', 'statusCode', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">
                    <label>封禁时长</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(blockOptions.timeout ?? '')}
                      onChange={(event) => patchOptions('blockOptions', 'timeout', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                  <div className="ui field">
                    <label>最大封禁时长</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(blockOptions.timeoutMax ?? '')}
                      onChange={(event) => patchOptions('blockOptions', 'timeoutMax', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                  <div className="ui field">
                    <label>作用范围</label>
                    <select
                      className="ui dropdown"
                      value={String(blockOptions.scope ?? 'global')}
                      onChange={(event) => patchOptions('blockOptions', 'scope', event.target.value)}
                    >
                      <option value="global">全局</option>
                      <option value="service">当前网站</option>
                    </select>
                  </div>
                </div>
                <textarea
                  rows={3}
                  placeholder="阻止动作返回内容"
                  value={String(blockOptions.body ?? '')}
                  onChange={(event) => patchOptions('blockOptions', 'body', event.target.value)}
                />
                <div className="ui checkbox" style={{ marginTop: '0.5em' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(blockOptions.failBlockScopeAll)}
                    onChange={(event) => patchOptions('blockOptions', 'failBlockScopeAll', event.target.checked)}
                  />
                  <label>全局生效</label>
                </div>
              </td>
            </tr>
            <tr>
              <td>显示页面动作配置</td>
              <td>
                <div className="ui fields inline">
                  <div className="ui field">
                    <label>状态码</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(pageOptions.status ?? '')}
                      onChange={(event) => patchOptions('pageOptions', 'status', Number(event.target.value) || 0)}
                    />
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="页面内容"
                  value={String(pageOptions.body ?? '')}
                  onChange={(event) => patchOptions('pageOptions', 'body', event.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td>人机识别动作配置</td>
              <td>
                <div className="ui fields inline">
                  <div className="ui field">
                    <label>有效期</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(captchaOptions.life ?? '')}
                      onChange={(event) => patchOptions('captchaOptions', 'life', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                  <div className="ui field">
                    <label>最大失败次数</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(captchaOptions.maxFails ?? '')}
                      onChange={(event) => patchOptions('captchaOptions', 'maxFails', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">
                    <label>失败拦截时间</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(captchaOptions.failBlockTimeout ?? '')}
                      onChange={(event) => patchOptions('captchaOptions', 'failBlockTimeout', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td>JSCookie动作配置</td>
              <td>
                <div className="ui fields inline">
                  <div className="ui field">
                    <label>有效期</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(jsCookieOptions.life ?? '')}
                      onChange={(event) => patchOptions('jsCookieOptions', 'life', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                  <div className="ui field">
                    <label>最大失败次数</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(jsCookieOptions.maxFails ?? '')}
                      onChange={(event) => patchOptions('jsCookieOptions', 'maxFails', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">
                    <label>失败拦截时间</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(jsCookieOptions.failBlockTimeout ?? '')}
                      onChange={(event) => patchOptions('jsCookieOptions', 'failBlockTimeout', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <h4>日志配置</h4>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className={`title${logConfig.isOn ? ' color-border' : ''}`}>记录访问日志</td>
              <td>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(logConfig.isOn)}
                    onChange={(event) => patchOptions('log', 'isOn', event.target.checked)}
                  />
                  <label />
                </div>
                <p className="comment">选中后,总是记录WAF相关访问日志,即使服务中没有开启访问日志.</p>
              </td>
            </tr>
            {logConfig.isOn ? (
              <>
                <tr>
                  <td className="color-border">记录请求Body</td>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(logConfig.requestBody)}
                        onChange={(event) => patchOptions('log', 'requestBody', event.target.checked)}
                      />
                      <label />
                    </div>
                    <p className="comment">选中后,表示在访问日志中记录匹配的请求内容.注意:此选项会明显增加访问日志占用空间,请谨慎开启.</p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">记录区域封禁日志</td>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(logConfig.regionDenying)}
                        onChange={(event) => patchOptions('log', 'regionDenying', event.target.checked)}
                      />
                      <label />
                    </div>
                    <p className="comment">选中后,表示在访问日志中记录区域封禁(地区和省份)事件.</p>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <h4>区域封禁设置</h4>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">区域封禁默认提示内容</td>
              <td>
                <textarea
                  rows={3}
                  value={policy.denyCountryHTML}
                  onChange={(event) => update({ denyCountryHTML: event.target.value })}
                />
                <p className="comment">当客户端所在区域被封禁时提示页面的HTML内容;不填则表示使用默认的提示内容;支持请求变量.</p>
              </td>
            </tr>
            <tr>
              <td>省份封禁默认提示内容</td>
              <td>
                <textarea
                  rows={3}
                  value={policy.denyProvinceHTML}
                  onChange={(event) => update({ denyProvinceHTML: event.target.value })}
                />
                <p className="comment">当客户端所在省份被封禁时提示页面的HTML内容;不填则表示使用默认的提示内容;支持请求变量.</p>
              </td>
            </tr>
          </tbody>
        </table>

        <h4>其他配置</h4>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">使用系统防火墙</td>
              <td>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={policy.useLocalFirewall}
                    onChange={(event) => update({ useLocalFirewall: event.target.checked })}
                  />
                  <label />
                </div>
                <p className="comment">
                  开启后,可以在合适的时候自动使用系统自带防火墙进行防御;建议在每个边缘节点都安装nftables以提升封禁性能.
                </p>
              </td>
            </tr>
            <tr>
              <td>SYN Flood防御</td>
              <td>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(synFloodConfig.isOn)}
                    onChange={(event) => patchOptions('synFloodConfig', 'isOn', event.target.checked)}
                  />
                  <label>启用</label>
                </div>
                <div className="ui fields inline" style={{ marginTop: '0.5em' }}>
                  <div className="ui field">
                    <label>最小尝试次数/分钟</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(synFloodConfig.minAttempts ?? '')}
                      onChange={(event) => patchOptions('synFloodConfig', 'minAttempts', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">
                    <label>拦截超时时间</label>
                    <input
                      type="number"
                      style={{ width: '8em' }}
                      value={String(synFloodConfig.timeoutSeconds ?? '')}
                      onChange={(event) => patchOptions('synFloodConfig', 'timeoutSeconds', Number(event.target.value) || 0)}
                    />
                    <span className="small">秒</span>
                  </div>
                </div>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(synFloodConfig.ignoreLocal)}
                    onChange={(event) => patchOptions('synFloodConfig', 'ignoreLocal', event.target.checked)}
                  />
                  <label>忽略局域网IP</label>
                </div>
              </td>
            </tr>
            <tr>
              <td>最多检查内容尺寸</td>
              <td>
                <div className="ui input right labeled">
                  <input
                    type="text"
                    style={{ width: '10em' }}
                    maxLength={10}
                    value={policy.maxRequestBodySize}
                    onChange={(event) => update({ maxRequestBodySize: event.target.value })}
                  />
                  <span className="ui label">字节</span>
                </div>
                <p className="comment">
                  {Number(policy.maxRequestBodySize) > 0 ? `当前:${formatBytes(Number(policy.maxRequestBodySize))}.` : ''}
                  WAF能够分析的最大文件内容尺寸,0表示默认,默认为512K;此值越大,对应使用的系统内存越多.
                </p>
              </td>
            </tr>
            <tr>
              <td>描述</td>
              <td>
                <textarea rows={3} value={policy.description} onChange={(event) => update({ description: event.target.value })} />
              </td>
            </tr>
            <tr>
              <td>启用当前策略</td>
              <td>
                <div className="ui checkbox">
                  <input type="checkbox" checked={policy.isOn} onChange={(event) => update({ isOn: event.target.checked })} />
                  <label />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
