import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { ServerSettingsShell, useServerId, type ServerSettingsBase } from './shared'

interface CommonConfig {
  mergeSlashes: boolean
}

interface CommonData extends ServerSettingsBase {
  hasGroupConfig: boolean
  webId: number
  commonConfig: CommonConfig | null
}

export function ServerCommonSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-common', serverId],
    queryFn: () => apiGet<CommonData>('/servers/server/settings/common', { serverId }),
    enabled: serverId > 0,
  })
  const [mergeSlashes, setMergeSlashes] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.commonConfig) {
      setMergeSlashes(query.data.commonConfig.mergeSlashes)
    }
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/common', {
        csrfToken: await getCsrfToken(),
        webId: data.webId,
        mergeSlashes: mergeSlashes ? 1 : '',
      })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="合并重复的路径分隔符">
            <Checkbox checked={mergeSlashes} onChange={setMergeSlashes} />
            <p className="comment">
              合并URL中重复的路径分隔符为一个，比如<code>//hello/world</code>中的<code>//</code>。
            </p>
          </FormRow>
        </FormTable>
        <div className="margin" />
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
