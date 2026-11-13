import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '../../../../api/client'
import { Checkbox } from '../../../../components/form'
import { useConfirm } from '../../../../components/Confirm'
import { useToast } from '../../../../components/Toast'
import { LoadingBlock } from '../../../../components/LoadingBlock'
import {
  CapacityInput,
  GroupSecondMenu,
  Modal,
  StringListInput,
  postForm,
  type CapacityValue,
  type GroupBasic,
  type LeftMenuItem,
} from '../../shared'
import {
  SettingsShell,
  arrayField,
  boolField,
  numberField,
  objectField,
  stringField,
  useGroupId,
  useSaveSettings,
  useSettingsQuery,
  type JsonObject,
} from './common'

type ProxyFamily = 'http' | 'tcp' | 'udp'

function proxyBase(family: ProxyFamily): string {
  return `/servers/groups/group/settings/${family === 'http' ? 'httpReverseProxy' : family === 'tcp' ? 'tcpReverseProxy' : 'udpReverseProxy'}`
}

interface OriginRow {
  id: number
  weight: number
  addr: string
  isOSS: boolean
  name: string
  isOn: boolean
  domains: string[]
  hasCert: boolean
  host: string
  followPort: boolean
  http2Enabled: boolean
}

interface ProxyIndexData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  serverType: string
  reverseProxyRef: JsonObject
  reverseProxyConfig: JsonObject
  primaryOrigins: OriginRow[]
  backupOrigins: OriginRow[]
}

export function GroupSettingsHttpProxyPage() {
  return <ProxyIndexPage family="http" />
}
export function GroupSettingsTcpProxyPage() {
  return <ProxyIndexPage family="tcp" />
}
export function GroupSettingsUdpProxyPage() {
  return <ProxyIndexPage family="udp" />
}

function ProxyIndexPage({ family }: { family: ProxyFamily }) {
  const groupId = useGroupId()
  const base = proxyBase(family)
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [editing, setEditing] = useState<{ originType: 'primary' | 'backup'; originId: number; origin?: OriginRow } | null>(null)

  const query = useSettingsQuery<ProxyIndexData>(base, groupId)
  const pathFor = (suffix: string) => `/servers/server/settings/origins/${suffix}`

  const remove = useMutation({
    mutationFn: (params: { reverseProxyId: number; originId: number; originType: 'primary' | 'backup' }) =>
      postForm(pathFor('delete'), params),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: [base, groupId] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const toggle = useMutation({
    mutationFn: (params: { originId: number; isOn: boolean }) => postForm(pathFor('updateIsOn'), params),
    onSuccess: async () => {
      toast('操作成功')
      await queryClient.invalidateQueries({ queryKey: [base, groupId] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const refConfig = data.reverseProxyRef || {}
  const config = data.reverseProxyConfig || {}
  const proxyEnabled = boolField(refConfig, 'isPrior') && boolField(refConfig, 'isOn')

  async function deleteOrigin(origin: OriginRow, originType: 'primary' | 'backup') {
    if (!(await confirm({ message: `确定要删除此源站(${origin.addr})吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate({ reverseProxyId: numberField(config, 'id'), originId: origin.id, originType })
  }

  async function toggleOrigin(origin: OriginRow, isOn: boolean) {
    if (!(await confirm({ message: `确定要${isOn ? '启用' : '停用'}此源站(${origin.addr})吗?` }))) {
      return
    }
    toggle.mutate({ originId: origin.id, isOn })
  }

  function renderOrigins(origins: OriginRow[], originType: 'primary' | 'backup', title: string) {
    return (
      <div>
        <h3>
          {title}{' '}
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              setEditing({ originType, originId: 0 })
            }}
          >
            [{originType === 'primary' ? '添加主要源站' : '添加备用源站'}]
          </a>
        </h3>
        {origins.length === 0 ? <p className="comment">暂时还没有{originType === 'primary' ? '主要' : '备用'}源站.</p> : null}
        {origins.length > 0 ? (
          <table className="ui table selectable">
            <thead>
              <tr>
                <th>源站地址</th>
                <th>名称</th>
                <th className="center">权重</th>
                <th>域名</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {origins.map((origin) => (
                <tr key={origin.id}>
                  <td className={origin.isOn ? undefined : 'disabled'}>
                    {origin.addr}
                    {origin.isOSS ? <span className="ui label tiny basic">OSS</span> : null}
                    {!origin.isOn ? <span className="ui label tiny red basic">停用</span> : null}
                  </td>
                  <td>{origin.name}</td>
                  <td className="center">{origin.weight}</td>
                  <td>
                    {(origin.domains || []).map((domain) => (
                      <div key={domain}>
                        <span className="ui label tiny basic">{domain}</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditing({ originType, originId: origin.id, origin })
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;{' '}
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void toggleOrigin(origin, !origin.isOn)
                      }}
                    >
                      {origin.isOn ? '停用' : '启用'}
                    </a>{' '}
                    &nbsp;{' '}
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteOrigin(origin, originType)
                      }}
                    >
                      删除
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

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <GroupSecondMenu group={data.group} base={base} current="index" />
      {!proxyEnabled ? (
        <div>
          <div className="margin" />
          <div className="ui message warning">
            当前源站没有启用,可以通过点击{' '}
            <a href={`${base}/setting?groupId=${data.group.id}`}>[更多设置]</a> 开启 .
          </div>
        </div>
      ) : null}
      <div style={proxyEnabled ? undefined : { opacity: 0.55 }}>
        {renderOrigins(data.primaryOrigins || [], 'primary', '主要源站')}
        {renderOrigins(data.backupOrigins || [], 'backup', '备用源站')}
      </div>

      {editing ? (
        <Modal title={editing.originId > 0 ? '修改源站' : '添加源站'} onClose={() => setEditing(null)} width="45em">
          <OriginForm
            family={family}
            reverseProxyId={numberField(config, 'id')}
            originType={editing.originType}
            origin={editing.origin}
            onDone={async () => {
              setEditing(null)
              await queryClient.invalidateQueries({ queryKey: [base, groupId] })
            }}
          />
        </Modal>
      ) : null}
    </SettingsShell>
  )
}

function OriginForm({
  family,
  reverseProxyId,
  originType,
  origin,
  onDone,
}: {
  family: ProxyFamily
  reverseProxyId: number
  originType: 'primary' | 'backup'
  origin?: OriginRow
  onDone: () => void
}) {
  const toast = useToast()
  const [protocol, setProtocol] = useState(family === 'http' ? 'http' : family)
  const [addr, setAddr] = useState(origin ? origin.addr : '')
  const [name, setName] = useState(origin ? origin.name : '')
  const [weight, setWeight] = useState(origin ? origin.weight : 100)
  const [domains, setDomains] = useState<string[]>(origin ? origin.domains || [] : [])
  const [host, setHost] = useState(origin ? origin.host : '')
  const [followPort, setFollowPort] = useState(origin ? origin.followPort : false)
  const [http2Enabled, setHttp2Enabled] = useState(origin ? origin.http2Enabled : false)
  const [isOn, setIsOn] = useState(origin ? origin.isOn : true)
  const [connTimeout, setConnTimeout] = useState(0)
  const [readTimeout, setReadTimeout] = useState(0)
  const [idleTimeout, setIdleTimeout] = useState(0)
  const [maxConns, setMaxConns] = useState(0)
  const [maxIdleConns, setMaxIdleConns] = useState(0)

  const mutation = useMutation({
    mutationFn: () =>
      postForm(`/servers/server/settings/origins/${origin ? 'updatePopup' : 'addPopup'}`, {
        originType,
        originId: origin ? origin.id : 0,
        reverseProxyId,
        protocol,
        addr,
        weight,
        name,
        connTimeout,
        readTimeout,
        idleTimeout,
        maxConns,
        maxIdleConns,
        domainsJSON: JSON.stringify(domains),
        host,
        followPort,
        http2Enabled,
        description: '',
        isOn,
      }),
    onSuccess: () => {
      toast('保存成功')
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">协议</td>
            <td>
              <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                {family === 'http' ? (
                  <>
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </>
                ) : (
                  <option value={family}>{family.toUpperCase()}</option>
                )}
              </select>
            </td>
          </tr>
          <tr>
            <td>源站地址 *</td>
            <td>
              <input type="text" value={addr} placeholder="比如 192.168.1.1:8080" onChange={(event) => setAddr(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>名称</td>
            <td>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>权重</td>
            <td>
              <input type="text" value={String(weight)} onChange={(event) => setWeight(Number(event.target.value) || 0)} />
            </td>
          </tr>
          <tr>
            <td>匹配域名</td>
            <td>
              <StringListInput values={domains} onChange={setDomains} placeholder="example.com" />
              <p className="comment">留空表示匹配所有域名,多个域名用英文逗号分隔.</p>
            </td>
          </tr>
          {family === 'http' ? (
            <tr>
              <td>源站Host</td>
              <td>
                <input type="text" value={host} onChange={(event) => setHost(event.target.value)} />
                <p className="comment">留空表示使用默认值.</p>
              </td>
            </tr>
          ) : null}
          {family === 'http' ? (
            <tr>
              <td>跟随端口</td>
              <td>
                <Checkbox checked={followPort} onChange={setFollowPort} />
              </td>
            </tr>
          ) : null}
          {family === 'http' ? (
            <tr>
              <td>支持HTTP/2</td>
              <td>
                <Checkbox checked={http2Enabled} onChange={setHttp2Enabled} />
              </td>
            </tr>
          ) : null}
          <tr>
            <td>启用当前源站</td>
            <td>
              <Checkbox checked={isOn} onChange={setIsOn} />
            </td>
          </tr>
          <tr>
            <td>连接超时</td>
            <td>
              <input type="text" value={String(connTimeout)} onChange={(event) => setConnTimeout(Number(event.target.value) || 0)} /> 秒
            </td>
          </tr>
          <tr>
            <td>读取超时</td>
            <td>
              <input type="text" value={String(readTimeout)} onChange={(event) => setReadTimeout(Number(event.target.value) || 0)} /> 秒
            </td>
          </tr>
          <tr>
            <td>空闲超时</td>
            <td>
              <input type="text" value={String(idleTimeout)} onChange={(event) => setIdleTimeout(Number(event.target.value) || 0)} /> 秒
            </td>
          </tr>
          <tr>
            <td>最大连接数</td>
            <td>
              <input type="text" value={String(maxConns)} onChange={(event) => setMaxConns(Number(event.target.value) || 0)} />
            </td>
          </tr>
          <tr>
            <td>最大空闲连接数</td>
            <td>
              <input type="text" value={String(maxIdleConns)} onChange={(event) => setMaxIdleConns(Number(event.target.value) || 0)} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}

/* ---------------------------- 调度算法 ---------------------------- */

interface SchedulingData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  family: string
  reverseProxyId: number
  scheduling: JsonObject
}

interface SchedulingOption {
  code: string
  name: string
  description?: string
}

export function GroupSettingsHttpProxySchedulingPage() {
  return <ProxySchedulingPage family="http" />
}
export function GroupSettingsTcpProxySchedulingPage() {
  return <ProxySchedulingPage family="tcp" />
}
export function GroupSettingsUdpProxySchedulingPage() {
  return <ProxySchedulingPage family="udp" />
}

function ProxySchedulingPage({ family }: { family: ProxyFamily }) {
  const groupId = useGroupId()
  const base = proxyBase(family)
  const path = `${base}/scheduling`
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const query = useSettingsQuery<SchedulingData>(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const scheduling = data.scheduling || {}

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <GroupSecondMenu group={data.group} base={base} current="scheduling" />
      <div className="margin" />
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">当前正在使用的算法</td>
            <td>
              {stringField(scheduling, 'name')} &nbsp;{' '}
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setEditing(true)
                }}
              >
                [修改]
              </a>
              <p className="comment">{stringField(scheduling, 'description')}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {editing ? (
        <Modal title="修改调度算法" onClose={() => setEditing(false)} width="42em">
          <SchedulingForm
            family={family}
            reverseProxyId={data.reverseProxyId}
            currentCode={stringField(scheduling, 'code', 'random')}
            options={objectField<JsonObject>(scheduling, 'options', {})}
            onDone={async () => {
              setEditing(false)
              await queryClient.invalidateQueries({ queryKey: [path, groupId] })
            }}
          />
        </Modal>
      ) : null}
    </SettingsShell>
  )
}

function SchedulingForm({
  family,
  reverseProxyId,
  currentCode,
  options,
  onDone,
}: {
  family: ProxyFamily
  reverseProxyId: number
  currentCode: string
  options: JsonObject
  onDone: () => void
}) {
  const toast = useToast()
  const [type, setType] = useState(currentCode)
  const [hashKey, setHashKey] = useState(stringField(options, 'key'))
  const [stickyType, setStickyType] = useState(stringField(options, 'type', 'cookie'))
  const [stickyParam, setStickyParam] = useState(stringField(options, 'param'))

  const typesQuery = useQuery({
    queryKey: ['reverse-proxy-scheduling-types', family, reverseProxyId],
    queryFn: () =>
      apiGet<{ scheduling: JsonObject; schedulingTypes: SchedulingOption[] }>('/servers/server/settings/reverseProxy/updateSchedulingPopup', {
        family,
        reverseProxyId,
      }),
  })

  const mutation = useMutation({
    mutationFn: () => postForm('/servers/server/settings/reverseProxy/updateSchedulingPopup', { reverseProxyId, type, hashKey, stickyType, stickyParam }),
    onSuccess: () => {
      toast('保存成功')
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (typesQuery.isLoading) {
    return <LoadingBlock />
  }
  if (typesQuery.isError || !typesQuery.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const types = typesQuery.data.schedulingTypes || []
  const selected = types.find((item) => item.code === type)

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">调度算法 *</td>
            <td>
              <select className="ui dropdown auto-width" value={type} onChange={(event) => setType(event.target.value)}>
                {types.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              {selected && selected.description ? <p className="comment">{selected.description}</p> : null}
            </td>
          </tr>
          {type === 'hash' ? (
            <tr>
              <td>Key *</td>
              <td>
                <input type="text" value={hashKey} onChange={(event) => setHashKey(event.target.value)} />
              </td>
            </tr>
          ) : null}
          {type === 'sticky' ? (
            <>
              <tr>
                <td>参数类型 *</td>
                <td>
                  <select className="ui dropdown auto-width" value={stickyType} onChange={(event) => setStickyType(event.target.value)}>
                    <option value="cookie">Cookie</option>
                    <option value="query">URL参数</option>
                    <option value="header">请求报头</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>参数名 *</td>
                <td>
                  <input type="text" maxLength={50} value={stickyParam} onChange={(event) => setStickyParam(event.target.value)} />
                </td>
              </tr>
            </>
          ) : null}
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}

/* ---------------------------- 更多设置 ---------------------------- */

interface ProxySettingData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  family: string
  reverseProxyRef: JsonObject
  reverseProxyConfig: JsonObject
}

export function GroupSettingsHttpProxySettingPage() {
  return <ProxySettingPage family="http" />
}
export function GroupSettingsTcpProxySettingPage() {
  return <ProxySettingPage family="tcp" />
}
export function GroupSettingsUdpProxySettingPage() {
  return <ProxySettingPage family="udp" />
}

const FORWARD_HEADERS = ['X-Real-IP', 'X-Forwarded-For', 'X-Forwarded-By', 'X-Forwarded-Host', 'X-Forwarded-Proto']

function ProxySettingPage({ family }: { family: ProxyFamily }) {
  const groupId = useGroupId()
  const base = proxyBase(family)
  const path = `${base}/setting`
  const query = useSettingsQuery<ProxySettingData>(path, groupId)
  const [refConfig, setRefConfig] = useState<JsonObject | null>(null)
  const [config, setConfig] = useState<JsonObject | null>(null)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const currentRef = refConfig ?? data.reverseProxyRef ?? {}
  const current = config ?? data.reverseProxyConfig ?? {}
  const isOn = boolField(currentRef, 'isPrior') && boolField(currentRef, 'isOn')
  const addHeaders = arrayField<string>(current, 'addHeaders')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate({
      groupId,
      reverseProxyRefJSON: JSON.stringify(currentRef),
      reverseProxyJSON: JSON.stringify(current),
    })
  }

  function updateConfig(key: string, value: unknown) {
    setConfig({ ...(config ?? data.reverseProxyConfig ?? {}), [key]: value })
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <GroupSecondMenu group={data.group} base={base} current="setting" />
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <table className="ui table selectable definition">
          <tbody>
            <tr className={boolField(currentRef, 'isPrior') ? 'active' : undefined}>
              <td className="title">打开独立配置</td>
              <td>
                <div className="ui toggle checkbox">
                  <input
                    type="checkbox"
                    checked={boolField(currentRef, 'isPrior')}
                    onChange={(event) => setRefConfig({ ...currentRef, isPrior: event.target.checked })}
                  />
                  <label />
                </div>
                <p className="comment">
                  {boolField(currentRef, 'isPrior') ? <strong>[已打开]</strong> : null} 打开后可以覆盖父级或子级配置.
                </p>
              </td>
            </tr>
            {boolField(currentRef, 'isPrior') ? (
              <tr>
                <td className="title">启用反向代理</td>
                <td>
                  <Checkbox checked={boolField(currentRef, 'isOn')} onChange={(checked) => setRefConfig({ ...currentRef, isOn: checked })} />
                </td>
              </tr>
            ) : null}
          </tbody>
          {isOn ? (
            <tbody>
              <tr>
                <td className="title">源站Host</td>
                <td>
                  <div className="ui radio checkbox" style={{ marginRight: '1em' }}>
                    <input type="radio" checked={numberField(current, 'requestHostType') === 0} onChange={() => updateConfig('requestHostType', 0)} />
                    <label>跟随CDN域名</label>
                  </div>
                  <div className="ui radio checkbox" style={{ marginRight: '1em' }}>
                    <input type="radio" checked={numberField(current, 'requestHostType') === 1} onChange={() => updateConfig('requestHostType', 1)} />
                    <label>跟随源站</label>
                  </div>
                  <div className="ui radio checkbox">
                    <input type="radio" checked={numberField(current, 'requestHostType') === 2} onChange={() => updateConfig('requestHostType', 2)} />
                    <label>自定义</label>
                  </div>
                  {numberField(current, 'requestHostType') === 2 ? (
                    <div>
                      <input
                        type="text"
                        placeholder="比如example.com"
                        value={stringField(current, 'requestHost')}
                        onChange={(event) => updateConfig('requestHost', event.target.value)}
                      />
                    </div>
                  ) : null}
                  <p className="comment">发送到源站的Host.</p>
                </td>
              </tr>
              <tr>
                <td>排除端口</td>
                <td>
                  <Checkbox
                    checked={boolField(current, 'requestHostExcludingPort')}
                    onChange={(checked) => updateConfig('requestHostExcludingPort', checked)}
                  />
                  <p className="comment">选中后,在Host中排除端口.</p>
                </td>
              </tr>
              <tr>
                <td>自动跟随跳转</td>
                <td>
                  <Checkbox checked={boolField(current, 'followRedirects')} onChange={(checked) => updateConfig('followRedirects', checked)} />
                </td>
              </tr>
              <tr>
                <td>追加转发报头</td>
                <td>
                  {FORWARD_HEADERS.map((header) => (
                    <div key={header} className="ui checkbox" style={{ marginRight: '1.5em' }}>
                      <input
                        type="checkbox"
                        checked={addHeaders.includes(header)}
                        onChange={(event) =>
                          updateConfig('addHeaders', event.target.checked ? [...addHeaders, header] : addHeaders.filter((value) => value !== header))
                        }
                      />
                      <label>{header}</label>
                    </div>
                  ))}
                </td>
              </tr>
              <tr>
                <td>请求URI</td>
                <td>
                  <input
                    type="text"
                    placeholder="${requestURI}"
                    value={stringField(current, 'requestURI')}
                    onChange={(event) => updateConfig('requestURI', event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>去除URL前缀</td>
                <td>
                  <input
                    type="text"
                    placeholder="/PREFIX"
                    value={stringField(current, 'stripPrefix')}
                    onChange={(event) => updateConfig('stripPrefix', event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>自动刷新</td>
                <td>
                  <Checkbox checked={boolField(current, 'autoFlush')} onChange={(checked) => updateConfig('autoFlush', checked)} />
                </td>
              </tr>
              <tr>
                <td>50x重试</td>
                <td>
                  <Checkbox checked={boolField(current, 'retry50X')} onChange={(checked) => updateConfig('retry50X', checked)} />
                </td>
              </tr>
              <tr>
                <td>40x重试</td>
                <td>
                  <Checkbox checked={boolField(current, 'retry40X')} onChange={(checked) => updateConfig('retry40X', checked)} />
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>PROXY Protocol</td>
                    <td>
                      <Checkbox
                        checked={boolField(objectField<JsonObject>(current, 'proxyProtocol', {}), 'isOn')}
                        onChange={(checked) =>
                          updateConfig('proxyProtocol', { ...objectField<JsonObject>(current, 'proxyProtocol', {}), isOn: checked })
                        }
                      />
                      <select
                        className="ui dropdown auto-width"
                        value={String(numberField(objectField<JsonObject>(current, 'proxyProtocol', {}), 'version', 1))}
                        onChange={(event) =>
                          updateConfig('proxyProtocol', {
                            ...objectField<JsonObject>(current, 'proxyProtocol', {}),
                            version: Number(event.target.value),
                          })
                        }
                      >
                        <option value="1">V1</option>
                        <option value="2">V2</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>连接超时</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(current, 'connTimeout', { count: 0, unit: 'second' })}
                        onChange={(value) => updateConfig('connTimeout', value)}
                        units={['second']}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>读取超时</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(current, 'readTimeout', { count: 0, unit: 'second' })}
                        onChange={(value) => updateConfig('readTimeout', value)}
                        units={['second']}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>空闲超时</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(current, 'idleTimeout', { count: 0, unit: 'second' })}
                        onChange={(value) => updateConfig('idleTimeout', value)}
                        units={['second']}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>最大连接数</td>
                    <td>
                      <input
                        type="text"
                        value={String(numberField(current, 'maxConns'))}
                        onChange={(event) => updateConfig('maxConns', Number(event.target.value) || 0)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>最大空闲连接数</td>
                    <td>
                      <input
                        type="text"
                        value={String(numberField(current, 'maxIdleConns'))}
                        onChange={(event) => updateConfig('maxIdleConns', Number(event.target.value) || 0)}
                      />
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${save.isPending ? ' loading disabled' : ''}`} type="submit" disabled={save.isPending}>
            保存
          </button>
        </div>
      </form>
    </SettingsShell>
  )
}
