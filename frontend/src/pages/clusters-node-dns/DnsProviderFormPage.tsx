import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select } from '../../components/form'
import { MenuLinks } from './ui'
import { postForm, type DNSProviderFormData } from './shared'

type FieldBag = Record<string, string>

function textField(label: string, name: string, fields: FieldBag, set: (name: string, value: string) => void, comment?: string, password = false) {
  return (
    <FormRow key={name} title={label}>
      <input
        type={password ? 'password' : 'text'}
        maxLength={100}
        spellCheck={false}
        value={fields[name] || ''}
        onChange={(event) => set(name, event.target.value)}
      />
      {comment ? <p className="comment">{comment}</p> : null}
    </FormRow>
  )
}

export function DnsProviderFormPage({ mode }: { mode: 'create' | 'update' }) {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const providerId = Number(searchParams.get('providerId') || 0)
  const url = mode === 'create' ? '/dns/providers/createPopup' : '/dns/providers/updatePopup'

  const query = useQuery({
    queryKey: ['dns-provider-form', mode, providerId],
    queryFn: () => apiGet<DNSProviderFormData>(url, mode === 'update' ? { providerId } : undefined),
    enabled: mode === 'create' || providerId > 0,
  })

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [minTTL, setMinTTL] = useState('0')
  const [fields, setFields] = useState<FieldBag>({})
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function setField(fieldName: string, value: string) {
    setFields((current) => ({ ...current, [fieldName]: value }))
  }

  useEffect(() => {
    if (!query.data || initialized) {
      return
    }
    const data = query.data
    if (mode === 'create') {
      setType(data.types[0] ? data.types[0].code : '')
      setField('paramCustomHTTPSecret', data.paramCustomHTTPSecret || '')
    } else if (data.provider) {
      const provider = data.provider
      setName(provider.name)
      setType(provider.type)
      setMinTTL(String(provider.minTTL || 0))
      const params = provider.params as Record<string, unknown>
      const next: FieldBag = {}
      const assign = (field: string, param: string) => {
        const value = params[field]
        if (value !== undefined && value !== null) {
          next[param] = String(value)
        }
      }
      switch (provider.type) {
        case 'dnspod':
          next.paramDNSPodAPIType = params.apiType ? String(params.apiType) : 'dnsPodToken'
          if (next.paramDNSPodAPIType === 'tencentDNS') {
            assign('accessKeyId', 'paramDNSPodAccessKeyId')
            assign('accessKeySecret', 'paramDNSPodAccessKeySecret')
          } else {
            assign('id', 'paramDNSPodId')
            assign('token', 'paramDNSPodToken')
            assign('region', 'paramDNSPodRegion')
          }
          break
        case 'alidns':
          assign('accessKeyId', 'paramAliDNSAccessKeyId')
          assign('accessKeySecret', 'paramAliDNSAccessKeySecret')
          assign('regionId', 'paramAliDNSRegionId')
          break
        case 'huaweiDNS':
          assign('accessKeyId', 'paramHuaweiAccessKeyId')
          assign('accessKeySecret', 'paramHuaweiAccessKeySecret')
          assign('endpoint', 'paramHuaweiEndpoint')
          break
        case 'cloudFlare':
          assign('apiKey', 'paramCloudFlareAPIKey')
          assign('email', 'paramCloudFlareEmail')
          break
        case 'godaddy':
          assign('key', 'paramGoDaddyKey')
          assign('secret', 'paramGoDaddySecret')
          break
        case 'cloudns':
          assign('authId', 'paramClouDNSAuthId')
          assign('subAuthId', 'paramClouDNSSubAuthId')
          assign('authPassword', 'paramClouDNSAuthPassword')
          break
        case 'dnscom':
          assign('key', 'paramDNSComKey')
          assign('secret', 'paramDNSComSecret')
          break
        case 'dnsla':
          assign('apiId', 'paramDNSLaAPIId')
          assign('secret', 'paramDNSLaSecret')
          break
        case 'volcEngine':
          assign('accessKeyId', 'paramVolcEngineAccessKeyId')
          assign('accessKeySecret', 'paramVolcEngineAccessKeySecret')
          break
        case 'amazonRoute53':
          assign('accessKeyId', 'paramAmazonRoute53AccessKeyId')
          assign('accessKeySecret', 'paramAmazonRoute53AccessKeySecret')
          assign('region', 'paramAmazonRoute53Region')
          break
        case 'azureDNS':
          assign('subscriptionId', 'paramAzureDNSSubscriptionId')
          assign('tenantId', 'paramAzureDNSTenantId')
          assign('clientId', 'paramAzureDNSClientId')
          assign('clientSecret', 'paramAzureDNSClientSecret')
          assign('resourceGroupName', 'paramAzureDNSResourceGroupName')
          break
        case 'bunnyNet':
          assign('apiKey', 'paramBunnyNetAPIKey')
          break
        case 'localEdgeDNS':
          assign('clusterId', 'paramLocalEdgeDNSClusterId')
          break
        case 'edgeDNSAPI':
          assign('host', 'paramEdgeDNSAPIHost')
          assign('role', 'paramEdgeDNSAPIRole')
          assign('accessKeyId', 'paramEdgeDNSAPIAccessKeyId')
          assign('accessKeySecret', 'paramEdgeDNSAPIAccessKeySecret')
          break
        case 'customHTTP':
          assign('url', 'paramCustomHTTPURL')
          assign('secret', 'paramCustomHTTPSecret')
          break
        default:
          break
      }
      setFields((current) => ({ ...current, ...next }))
    }
    setInitialized(true)
  }, [query.data, initialized, mode])

  if (mode === 'update' && providerId <= 0) {
    return <div className="ui negative message">缺少服务商参数。</div>
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <LoadingBlock />
  }
  if (!query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const typeDescription = data.types.find((item) => item.code === type)?.description || ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入账号说明', 'error')
      return
    }
    if (!type) {
      toast('请选择服务商厂家', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postForm(
        url,
        {
          ...(mode === 'update' ? { providerId } : {}),
          name: name.trim(),
          type,
          minTTL: Number(minTTL) || 0,
          ...fields,
        },
        true,
      )
      toast('保存成功')
      navigate(`/dns/providers${mode === 'update' ? `/provider?providerId=${providerId}` : ''}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const apiType = fields.paramDNSPodAPIType || 'tencentDNS'

  return (
    <div>
      <MenuLinks
        items={[
          { name: 'DNS账号列表', to: '/dns/providers' },
          { name: mode === 'create' ? '添加DNS服务商账号' : '修改DNS服务商账号', to: `${location.pathname}${location.search}`, active: true },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <h3>{mode === 'create' ? '添加DNS服务商账号' : '修改DNS服务商账号'}</h3>
        <FormTable>
          <FormRow title="账号说明 *">
            <input type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
            <p className="comment">用来方便区分不同的账号。</p>
          </FormRow>
          <FormRow title="服务商厂家 *">
            {mode === 'create' ? (
              <>
                <Select value={type} onChange={(event) => setType(event.target.value)}>
                  {data.types.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                {typeDescription ? (
                  <p className="comment">
                    {typeDescription} 系统会保留原有域名下的域名解析，请放心使用。
                  </p>
                ) : null}
              </>
            ) : (
              <span>
                {data.provider?.typeName}
                <p className="comment">{typeDescription}创建后无法修改此选项。</p>
              </span>
            )}
          </FormRow>
          {type ? (
            <tr>
              <td colSpan={2}>API参数</td>
            </tr>
          ) : null}

          {type === 'dnspod' ? (
            <>
              <FormRow title="密钥类型 *">
                <Select value={apiType} onChange={(event) => setField('paramDNSPodAPIType', event.target.value)}>
                  <option value="tencentDNS">腾讯云API密钥</option>
                  <option value="dnsPodToken">DNSPod Token</option>
                </Select>
              </FormRow>
              {apiType === 'tencentDNS' ? (
                <>
                  {textField('SecretId *', 'paramDNSPodAccessKeyId', fields, setField, '在DNSPod控制台“账号中心--API密钥”中获取。')}
                  {textField('SecretKey *', 'paramDNSPodAccessKeySecret', fields, setField, '在DNSPod控制台“账号中心--API密钥”中获取。', true)}
                </>
              ) : (
                <>
                  {textField('密钥ID *', 'paramDNSPodId', fields, setField, '在DNSPod控制台“账号中心--API密钥--DNSPod Token”中获取。')}
                  {textField('密钥Token *', 'paramDNSPodToken', fields, setField, '在DNSPod控制台“账号中心--API密钥--DNSPod Token”中获取。', true)}
                  <FormRow title="区域">
                    <Select value={fields.paramDNSPodRegion || ''} onChange={(event) => setField('paramDNSPodRegion', event.target.value)}>
                      <option value="">中国站</option>
                      <option value="international">国际站</option>
                    </Select>
                  </FormRow>
                </>
              )}
            </>
          ) : null}

          {type === 'alidns' ? (
            <>
              {textField('AccessKeyId *', 'paramAliDNSAccessKeyId', fields, setField, '登录阿里云控制台 -- 在"访问控制"中创建和获取。')}
              {textField('AccessKeySecret *', 'paramAliDNSAccessKeySecret', fields, setField, '登录阿里云控制台 -- 在"访问控制"中创建和获取。', true)}
              {textField('区域ID', 'paramAliDNSRegionId', fields, setField, '阿里云产品所在区域代号，通常不需要填写。')}
            </>
          ) : null}

          {type === 'huaweiDNS' ? (
            <>
              {textField('AccessKeyId *', 'paramHuaweiAccessKeyId', fields, setField, '登录华为云控制台 -- 在"我的凭证 -- 访问密钥"中创建和获取。')}
              {textField('AccessKeySecret *', 'paramHuaweiAccessKeySecret', fields, setField, '登录华为云控制台 -- 在"我的凭证 -- 访问密钥"中创建和获取。', true)}
              {textField('终端节点', 'paramHuaweiEndpoint', fields, setField, '选填项。可以填写终端节点（Endpoint）区域代号或者域名。')}
            </>
          ) : null}

          {type === 'cloudFlare' ? (
            <>
              {textField('API密钥 *', 'paramCloudFlareAPIKey', fields, setField, '在个人资料中的"API令牌"--"API密钥"--"Global API Key"中获取。', true)}
              {textField('账号邮箱 *', 'paramCloudFlareEmail', fields, setField, '登录账号使用的邮箱。')}
            </>
          ) : null}

          {type === 'godaddy' ? (
            <>
              {textField('Key *', 'paramGoDaddyKey', fields, setField, '可以在GoDaddy开发者中心创建，创建时Environment选择Production。')}
              {textField('Secret *', 'paramGoDaddySecret', fields, setField, '', true)}
            </>
          ) : null}

          {type === 'cloudns' ? (
            <>
              {textField('用户认证ID（auth-id）', 'paramClouDNSAuthId', fields, setField, '和子用户认证ID二选一。')}
              {textField('子用户认证ID（sub-auth-id）', 'paramClouDNSSubAuthId', fields, setField, '和用户认证ID二选一。')}
              {textField('认证密码 *（auth-password）', 'paramClouDNSAuthPassword', fields, setField, '', true)}
            </>
          ) : null}

          {type === 'dnscom' ? (
            <>
              {textField('API Key *', 'paramDNSComKey', fields, setField, '在DNS.COM控制台账号中心--API设置中创建和查看。')}
              {textField('API Secret *', 'paramDNSComSecret', fields, setField, '在DNS.COM控制台账号中心--API设置中创建和查看。', true)}
            </>
          ) : null}

          {type === 'dnsla' ? (
            <>
              {textField('API ID *', 'paramDNSLaAPIId', fields, setField, '在DNS.LA控制台--账户信息中查看。')}
              {textField('API密钥 *', 'paramDNSLaSecret', fields, setField, '在DNS.LA控制台--账户信息中查看。', true)}
            </>
          ) : null}

          {type === 'volcEngine' ? (
            <>
              {textField('Access Key ID *', 'paramVolcEngineAccessKeyId', fields, setField, '在火山引擎“访问控制--API访问密钥”中获取。')}
              {textField('Secret Access Key *', 'paramVolcEngineAccessKeySecret', fields, setField, '', true)}
            </>
          ) : null}

          {type === 'amazonRoute53' ? (
            <>
              {textField('Access Key ID *', 'paramAmazonRoute53AccessKeyId', fields, setField)}
              {textField('Secret Access Key *', 'paramAmazonRoute53AccessKeySecret', fields, setField, '', true)}
              {textField('API区域', 'paramAmazonRoute53Region', fields, setField, '通常不需要填写。')}
            </>
          ) : null}

          {type === 'azureDNS' ? (
            <>
              {textField('订阅ID (Subscription ID) *', 'paramAzureDNSSubscriptionId', fields, setField, '可以在订阅（Subscriptions）服务中查看。')}
              {textField('目录(租户) ID *', 'paramAzureDNSTenantId', fields, setField, '可以在应用注册（App registrations）中对应应用概述（Overview）中查看。')}
              {textField('应用程序(客户端) ID *', 'paramAzureDNSClientId', fields, setField, '需要在应用注册（App registrations）中新注册应用程序获得。')}
              {textField('客户端密码值 *', 'paramAzureDNSClientSecret', fields, setField, '', true)}
              {textField('资源组 *', 'paramAzureDNSResourceGroupName', fields, setField, '需要在对应资源组中添加角色分配。')}
            </>
          ) : null}

          {type === 'bunnyNet' ? <>{textField('API密钥 *', 'paramBunnyNetAPIKey', fields, setField, '', true)}</> : null}

          {type === 'localEdgeDNS' ? (
            <FormRow title="选择域名服务集群 *">
              <Select
                value={fields.paramLocalEdgeDNSClusterId || '0'}
                onChange={(event) => setField('paramLocalEdgeDNSClusterId', event.target.value)}
              >
                <option value="0">[选择域名服务集群]</option>
                {data.nsClusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </Select>
            </FormRow>
          ) : null}

          {type === 'edgeDNSAPI' ? (
            <>
              {textField('API地址 *', 'paramEdgeDNSAPIHost', fields, setField)}
              <FormRow title="AccessKey类型 *">
                <Select value={fields.paramEdgeDNSAPIRole || 'user'} onChange={(event) => setField('paramEdgeDNSAPIRole', event.target.value)}>
                  <option value="user">平台用户</option>
                  <option value="admin">管理员</option>
                </Select>
              </FormRow>
              {textField('AccessKey ID *', 'paramEdgeDNSAPIAccessKeyId', fields, setField)}
              {textField('AccessKey密钥 *', 'paramEdgeDNSAPIAccessKeySecret', fields, setField, '', true)}
            </>
          ) : null}

          {type === 'customHTTP' ? (
            <>
              {textField('HTTP URL *', 'paramCustomHTTPURL', fields, setField, 'HTTP URL完整地址，DNS所有操作都会以POST的方式转发到此地址。')}
              {textField('私钥 *', 'paramCustomHTTPSecret', fields, setField, '通讯用的私钥，转发请求时会在Header中加入相关信息。')}
            </>
          ) : null}

          <tr>
            <td colSpan={2}>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setMoreOptionsVisible(!moreOptionsVisible)
                }}
              >
                {moreOptionsVisible ? '收起更多选项' : '更多选项'}
              </a>
            </td>
          </tr>
          {moreOptionsVisible ? (
            <FormRow title="最小TTL">
              <div className="ui right labeled input">
                <input type="text" maxLength={6} style={{ width: '6em' }} value={minTTL} onChange={(event) => setMinTTL(event.target.value)} />
                <span className="ui label">秒</span>
              </div>
              <p className="comment">生成的DNS时可以使用的最小TTL，请根据你选择的服务商和你在服务商中的账号等级进行填写；不填写或者0表示默认。</p>
            </FormRow>
          ) : null}
        </FormTable>

        <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
          保存
        </button>
      </form>
    </div>
  )
}
