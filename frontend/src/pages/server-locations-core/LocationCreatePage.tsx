import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { PageHeader } from '../../components/PageHeader'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { DomainsField, MoreOptionsIndicator } from './fields'
import { RequestCondsEditor } from './conds'
import { ServerSettingsBreadcrumb, ServerSettingsLeftMenu } from './LocationShell'
import { spaLink, type LeftMenuData, type PatternType, type RequestCondsConfig } from './types'

interface CreateData extends LeftMenuData {
  webId: number
  patternTypes: PatternType[]
}

export function LocationCreatePage({ serverId }: { serverId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [pattern, setPattern] = useState('')
  const [patternType, setPatternType] = useState(1)
  const [isBreak, setIsBreak] = useState(false)
  const [name, setName] = useState('')
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(false)
  const [isReverse, setIsReverse] = useState(false)
  const [description, setDescription] = useState('')
  const [domains, setDomains] = useState<string[]>([])
  const [conds, setConds] = useState<RequestCondsConfig>({ isOn: true, connector: 'or', groups: [] })
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['server-locations-create', serverId],
    queryFn: () =>
      apiGet<CreateData>('/servers/server/settings/locations/create', {
        serverId,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const selectedType = data.patternTypes.find((item) => item.type === patternType)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pattern.length === 0) {
      toast('请输入路径匹配规则', 'error')
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/create', {
        webId: data.webId,
        pattern,
        patternType,
        isBreak: isBreak ? '1' : '0',
        name,
        isCaseInsensitive: isCaseInsensitive ? '1' : '0',
        isReverse: isReverse ? '1' : '0',
        description,
        condsJSON: JSON.stringify(conds),
        domainsJSON: JSON.stringify(domains),
      })
      toast('添加成功')
      navigate(`/servers/server/settings/locations?serverId=${serverId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <ServerSettingsBreadcrumb serverId={serverId} server={data.server} />
      <div className="margin" />
      <ServerSettingsLeftMenu items={data.leftMenuItems} disabled={data.leftMenuItemIsDisabled} />
      <div className="right-box">
        <PageHeader
          items={[
            { name: '列表', href: spaLink(`/servers/server/settings/locations?serverId=${serverId}`) },
            { name: '创建', active: true },
          ]}
        />
        <div className="margin" />
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="路径匹配规则 *">
              <TextInput
                type="text"
                maxLength={500}
                autoFocus
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
              />
              <p className="comment">路径通常以斜杠(/)开头，比如/hello。如果匹配类型是正则表达式匹配，则可以是一个正则表达式</p>
            </FormRow>
            <FormRow title="匹配类型">
              <Select value={String(patternType)} onChange={(event) => setPatternType(Number(event.target.value))}>
                {data.patternTypes.map((item) => (
                  <option key={item.type} value={item.type}>{item.name}</option>
                ))}
              </Select>
              {selectedType ? (
                <p className="comment" dangerouslySetInnerHTML={{ __html: selectedType.description }} />
              ) : null}
            </FormRow>
            <FormRow title="终止往下匹配">
              <Checkbox checked={isBreak} onChange={setIsBreak} />
              <p className="comment">如果选中了此选项，一旦匹配成功，不会继续匹配其他的路由规则。</p>
            </FormRow>
            <FormRow title="名称">
              <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
              <p className="comment">可以用来说明此规则用途。</p>
            </FormRow>
            <FormRow title="匹配条件">
              <RequestCondsEditor conds={conds} onChange={setConds} />
            </FormRow>
            <tr>
              <td colSpan={2}>
                <MoreOptionsIndicator visible={moreOptionsVisible} onToggle={() => setMoreOptionsVisible((visible) => !visible)} />
              </td>
            </tr>
          </FormTable>

          {moreOptionsVisible ? (
            <FormTable>
              <FormRow title="专属域名">
                <DomainsField domains={domains} onChange={setDomains} />
                <p className="comment">默认不需要填写，表示支持所有域名。如果填写了专属域名，表示当前路由规则只会在所列的专属域名被访问时才生效。</p>
              </FormRow>
              <FormRow title="不区分大小写">
                <Checkbox checked={isCaseInsensitive} onChange={setIsCaseInsensitive} />
                <p className="comment">选中表示匹配规则中的路径中的英文字母不区分大小写。</p>
              </FormRow>
              <FormRow title="反向匹配">
                <Checkbox checked={isReverse} onChange={setIsReverse} />
                <p className="comment">选中表示匹配所有<strong>不符合规则</strong>的路径。</p>
              </FormRow>
              <FormRow title="描述">
                <textarea rows={3} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
              </FormRow>
            </FormTable>
          ) : null}

          <SubmitButton submitting={submitting} />
        </form>
      </div>
    </div>
  )
}
