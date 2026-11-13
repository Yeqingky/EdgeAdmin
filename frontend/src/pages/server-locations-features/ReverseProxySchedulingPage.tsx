import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { Modal } from './editors'
import { reverseProxyMenu } from './reverseProxyMenu'
import type { LocationBaseData, SchedulingType } from './types'

interface SchedulingPageData extends LocationBaseData {
  reverseProxyId: number
  scheduling: SchedulingType | null
}

interface SchedulingPopupData {
  scheduling: { code: string; options?: Record<string, unknown> | null } | null
  schedulingTypes: SchedulingType[]
  reverseProxyId: number
  serverId: number
}

function SchedulingForm({
  serverId,
  reverseProxyId,
  onClose,
}: {
  serverId: number
  reverseProxyId: number
  onClose: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['reverse-proxy-scheduling-popup', serverId, reverseProxyId],
    queryFn: () =>
      apiGet<SchedulingPopupData>('/servers/server/settings/reverseProxy/updateSchedulingPopup', {
        type: 'server',
        serverId,
        reverseProxyId,
      }),
  })
  const [type, setType] = useState('')
  const [hashKey, setHashKey] = useState('${remoteAddr}')
  const [hashVar, setHashVar] = useState('')
  const [stickyType, setStickyType] = useState('cookie')
  const [stickyParam, setStickyParam] = useState('Origin')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      const code = query.data.scheduling?.code || 'random'
      setType(code)
      if (code === 'hash') {
        setHashKey(String(query.data.scheduling?.options?.key || '${remoteAddr}'))
      }
      if (code === 'sticky') {
        setStickyType(String(query.data.scheduling?.options?.type || 'cookie'))
        setStickyParam(String(query.data.scheduling?.options?.param || 'Origin'))
      }
    }
  }, [query.data])

  if (query.isLoading || query.isError || !query.data) {
    return (
      <Modal title="修改调度算法" onClose={onClose} width="32em">
        {query.isError ? <div className="ui negative message">加载失败</div> : <LoadingBlock />}
      </Modal>
    )
  }

  const schedulingType = query.data.schedulingTypes.find((item) => item.code === type)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/reverseProxy/updateSchedulingPopup', {
        serverId,
        reverseProxyId,
        type,
        hashKey,
        stickyType,
        stickyParam,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-reverse-proxy-scheduling'] })
      await queryClient.invalidateQueries({ queryKey: ['reverse-proxy-scheduling-popup'] })
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="修改调度算法" onClose={onClose} width="36em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <tbody>
            <FormRow title="选择调度算法">
              <select className="ui dropdown auto-width" value={type} onChange={(event) => setType(event.target.value)}>
                {query.data.schedulingTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="comment">{schedulingType?.description || ''}</p>
            </FormRow>
          </tbody>
          {type === 'hash' ? (
            <tbody>
              <FormRow title="Key">
                <input type="text" maxLength={500} value={hashKey} onChange={(event) => setHashKey(event.target.value)} />
                <p className="comment">用来计算Hash的字符串,其中可以使用变量.</p>
              </FormRow>
              <FormRow title="常用变量">
                <select
                  className="ui dropdown"
                  style={{ width: '12em' }}
                  value={hashVar}
                  onChange={(event) => {
                    setHashVar(event.target.value)
                    if (event.target.value.length > 0) {
                      setHashKey(event.target.value)
                    }
                  }}
                >
                  <option value="" />
                  <option value="${remoteAddr}">客户端IP</option>
                  <option value="${host}${requestURI}">请求URL</option>
                </select>
              </FormRow>
            </tbody>
          ) : null}
          {type === 'sticky' ? (
            <tbody>
              <FormRow title="参数类型">
                <select className="ui dropdown" style={{ width: '12em' }} value={stickyType} onChange={(event) => setStickyType(event.target.value)}>
                  <option value="cookie">Cookie</option>
                  <option value="header">HTTP Header</option>
                  <option value="argument">URL参数</option>
                </select>
              </FormRow>
              <FormRow title="参数名">
                <input type="text" maxLength={50} value={stickyParam} onChange={(event) => setStickyParam(event.target.value)} />
                <p className="comment">
                  记录或指定源站的参数名,只能是英文字母和数字的组合,不允许有下划线(因为在HTTP Header中下划线是不标准的)
                </p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

export function ReverseProxySchedulingPage() {
  const { query, serverId, locationId } = useLocationData<SchedulingPageData>('/servers/server/settings/locations/reverseProxy/scheduling', 'location-reverse-proxy-scheduling')
  const [editing, setEditing] = useState(false)

  if (locationId === 0) {
    return <MissingLocation />
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <LocationShell data={query.data} menu={reverseProxyMenu(serverId, locationId, 'scheduling')}>
      <div className="margin" />
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">当前正在使用的算法</td>
            <td>
              {query.data.scheduling?.name || '-'} &nbsp;{' '}
              <a href="" onClick={(event) => { event.preventDefault(); setEditing(true) }}>
                [修改]
              </a>
              <p className="comment">{query.data.scheduling?.description || ''}</p>
            </td>
          </tr>
        </tbody>
      </table>
      {editing ? <SchedulingForm serverId={serverId} reverseProxyId={query.data.reverseProxyId} onClose={() => setEditing(false)} /> : null}
    </LocationShell>
  )
}
