import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { DomainsField, MoreOptionsIndicator } from './fields'
import { RequestCondsEditor } from './conds'
import { LocationShell } from './LocationShell'
import type { LocationPageBase, PatternType, RequestCondsConfig } from './types'

interface LocationDetailData extends LocationPageBase {
  patternTypes: PatternType[]
  pattern: string
  type: number
  isReverse: boolean
  isCaseInsensitive: boolean
  conds?: RequestCondsConfig | null
  domains?: string[] | null
}

function DetailForm({ data, serverId, locationId }: { data: LocationDetailData; serverId: string; locationId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pattern, setPattern] = useState(data.pattern || '')
  const [patternType, setPatternType] = useState(data.type || 1)
  const [isBreak, setIsBreak] = useState(data.locationConfig?.isBreak ?? false)
  const [isOn, setIsOn] = useState(data.locationConfig?.isOn ?? true)
  const [name, setName] = useState(data.locationConfig?.name || '')
  const [description, setDescription] = useState(data.locationConfig?.description || '')
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(data.isCaseInsensitive ?? false)
  const [isReverse, setIsReverse] = useState(data.isReverse ?? false)
  const [domains, setDomains] = useState<string[]>(data.domains || [])
  const [conds, setConds] = useState<RequestCondsConfig>(
    data.conds || { isOn: true, connector: 'or', groups: [] },
  )
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const selectedType = data.patternTypes.find((item) => item.type === patternType)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pattern.length === 0) {
      toast('请输入路由匹配规则', 'error')
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/location', {
        locationId,
        name,
        pattern,
        patternType,
        description,
        isBreak: isBreak ? '1' : '0',
        isCaseInsensitive: isCaseInsensitive ? '1' : '0',
        isReverse: isReverse ? '1' : '0',
        isOn: isOn ? '1' : '0',
        condsJSON: JSON.stringify(conds),
        domainsJSON: JSON.stringify(domains),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-detail', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="路径匹配规则 *">
          <TextInput
            type="text"
            autoFocus
            maxLength={500}
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
          />
          <p className="comment">路径通常以斜杠(/)开头,比如/hello.如果匹配类型是正则表达式匹配,则可以是一个正则表达式</p>
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
          <p className="comment">如果选中了此选项,一旦匹配成功,不会继续匹配其他的路由规则.</p>
        </FormRow>
        <FormRow title="名称">
          <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          <p className="comment">可以用来说明此规则用途.</p>
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
            <p className="comment">默认不需要填写,表示支持所有域名.如果填写了专属域名,表示当前路由规则只会在所列的专属域名被访问时才生效.</p>
          </FormRow>
          <FormRow title="不区分大小写">
            <Checkbox checked={isCaseInsensitive} onChange={setIsCaseInsensitive} />
            <p className="comment">选中表示匹配规则中的路径中的英文字母不区分大小写.</p>
          </FormRow>
          <FormRow title="反向匹配">
            <Checkbox checked={isReverse} onChange={setIsReverse} />
            <p className="comment">选中表示匹配所有<strong>不符合规则</strong>的路径.</p>
          </FormRow>
          <FormRow title="描述">
            <textarea rows={3} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormRow>
          <FormRow title="启用当前路由规则">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        </FormTable>
      ) : null}

      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function LocationDetailPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-detail', serverId, locationId],
    queryFn: () =>
      apiGet<LocationDetailData>('/servers/server/settings/locations/location', {
        serverId,
        locationId,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <LocationShell
      serverId={serverId}
      locationId={locationId}
      pattern={data.locationConfig?.pattern}
      tinyLeftMenuItems={data.tinyLeftMenuItems}
      leftMenuItemIsDisabled={data.leftMenuItemIsDisabled}
    >
      <DetailForm data={data} serverId={serverId} locationId={locationId} />
    </LocationShell>
  )
}
