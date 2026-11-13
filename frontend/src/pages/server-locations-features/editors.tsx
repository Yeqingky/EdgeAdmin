import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { Checkbox } from '../../components/form'
import type { RequestCond, RequestCondGroup, RequestCondsConfig, SizeCapacity, UrlPattern } from './types'

export function Modal({ title, onClose, children, width = '40em' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex', zIndex: 2000 }}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', width, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <button className="ui button tiny basic" type="button" onClick={onClose} title="关闭">
            <X size={14} />
          </button>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}

export function PriorCheckbox({ checked, onChange, description }: { checked: boolean; onChange: (checked: boolean) => void; description?: string }) {
  return (
    <tbody>
      <tr className={checked ? 'active' : undefined}>
        <td className="title">打开独立配置</td>
        <td>
          <div className="ui toggle checkbox">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <label className="red" />
          </div>
          <p className="comment">
            {checked ? <strong>[已打开]</strong> : null} {description || '打开后可以覆盖父级或子级配置'}。
          </p>
        </td>
      </tr>
    </tbody>
  )
}

export function MoreOptionsIndicator({ label = '更多选项', onClick }: { label?: string; onClick: () => void }) {
  return (
    <div style={{ margin: '0.6em 0' }}>
      <a href="" onClick={(event) => { event.preventDefault(); onClick() }}>
        {label}
      </a>
    </div>
  )
}

const PATTERN_TYPE_NAMES: Record<string, string> = {
  wildcard: '通配符',
  regexp: '正则',
  images: '常见图片文件',
  audios: '常见音频文件',
  videos: '常见视频文件',
}

export function UrlsPatternsBox({ patterns, onChange }: { patterns: UrlPattern[]; onChange: (patterns: UrlPattern[]) => void }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [type, setType] = useState('wildcard')
  const [pattern, setPattern] = useState('')
  const [error, setError] = useState('')

  function startAdd() {
    setType('wildcard')
    setPattern('')
    setEditingIndex(-1)
    setError('')
    setIsAdding(true)
  }

  function startEdit(index: number) {
    const target = patterns[index]
    setType(target.type || 'wildcard')
    setPattern(target.pattern || '')
    setEditingIndex(index)
    setError('')
    setIsAdding(true)
  }

  function cancel() {
    setIsAdding(false)
    setEditingIndex(-1)
    setPattern('')
    setError('')
  }

  function confirm() {
    const value = pattern.trim()
    if ((type === 'wildcard' || type === 'regexp') && value.length === 0) {
      setError('请输入URL')
      return
    }
    if ((type === 'wildcard' || type === 'regexp') && value.includes('?')) {
      setError(`${type === 'wildcard' ? '通配符' : '正则表达式'}中不能包含问号（?）及问号以后的内容`)
      return
    }
    const next = patterns.map((item) => ({ ...item }))
    if (editingIndex >= 0) {
      next[editingIndex] = { type, pattern: value }
    } else {
      next.push({ type, pattern: value })
    }
    onChange(next)
    cancel()
  }

  function remove(index: number) {
    onChange(patterns.filter((_, itemIndex) => itemIndex !== index))
    cancel()
  }

  return (
    <div>
      {patterns.length > 0 ? (
        <div>
          {patterns.map((item, index) => (
            <div key={`${item.pattern}-${index}`} className="ui label basic small" style={{ marginBottom: '0.4em' }}>
              <span className="grey" style={{ fontWeight: 'normal' }}>
                [{PATTERN_TYPE_NAMES[item.type] || item.type}]
              </span>{' '}
              <span>{item.pattern}</span>
              <a href="" title="修改" style={{ marginLeft: '0.5em' }} onClick={(event) => { event.preventDefault(); startEdit(index) }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" style={{ marginLeft: '0.4em' }} onClick={(event) => { event.preventDefault(); remove(index) }}>
                <Trash2 size={11} />
              </a>
            </div>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {isAdding ? (
        <div className="ui fields inline" style={{ marginTop: '0.5em' }}>
          <div className="ui field">
            <select className="ui dropdown" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="wildcard">通配符</option>
              <option value="regexp">正则表达式</option>
              <option value="images">常见图片</option>
              <option value="audios">常见音频</option>
              <option value="videos">常见视频</option>
            </select>
          </div>
          {type === 'wildcard' || type === 'regexp' ? (
            <div className="ui field">
              <input
                type="text"
                size={36}
                value={pattern}
                placeholder={type === 'wildcard' ? '可以使用星号（*）通配符，不区分大小写' : '可以使用正则表达式，不区分大小写'}
                onChange={(event) => setPattern(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirm()
                  }
                }}
              />
            </div>
          ) : null}
          <div className="ui field">
            <button className="ui button tiny" type="button" onClick={confirm}>
              确定
            </button>
            <a href="" title="取消" style={{ marginLeft: '0.5em' }} onClick={(event) => { event.preventDefault(); cancel() }}>
              <X size={12} />
            </a>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '0.5em' }}>
          <button className="ui button tiny basic" type="button" onClick={startAdd}>
            +
          </button>
        </div>
      )}
      {error ? <p className="comment"><span className="red">{error}</span></p> : null}
    </div>
  )
}

export function DomainsBox({ domains, onChange }: { domains: string[]; onChange: (domains: string[]) => void }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [addingDomain, setAddingDomain] = useState('')
  const [batchDomains, setBatchDomains] = useState('')
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [error, setError] = useState('')

  function startAdd() {
    setIsAdding(true)
    setEditingIndex(-1)
    setAddingDomain('')
    setBatchDomains('')
    setMode('single')
    setError('')
  }

  function startEdit(index: number) {
    setIsAdding(true)
    setEditingIndex(index)
    setAddingDomain(domains[index] || '')
    setMode('single')
    setError('')
  }

  function cancel() {
    setIsAdding(false)
    setEditingIndex(-1)
    setAddingDomain('')
    setBatchDomains('')
    setMode('single')
    setError('')
  }

  function confirm() {
    if (mode === 'batch') {
      const values = batchDomains
        .split('\n')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      if (values.length === 0) {
        setError('请输入要添加的域名')
        return
      }
      onChange([...domains, ...values])
      cancel()
      return
    }

    let value = addingDomain.replace(/\s/g, '')
    if (value.length === 0) {
      setError('请输入要添加的域名')
      return
    }
    if (value[0] === '~') {
      try {
        new RegExp(value.substring(1))
      } catch (exception) {
        setError(`正则表达式错误：${exception instanceof Error ? exception.message : String(exception)}`)
        return
      }
    }
    const next = [...domains]
    if (editingIndex >= 0) {
      next[editingIndex] = value
    } else if (/[，、,;]/.test(value)) {
      value.split(/[，、,;]/).forEach((piece) => {
        if (piece.length > 0) {
          next.push(piece)
        }
      })
    } else {
      next.push(value)
    }
    onChange(next)
    cancel()
  }

  function remove(index: number) {
    onChange(domains.filter((_, itemIndex) => itemIndex !== index))
    cancel()
  }

  return (
    <div>
      {domains.length > 0 ? (
        <div>
          {domains.map((domain, index) => (
            <span key={`${domain}-${index}`} className="ui label small basic">
              {domain.length > 0 && domain[0] === '~' ? <span className="grey" style={{ fontStyle: 'normal' }}>[正则] </span> : null}
              {domain.length > 0 && domain[0] === '.' ? <span className="grey" style={{ fontStyle: 'normal' }}>[后缀] </span> : null}
              {domain.length > 0 && domain[0] === '*' ? <span className="grey" style={{ fontStyle: 'normal' }}>[泛域名] </span> : null}
              {domain}
              <a href="" title="修改" style={{ marginLeft: '0.4em' }} onClick={(event) => { event.preventDefault(); startEdit(index) }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" style={{ marginLeft: '0.4em' }} onClick={(event) => { event.preventDefault(); remove(index) }}>
                <Trash2 size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {isAdding ? (
        <div>
          <div className="ui fields">
            {editingIndex < 0 ? (
              <div className="ui field">
                <select className="ui dropdown" value={mode} onChange={(event) => setMode(event.target.value === 'batch' ? 'batch' : 'single')}>
                  <option value="single">单个</option>
                  <option value="batch">批量</option>
                </select>
              </div>
            ) : null}
            <div className="ui field">
              {mode === 'batch' && editingIndex < 0 ? (
                <textarea
                  cols={30}
                  value={batchDomains}
                  placeholder={'example1.com\nexample2.com\n每行一个域名'}
                  onChange={(event) => setBatchDomains(event.target.value)}
                />
              ) : (
                <input
                  type="text"
                  size={30}
                  maxLength={100}
                  value={addingDomain}
                  placeholder="example.com、*.example.com"
                  onChange={(event) => setAddingDomain(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      confirm()
                    } else if (event.key === 'Escape') {
                      event.preventDefault()
                      cancel()
                    }
                  }}
                />
              )}
            </div>
            <div className="ui field">
              <button className="ui button tiny" type="button" onClick={confirm}>
                确定
              </button>
              <a href="" title="取消" style={{ marginLeft: '0.5em' }} onClick={(event) => { event.preventDefault(); cancel() }}>
                <X size={12} />
              </a>
            </div>
          </div>
          <p className="comment">
            支持普通域名（<code>example.com</code>）、泛域名（<code>*.example.com</code>）、域名后缀（以点号开头，如<code>.example.com</code>）和正则表达式（以波浪号开头，如<code>~.*.example.com</code>）。
          </p>
          <div className="ui divider" />
        </div>
      ) : null}
      {!isAdding ? (
        <div style={{ marginTop: '0.5em' }}>
          <button className="ui button tiny" type="button" onClick={startAdd}>
            +
          </button>
        </div>
      ) : null}
      {error ? <p className="comment"><span className="red">{error}</span></p> : null}
    </div>
  )
}

export function ValuesBox({ values, onChange, placeholder }: { values: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [value, setValue] = useState('')

  function add() {
    const next = value.trim()
    if (next.length === 0) {
      return
    }
    const list = next.split(/\n/).map((item) => item.trim()).filter((item) => item.length > 0)
    const result = [...values]
    list.forEach((item) => {
      if (!result.includes(item)) {
        result.push(item)
      }
    })
    onChange(result)
    setValue('')
  }

  return (
    <div>
      {values.length > 0 ? (
        <div>
          {values.map((item, index) => (
            <span key={`${item}-${index}`} className="ui label small basic">
              {item}
              <a
                href=""
                title="删除"
                style={{ marginLeft: '0.4em' }}
                onClick={(event) => {
                  event.preventDefault()
                  onChange(values.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                <Trash2 size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      <div className="ui fields inline">
        <div className="ui field">
          <input type="text" size={28} value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} />
        </div>
        <div className="ui field">
          <button className="ui button tiny" type="button" onClick={add}>
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

const CAPACITY_UNITS: Array<[string, string]> = [
  ['byte', '字节'],
  ['kb', 'KiB'],
  ['mb', 'MiB'],
  ['gb', 'GiB'],
  ['tb', 'TiB'],
  ['pb', 'PiB'],
  ['eb', 'EiB'],
]

export function SizeCapacityBox({
  value,
  onChange,
  units = [],
  size = 6,
}: {
  value: SizeCapacity
  onChange: (value: SizeCapacity) => void
  units?: string[]
  size?: number
}) {
  const countString = value.count >= 0 ? String(value.count) : ''
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          size={size}
          maxLength={10}
          value={countString}
          onChange={(event) => {
            const text = event.target.value.trim()
            if (text.length === 0) {
              onChange({ ...value, count: -1 })
              return
            }
            const count = Number(text)
            onChange({ ...value, count: Number.isNaN(count) ? -1 : Math.trunc(count) })
          }}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={value.unit} onChange={(event) => onChange({ ...value, unit: event.target.value })}>
          {CAPACITY_UNITS.filter(([code]) => units.length === 0 || units.includes(code)).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

const COND_OPERATORS: Array<[string, string]> = [
  ['eq', '字符串等于'],
  ['not', '字符串不等于'],
  ['prefix', '字符串前缀'],
  ['suffix', '字符串后缀'],
  ['contains', '字符串包含'],
  ['not contains', '字符串不包含'],
  ['regexp', '正则匹配'],
  ['not regexp', '正则不匹配'],
  ['wildcard match', '通配符匹配'],
  ['wildcard not match', '通配符不匹配'],
  ['eq int', '整数等于'],
  ['eq float', '浮点数等于'],
  ['gt', '大于'],
  ['gte', '大于等于'],
  ['lt', '小于'],
  ['lte', '小于等于'],
  ['mod', '取模'],
  ['mod 10', '取模10'],
  ['mod 100', '取模100'],
  ['in', '在列表中'],
  ['not in', '不在列表中'],
  ['file ext', '文件扩展名'],
  ['mime type', 'MimeType'],
  ['eq ip', 'IP等于'],
  ['gt ip', 'IP大于'],
  ['gte ip', 'IP大于等于'],
  ['lt ip', 'IP小于'],
  ['lte ip', 'IP小于等于'],
  ['ip range', 'IP范围'],
  ['version range', '版本范围'],
]

function newCond(): RequestCond {
  return { type: '', param: '', operator: 'eq', value: '', isReverse: false, isCaseInsensitive: false }
}

function CondGroupForm({ group, onSave, onClose }: { group: RequestCondGroup; onSave: (group: RequestCondGroup) => void; onClose: () => void }) {
  const [connector, setConnector] = useState(group.connector || 'and')
  const [description, setDescription] = useState(group.description || '')
  const [conds, setConds] = useState<RequestCond[]>(group.conds.map((cond) => ({ ...cond })))

  function updateCond(index: number, patch: Partial<RequestCond>) {
    setConds((current) => current.map((cond, condIndex) => (condIndex === index ? { ...cond, ...patch } : cond)))
  }

  return (
    <Modal title="添加分组 / 修改分组" onClose={onClose} width="46em">
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">条件之间关系</td>
            <td>
              <select className="ui dropdown" value={connector} onChange={(event) => setConnector(event.target.value)}>
                <option value="and">和</option>
                <option value="or">或</option>
              </select>
            </td>
          </tr>
          <tr>
            <td className="title">说明</td>
            <td>
              <input type="text" value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
      <table className="ui table celled">
        <thead>
          <tr>
            <th>参数</th>
            <th className="three wide">运算符</th>
            <th>对比值</th>
            <th className="two wide">选项</th>
            <th className="one wide op">操作</th>
          </tr>
        </thead>
        <tbody>
          {conds.map((cond, index) => (
            <tr key={index}>
              <td>
                <input type="text" value={cond.param} placeholder="比如 ${arg.name}" onChange={(event) => updateCond(index, { param: event.target.value })} />
              </td>
              <td>
                <select className="ui dropdown" value={cond.operator} onChange={(event) => updateCond(index, { operator: event.target.value })}>
                  {COND_OPERATORS.some(([code]) => code === cond.operator) ? null : <option value={cond.operator}>{cond.operator}</option>}
                  {COND_OPERATORS.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input type="text" value={cond.value} onChange={(event) => updateCond(index, { value: event.target.value })} />
              </td>
              <td>
                <Checkbox label="不区分大小写" checked={!!cond.isCaseInsensitive} onChange={(checked) => updateCond(index, { isCaseInsensitive: checked })} />
                <Checkbox label="反向匹配" checked={!!cond.isReverse} onChange={(checked) => updateCond(index, { isReverse: checked })} />
              </td>
              <td>
                <a href="" onClick={(event) => { event.preventDefault(); setConds(conds.filter((_, condIndex) => condIndex !== index)) }}>
                  <Trash2 size={12} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginBottom: '1em' }}>
        <button className="ui button tiny basic" type="button" onClick={() => setConds([...conds, newCond()])}>
          + 添加条件
        </button>
      </div>
      <button
        className="ui button primary"
        type="button"
        onClick={() => {
          onSave({ ...group, connector, description, conds })
          onClose()
        }}
      >
        保存
      </button>
    </Modal>
  )
}

export function CondsBox({ conds, onChange }: { conds: RequestCondsConfig; onChange: (conds: RequestCondsConfig) => void }) {
  const [editingGroupIndex, setEditingGroupIndex] = useState(-1)
  const [isAddingGroup, setIsAddingGroup] = useState(false)

  function saveGroup(group: RequestCondGroup) {
    const groups = conds.groups.map((item) => ({ ...item }))
    if (editingGroupIndex >= 0) {
      groups[editingGroupIndex] = group
    } else {
      groups.push(group)
    }
    onChange({ ...conds, groups })
    setEditingGroupIndex(-1)
    setIsAddingGroup(false)
  }

  function typeName(cond: RequestCond) {
    if (!cond.type || cond.type === 'params') {
      return `${cond.param} ${cond.operator}`
    }
    return cond.type
  }

  return (
    <div>
      {conds.groups.length > 0 ? (
        <div>
          <table className="ui table">
            <tbody>
              {conds.groups.map((group, groupIndex) => (
                <tr key={groupIndex}>
                  <td className="title">分组{groupIndex + 1}</td>
                  <td style={{ background: 'white', wordBreak: 'break-all' }}>
                    {group.conds.map((cond, index) => (
                      <span key={index} style={{ display: 'inline-block', marginBottom: '0.5em' }}>
                        <span className="ui label tiny">
                          <span style={{ fontStyle: 'normal' }}>{typeName(cond)}</span> {cond.value}
                          {cond.isCaseInsensitive ? <sup title="不区分大小写">*</sup> : null}
                        </span>
                        {index < group.conds.length - 1 ? <var style={{ fontStyle: 'normal', margin: '0 0.3em' }}>{group.connector || 'and'}</var> : null}
                      </span>
                    ))}
                  </td>
                  <td style={{ width: '5em', background: 'white' }}>
                    <a href="" title="修改分组" onClick={(event) => { event.preventDefault(); setEditingGroupIndex(groupIndex) }}>
                      <Pencil size={12} />
                    </a>{' '}
                    <a
                      href=""
                      title="删除分组"
                      onClick={(event) => {
                        event.preventDefault()
                        onChange({ ...conds, groups: conds.groups.filter((_, itemIndex) => itemIndex !== groupIndex) })
                      }}
                    >
                      <Trash2 size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ui divider" />
        </div>
      ) : null}
      {conds.groups.length > 1 ? (
        <table className="ui table">
          <tbody>
            <tr>
              <td className="title">分组之间关系</td>
              <td>
                <select className="ui dropdown" value={conds.connector} onChange={(event) => onChange({ ...conds, connector: event.target.value })}>
                  <option value="and">和</option>
                  <option value="or">或</option>
                </select>
                <p className="comment">{conds.connector === 'or' ? '只要满足其中一个条件分组即可。' : '需要满足所有条件分组。'}</p>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
      <div>
        <button className="ui button tiny basic" type="button" onClick={() => setIsAddingGroup(true)}>
          + 添加分组
        </button>
      </div>
      {editingGroupIndex >= 0 ? (
        <CondGroupForm
          group={conds.groups[editingGroupIndex]}
          onSave={saveGroup}
          onClose={() => setEditingGroupIndex(-1)}
        />
      ) : null}
      {isAddingGroup ? (
        <CondGroupForm
          group={{ isOn: true, connector: 'and', conds: [newCond()], isReverse: false, description: '' }}
          onSave={saveGroup}
          onClose={() => setIsAddingGroup(false)}
        />
      ) : null}
    </div>
  )
}
