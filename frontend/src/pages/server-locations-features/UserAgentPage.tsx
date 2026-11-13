import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultUrlPatterns, MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, PriorCheckbox, UrlsPatternsBox } from './editors'
import type { LocationBaseData, UrlPattern } from './types'

interface UserAgentFilter {
  keywords: string[]
  action: string
}

interface UserAgentConfig {
  isPrior: boolean
  isOn: boolean
  filters: UserAgentFilter[]
  onlyURLPatterns: UrlPattern[]
  exceptURLPatterns: UrlPattern[]
}

interface UserAgentData extends LocationBaseData {
  webId: number
  userAgentConfig: UserAgentConfig | null
}

function normalizeConfig(config: UserAgentConfig | null): UserAgentConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    filters: config?.filters ? config.filters.map((filter) => ({ keywords: [...filter.keywords], action: filter.action })) : [],
    onlyURLPatterns: defaultUrlPatterns(config?.onlyURLPatterns),
    exceptURLPatterns: defaultUrlPatterns(config?.exceptURLPatterns),
  }
}

export function UserAgentPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<UserAgentData>('/servers/server/settings/locations/userAgent', 'location-user-agent')
  const [config, setConfig] = useState<UserAgentConfig>(normalizeConfig(null))
  const [isAdding, setIsAdding] = useState(false)
  const [batchKeywords, setBatchKeywords] = useState('')
  const [addingAction, setAddingAction] = useState('deny')
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(normalizeConfig(query.data.userAgentConfig))
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

  const isOn = config.isPrior && config.isOn

  function update(patch: Partial<UserAgentConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function cancelAdd() {
    setIsAdding(false)
    setBatchKeywords('')
    setAddingAction('deny')
  }

  function confirmAdd() {
    const keywords = batchKeywords
      .split(/\n/)
      .map((keyword) => keyword.trim())
      .filter((keyword, index, list) => list.indexOf(keyword) === index)
    if (keywords.length === 0) {
      return
    }
    const filter: UserAgentFilter = { keywords, action: addingAction }
    const filters = config.filters.map((item) => ({ ...item }))
    if (addingAction === 'allow') {
      let index = -1
      filters.forEach((item, itemIndex) => {
        if (item.action === 'allow') {
          index = itemIndex
        }
      })
      if (index < 0) {
        filters.unshift(filter)
      } else {
        filters.splice(index + 1, 0, filter)
      }
    } else {
      filters.push(filter)
    }
    update({ filters })
    cancelAdd()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/userAgent', {
        webId: query.data.webId,
        userAgentJSON: JSON.stringify(config),
        csrfToken: await getCsrfToken(),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-user-agent', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocationShell data={query.data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <PriorCheckbox checked={config.isPrior} onChange={(isPrior) => update({ isPrior })} />
          {config.isPrior ? (
            <tbody>
              <FormRow title="启用UA名单">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
                <p className="comment">选中后表示开启UserAgent名单.</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="UA名单">
                {config.filters.length > 0 ? (
                  <table className="ui table celled">
                    <thead>
                      <tr>
                        <th>UA关键词</th>
                        <th className="two wide">动作</th>
                        <th className="one op">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.filters.map((filter, index) => (
                        <tr key={index}>
                          <td style={{ background: 'white' }}>
                            {filter.keywords.map((keyword, keywordIndex) => (
                              <span key={keywordIndex} className="ui label basic tiny">
                                {keyword.length > 0 ? keyword : <span className="disabled">[空]</span>}
                              </span>
                            ))}
                          </td>
                          <td>
                            {filter.action === 'allow' ? <span className="green">允许</span> : <span className="red">不允许</span>}
                          </td>
                          <td>
                            <a href="" onClick={(event) => { event.preventDefault(); update({ filters: config.filters.filter((_, itemIndex) => itemIndex !== index) }) }}>
                              删除
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {isAdding ? (
                  <div style={{ marginTop: '0.5em' }}>
                    <table className="ui table definition">
                      <tbody>
                        <tr>
                          <td className="title">UA关键词</td>
                          <td>
                            <textarea
                              value={batchKeywords}
                              style={{ width: '20em' }}
                              placeholder="*浏览器标识*"
                              onChange={(event) => setBatchKeywords(event.target.value)}
                            />
                            <p className="comment">
                              每行一个关键词;不区分大小写,比如<code>Chrome</code>;支持<code>*</code>通配符,比如<code>*Firefox*</code>;
                              也支持空行关键词,表示空UserAgent.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td>动作</td>
                          <td>
                            <select className="ui dropdown auto-width" value={addingAction} onChange={(event) => setAddingAction(event.target.value)}>
                              <option value="deny">不允许</option>
                              <option value="allow">允许</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" className="ui button tiny" onClick={confirmAdd}>
                      保存
                    </button>{' '}
                    <a href="" title="取消" onClick={(event) => { event.preventDefault(); cancelAdd() }}>
                      <X size={12} />
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5em' }}>
                    <button className="ui button tiny" type="button" onClick={() => setIsAdding(true)}>
                      +
                    </button>
                  </div>
                )}
              </FormRow>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {isOn && moreOptionsVisible ? (
            <tbody>
              <FormRow title="例外URL">
                <UrlsPatternsBox patterns={config.exceptURLPatterns} onChange={(exceptURLPatterns) => update({ exceptURLPatterns })} />
                <p className="comment">如果填写了例外URL,表示这些URL跳过不做处理.</p>
              </FormRow>
              <FormRow title="限制URL">
                <UrlsPatternsBox patterns={config.onlyURLPatterns} onChange={(onlyURLPatterns) => update({ onlyURLPatterns })} />
                <p className="comment">如果填写了限制URL,表示只对这些URL进行处理;如果不填则表示支持所有的URL.</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
