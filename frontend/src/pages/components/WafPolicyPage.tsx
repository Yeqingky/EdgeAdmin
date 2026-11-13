import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { postFormValues, WafMenu, type ClusterOption, type WafPolicyDetail, type WafPolicyLogConfig, type WafUpgradeItem } from './common'

interface WafPolicyData {
  firewallPolicy: WafPolicyDetail
  upgradeItems: WafUpgradeItem[]
  clusters: ClusterOption[]
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

function OptionsSummary({ options }: { options: Record<string, unknown> | null }) {
  if (!options) {
    return <span className="disabled">未配置</span>
  }
  const entries = Object.entries(options).filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== 0)
  if (entries.length === 0) {
    return <span className="disabled">未配置</span>
  }
  return (
    <table className="ui table very basic compact">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td style={{ width: '14em' }}>{key}</td>
            <td style={{ wordBreak: 'break-all' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function WafPolicyPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-policy', firewallPolicyId],
    queryFn: () => apiGet<WafPolicyData>('/servers/components/waf/policy', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const policy = data.firewallPolicy
  const synFlood = policy.synFlood as
    | { isOn?: boolean; minAttempts?: number; timeoutSeconds?: number; ignoreLocal?: boolean }
    | null
  const log = policy.log as WafPolicyLogConfig | null

  async function upgradeTemplate() {
    if (!(await confirm({ message: '确定要加入官方提供的新规则吗？' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/waf/upgradeTemplate', { policyId: firewallPolicyId })
      toast('升级成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-policy', firewallPolicyId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '升级失败', 'error')
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="index"
      />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">策略名称</td>
            <td>{policy.name}</td>
          </tr>
          <tr>
            <td>状态</td>
            <td>
              {!policy.isOn ? (
                <span className="red">已停用</span>
              ) : policy.modeInfo ? (
                <>
                  <span
                    className={
                      policy.modeInfo.code === 'defend' ? 'green' : policy.modeInfo.code === 'observe' ? 'blue' : 'grey'
                    }
                  >
                    {policy.modeInfo.name}
                  </span>
                  <p className="comment">{policy.modeInfo.description}</p>
                </>
              ) : null}
            </td>
          </tr>
          <tr>
            <td>预置的规则分组</td>
            <td>
              {policy.groups.map((group, index) => (
                <span key={`${group.name}-${index}`} className={`ui label tiny basic${group.isOn ? '' : ' disabled'}`} style={{ marginBottom: '0.5em' }}>
                  {group.name}
                </span>
              ))}
              {data.upgradeItems.length > 0 ? (
                <div>
                  <div className="ui divider" />
                  <span className="red">
                    升级提醒：官方提供了新的规则，是否要加入以下规则：
                    {data.upgradeItems.map((item, index) => (
                      <span key={`${item.name}-${index}`} className="ui label tiny basic" style={{ marginBottom: '0.2em' }}>
                        {item.name}
                        {!item.isOn ? <span className="small">（默认不启用）</span> : null}
                      </span>
                    ))}
                  </span>
                  &nbsp; &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void upgradeTemplate()
                    }}
                  >
                    [加入]
                  </a>
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>

      <h4>动作配置</h4>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">阻止动作设置</td>
            <td>
              <OptionsSummary options={policy.blockOptions} />
            </td>
          </tr>
          <tr>
            <td className="title">显示页面动作设置</td>
            <td>
              <OptionsSummary options={policy.pageOptions} />
            </td>
          </tr>
          <tr>
            <td>人机识别动作配置</td>
            <td>
              <OptionsSummary options={policy.captchaOptions} />
            </td>
          </tr>
          <tr>
            <td>JSCookie动作配置</td>
            <td>
              <OptionsSummary options={policy.jsCookieOptions} />
            </td>
          </tr>
          <tr>
            <td>使用系统防火墙</td>
            <td>
              {policy.useLocalFirewall ? <span className="green">启用</span> : <span className="disabled">不启用</span>}
              {policy.useLocalFirewall ? <p className="comment">可以在合适的时候自动使用系统自带防火墙进行防御。</p> : null}
            </td>
          </tr>
        </tbody>
      </table>

      <h4>日志配置</h4>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className={`title${log && log.isOn ? ' color-border' : ''}`}>记录访问日志</td>
            <td>
              {!log || !log.isOn ? <span>默认</span> : <span className="green">开启</span>}
            </td>
          </tr>
          {log && log.isOn ? (
            <>
              <tr>
                <td className="color-border">记录请求Body</td>
                <td>{log.requestBody ? <span className="green">开启</span> : <span>默认</span>}</td>
              </tr>
              <tr>
                <td className="color-border">记录区域封禁日志</td>
                <td>{log.regionDenying ? <span className="green">开启</span> : <span>不记录</span>}</td>
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
              {policy.denyCountryHTML ? <span>自定义</span> : <span className="disabled">使用默认</span>}
            </td>
          </tr>
          <tr>
            <td>省份封禁默认提示内容</td>
            <td>
              {policy.denyProvinceHTML ? <span>自定义</span> : <span className="disabled">使用默认</span>}
            </td>
          </tr>
        </tbody>
      </table>

      <h4>其他配置</h4>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">SYN Flood防御</td>
            <td>
              {!synFlood || !synFlood.isOn ? (
                <span className="disabled">未启用</span>
              ) : (
                <span>
                  启用（最小尝试次数：{synFlood.minAttempts || 0}/分钟，超时：{synFlood.timeoutSeconds || 0}秒，
                  {synFlood.ignoreLocal ? '忽略局域网IP' : '不忽略局域网IP'}）
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td>最多检查内容尺寸</td>
            <td>
              {policy.maxRequestBodySize === 0 ? (
                <span className="disabled">使用默认</span>
              ) : (
                <span>{policy.maxRequestBodySizeFormat}</span>
              )}
            </td>
          </tr>
          <tr>
            <td>描述</td>
            <td>{policy.description ? policy.description : <span className="disabled">暂时还没有描述。</span>}</td>
          </tr>
        </tbody>
      </table>

      <h4>使用此策略的集群</h4>
      {data.clusters.length === 0 ? <p className="comment">暂时还没有集群使用此策略。</p> : null}
      {data.clusters.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {data.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td>
                  {cluster.name}
                  <a href={`/clusters/cluster?clusterId=${cluster.id}`} style={{ marginLeft: '0.5em' }}>
                    <Link2 size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
