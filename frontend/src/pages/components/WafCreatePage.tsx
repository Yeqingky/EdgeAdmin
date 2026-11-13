import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { postFormValues } from './common'

interface TemplateGroup {
  code: string
  name: string
  isOn: boolean
}

interface WafCreateData {
  groups: TemplateGroup[]
}

export function WafCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['waf-create'],
    queryFn: () => apiGet<WafCreateData>('/servers/components/waf/createPopup'),
  })
  const [name, setName] = useState('')
  const [groupCodes, setGroupCodes] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setGroupCodes(query.data.groups.filter((group) => group.isOn).map((group) => group.code))
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入策略名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      const created = await postFormValues<{ firewallPolicy: { id: number; name: string } }>('/servers/components/waf/createPopup', {
        name,
        groupCodes,
        description,
        isOn: isOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/servers/components/waf/policy?firewallPolicyId=${created.firewallPolicy.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>创建WAF策略</h3>
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
                <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                <p className="comment">给策略起一个容易识别的名字。</p>
              </td>
            </tr>
            <tr>
              <td>启用预置的规则</td>
              <td>
                {query.data.groups.map((group) => (
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
                <p className="comment">可以启用一些我们预置的规则组。</p>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setMoreOptions((current) => !current)
                  }}
                >
                  {moreOptions ? '[收起选项]' : '[更多选项]'}
                </a>
              </td>
            </tr>
            {moreOptions ? (
              <>
                <tr>
                  <td>描述</td>
                  <td>
                    <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td>启用当前策略</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
                      <label />
                    </div>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
          &nbsp;
          <button className="ui button" type="button" onClick={() => navigate('/servers/components/waf')}>
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
