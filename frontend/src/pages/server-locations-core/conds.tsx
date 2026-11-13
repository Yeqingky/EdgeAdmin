import { useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { Modal } from './Modal'
import type { RequestCond, RequestCondGroup, RequestCondsConfig } from './types'

export interface CondTypeDefinition {
  type: string
  name: string
  param: string
  operator: string
  value: string
}

// 条件类型（对应 legacy window.REQUEST_COND_COMPONENTS）
export const condTypes: CondTypeDefinition[] = [
  { type: 'url-extension', name: '文件扩展名', param: '${requestPathLowerExtension}', operator: 'in', value: '[]' },
  { type: 'url-not-extension', name: '排除：URL扩展名', param: '${requestPathLowerExtension}', operator: 'not in', value: '[]' },
  { type: 'url-prefix', name: 'URL目录前缀', param: '${requestPath}', operator: 'prefix', value: '' },
  { type: 'url-not-prefix', name: '排除：URL前缀', param: '${requestPath}', operator: 'not', value: '' },
  { type: 'url-eq-index', name: '首页', param: '${requestPath}', operator: 'eq', value: '/' },
  { type: 'url-all', name: '全站', param: '${requestPath}', operator: 'prefix', value: '/' },
  { type: 'url-eq', name: 'URL完整路径', param: '${requestPath}', operator: 'eq', value: '' },
  { type: 'url-not-eq', name: '排除：URL完整路径', param: '${requestPath}', operator: 'not', value: '' },
  { type: 'url-regexp', name: 'URL正则匹配', param: '${requestPath}', operator: 'regexp', value: '' },
  { type: 'url-not-regexp', name: '排除：URL正则匹配', param: '${requestPath}', operator: 'not regexp', value: '' },
  { type: 'url-wildcard-match', name: 'URL通配符', param: '${requestPath}', operator: 'wildcard match', value: '' },
  { type: 'user-agent-regexp', name: 'User-Agent正则匹配', param: '${userAgent}', operator: 'regexp', value: '' },
  { type: 'user-agent-not-regexp', name: '排除：User-Agent正则匹配', param: '${userAgent}', operator: 'not regexp', value: '' },
  { type: 'params', name: '参数匹配', param: '${arg.name}', operator: 'eq', value: '' },
  { type: 'mime-type', name: '内容MimeType', param: '${responseContentType}', operator: 'mime type', value: '[]' },
]

// 运算符（对应 legacy shared.AllRequestOperators）
export const condOperators: { op: string; name: string }[] = [
  { op: 'regexp', name: '正则表达式匹配' },
  { op: 'not regexp', name: '正则表达式不匹配' },
  { op: 'wildcard match', name: '通配符匹配' },
  { op: 'wildcard not match', name: '通配符不匹配' },
  { op: 'eq', name: '字符串等于' },
  { op: 'prefix', name: '字符串前缀' },
  { op: 'suffix', name: '字符串后缀' },
  { op: 'contains', name: '字符串包含' },
  { op: 'not contains', name: '字符串不包含' },
  { op: 'not', name: '字符串不等于' },
  { op: 'in', name: '在列表中' },
  { op: 'not in', name: '不在列表中' },
  { op: 'file ext', name: '扩展名' },
  { op: 'mime type', name: 'MimeType' },
  { op: 'version range', name: '版本号范围' },
  { op: 'eq int', name: '整数等于' },
  { op: 'eq float', name: '浮点数等于' },
  { op: 'gt', name: '数字大于' },
  { op: 'gte', name: '数字大于等于' },
  { op: 'lt', name: '数字小于' },
  { op: 'lte', name: '数字小于等于' },
  { op: 'mod 10', name: '整数取模10' },
  { op: 'mod 100', name: '整数取模100' },
  { op: 'mod', name: '整数取模' },
  { op: 'eq ip', name: 'IP等于' },
  { op: 'gt ip', name: 'IP大于' },
  { op: 'gte ip', name: 'IP大于等于' },
  { op: 'lt ip', name: 'IP小于' },
  { op: 'lte ip', name: 'IP小于等于' },
  { op: 'ip range', name: 'IP范围' },
  { op: 'ip mod 10', name: 'IP取模10' },
  { op: 'ip mod 100', name: 'IP取模100' },
  { op: 'ip mod', name: 'IP取模' },
]

export function condTypeName(cond?: RequestCond | null): string {
  if (!cond) {
    return ''
  }
  const definition = condTypes.find((item) => item.type === cond.type)
  return definition ? definition.name : `${cond.param} ${cond.operator}`
}

function emptyConds(): RequestCondsConfig {
  return { isOn: true, connector: 'or', groups: [] }
}

function newCond(type: string): RequestCond {
  const definition = condTypes.find((item) => item.type === type) || condTypes[0]
  return {
    type: definition.type,
    isRequest: true,
    param: definition.param,
    operator: definition.operator,
    value: definition.value,
    isCaseInsensitive: false,
  }
}

// 条件分组编辑器（对应 legacy /servers/server/settings/conds/addGroupPopup）
function GroupEditor({ group, onSave, onCancel }: {
  group: RequestCondGroup
  onSave: (group: RequestCondGroup) => void
  onCancel: () => void
}) {
  const [connector, setConnector] = useState(group.connector || 'or')
  const [isOn, setIsOn] = useState(group.isOn !== false)
  const [description, setDescription] = useState(group.description || '')
  const [conds, setConds] = useState<RequestCond[]>(group.conds || [])

  function updateCond(index: number, patch: Partial<RequestCond>) {
    setConds((current) => current.map((cond, i) => (i === index ? { ...cond, ...patch } : cond)))
  }

  return (
    <Modal
      title="设置条件分组"
      onClose={onCancel}
      footer={
        <>
          <button className="ui button" type="button" onClick={onCancel}>取消</button>
          <button
            className="ui button primary"
            type="button"
            onClick={() => onSave({ ...group, isOn, connector, description, conds })}
          >
            保存
          </button>
        </>
      }
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">启用分组</td>
            <td>
              <div className="ui checkbox">
                <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
                <label />
              </div>
            </td>
          </tr>
          <tr>
            <td className="title">条件之间关系</td>
            <td>
              <select className="ui dropdown auto-width" value={connector} onChange={(event) => setConnector(event.target.value)}>
                <option value="and">和</option>
                <option value="or">或</option>
              </select>
              <p className="comment">
                {connector === 'or' ? '只要满足其中一个条件即可。' : '需要满足所有条件。'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="title">说明</td>
            <td>
              <input type="text" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>

      <h4>条件</h4>
      {conds.length === 0 ? <p className="comment">暂时还没有条件。</p> : null}
      {conds.map((cond, index) => (
        <div key={index} className="ui segment" style={{ padding: '0.8em' }}>
          <div className="ui fields inline">
            <div className="ui field">
              <select
                className="ui dropdown auto-width"
                value={cond.type || 'params'}
                onChange={(event) => {
                  const definition = condTypes.find((item) => item.type === event.target.value)
                  if (definition) {
                    updateCond(index, {
                      type: definition.type,
                      param: definition.param,
                      operator: definition.operator,
                      value: definition.value,
                    })
                  } else {
                    updateCond(index, { type: event.target.value })
                  }
                }}
              >
                {condTypes.map((definition) => (
                  <option key={definition.type} value={definition.type}>{definition.name}</option>
                ))}
              </select>
            </div>
            <div className="ui field">
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  setConds((current) => current.filter((_, i) => i !== index))
                }}
              >
                <X size={13} />
              </a>
            </div>
          </div>
          <div className="ui fields inline">
            <div className="ui field" style={{ minWidth: '16em' }}>
              <input
                type="text"
                value={cond.param}
                placeholder="参数，比如 ${requestPath}"
                onChange={(event) => updateCond(index, { param: event.target.value })}
              />
            </div>
            <div className="ui field">
              <select
                className="ui dropdown auto-width"
                value={cond.operator}
                onChange={(event) => updateCond(index, { operator: event.target.value })}
              >
                {condOperators.map((operator) => (
                  <option key={operator.op} value={operator.op}>{operator.name}</option>
                ))}
              </select>
            </div>
            <div className="ui field" style={{ minWidth: '16em' }}>
              <input
                type="text"
                value={cond.value}
                placeholder="对比值"
                onChange={(event) => updateCond(index, { value: event.target.value })}
              />
            </div>
            <div className="ui field">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={cond.isCaseInsensitive === true}
                  onChange={(event) => updateCond(index, { isCaseInsensitive: event.target.checked })}
                />
                <label>不区分大小写</label>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button
        className="ui button tiny"
        type="button"
        onClick={() => setConds((current) => [...current, newCond('url-extension')])}
      >
        <Plus size={12} /> 添加条件
      </button>
    </Modal>
  )
}

// 请求条件编辑器（对应 legacy http-request-conds-box）
export function RequestCondsEditor({ conds, onChange }: {
  conds?: RequestCondsConfig | null
  onChange: (conds: RequestCondsConfig) => void
}) {
  const config = conds || emptyConds()
  const groups = config.groups || []
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editingGroup, setEditingGroup] = useState<RequestCondGroup | null>(null)

  function saveGroup(group: RequestCondGroup) {
    const nextGroups = groups.slice()
    if (editingIndex >= 0) {
      nextGroups[editingIndex] = group
    } else {
      nextGroups.push(group)
    }
    onChange({ ...config, isOn: true, groups: nextGroups })
    setEditingGroup(null)
    setEditingIndex(-1)
  }

  return (
    <div>
      {groups.length > 0 ? (
        <table className="ui table">
          <tbody>
            {groups.map((group, groupIndex) => (
              <tr key={groupIndex}>
                <td className="title" style={{ borderBottom: groupIndex < groups.length - 1 ? '1px solid rgba(34,36,38,.15)' : undefined }}>
                  分组{groupIndex + 1}
                </td>
                <td style={{ background: 'white', wordBreak: 'break-all' }}>
                  {(group.conds || []).map((cond, index) => (
                    <span key={index} style={{ display: 'inline-block', marginBottom: '0.5em' }}>
                      <span className="ui label tiny">
                        {!cond.type || cond.type === 'params' ? (
                          <span>{cond.param} <var>{cond.operator}</var></span>
                        ) : (
                          <span>{condTypeName(cond)}: </span>
                        )}
                        {cond.value}
                        {cond.isCaseInsensitive ? <sup title="不区分大小写">*</sup> : null}
                      </span>
                      {index < (group.conds || []).length - 1 ? <span> {group.connector || 'or'} &nbsp;</span> : null}
                    </span>
                  ))}
                </td>
                <td style={{ width: '5em', background: 'white' }}>
                  <a
                    href=""
                    title="修改分组"
                    onClick={(event) => {
                      event.preventDefault()
                      setEditingIndex(groupIndex)
                      setEditingGroup({ ...group, conds: (group.conds || []).slice() })
                    }}
                  >
                    <Pencil size={12} />
                  </a>{' '}
                  <a
                    href=""
                    title="删除分组"
                    onClick={(event) => {
                      event.preventDefault()
                      onChange({ ...config, isOn: true, groups: groups.filter((_, i) => i !== groupIndex) })
                    }}
                  >
                    <X size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {groups.length > 1 ? (
        <table className="ui table">
          <tbody>
            <tr>
              <td className="title">分组之间关系</td>
              <td>
                <select
                  className="ui dropdown auto-width"
                  value={config.connector || 'or'}
                  onChange={(event) => onChange({ ...config, isOn: true, connector: event.target.value })}
                >
                  <option value="and">和</option>
                  <option value="or">或</option>
                </select>
                <p className="comment">
                  {config.connector === 'and' ? '需要满足所有条件分组。' : '只要满足其中一个条件分组即可。'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
      <div>
        <button
          className="ui button tiny basic"
          type="button"
          onClick={() => {
            setEditingIndex(-1)
            setEditingGroup({ isOn: true, connector: 'or', conds: [] })
          }}
        >
          +添加分组
        </button>
      </div>
      {editingGroup ? (
        <GroupEditor group={editingGroup} onSave={saveGroup} onCancel={() => { setEditingGroup(null); setEditingIndex(-1) }} />
      ) : null}
    </div>
  )
}

// 条件只读展示（对应 legacy http-request-conds-view）
export function RequestCondsView({ conds }: { conds?: RequestCondsConfig | null }) {
  if (!conds || !conds.groups || conds.groups.length === 0) {
    return null
  }
  return (
    <div>
      {conds.groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {(group.conds || []).map((cond, index) => (
            <span key={index}>
              <span className="ui label tiny">
                {!cond.type || cond.type === 'params' ? (
                  <span>{cond.param} <var>{cond.operator}</var></span>
                ) : (
                  <span>{condTypeName(cond)}: </span>
                )}
                {cond.value}
              </span>
              {index < (group.conds || []).length - 1 ? <span> {group.connector || 'or'} &nbsp;</span> : null}
            </span>
          ))}
          {groupIndex < conds.groups.length - 1 ? <div className="ui divider" /> : null}
        </div>
      ))}
    </div>
  )
}
