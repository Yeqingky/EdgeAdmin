import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import type { KeyValueOption, WafCheckpoint, WafRule, WafRuleMetadata } from './common'

interface GeoOption {
  id: number
  name: string
  fullname?: string
}

const geoEndpoints: Record<string, { url: string; key: string }> = {
  geoCountryName: { url: '/ui/countryOptions', key: 'countries' },
  geoProvinceName: { url: '/ui/provinceOptions', key: 'provinces' },
  geoCityName: { url: '/ui/cityOptions', key: 'cities' },
  ispName: { url: '/ui/providerOptions', key: 'providers' },
}

function GeoValueSelect({ prefix, onSelect }: { prefix: string; onSelect: (name: string) => void }) {
  const endpoint = geoEndpoints[prefix]
  const query = useQuery({
    queryKey: ['geo-options', endpoint?.url],
    queryFn: async () => {
      if (!endpoint) {
        return { options: [] as GeoOption[] }
      }
      const data = await apiPost<Record<string, GeoOption[]>>(endpoint.url)
      return { options: data[endpoint.key] || [] }
    },
    enabled: Boolean(endpoint),
  })
  if (!endpoint) {
    return null
  }
  return (
    <div className="ui fields inline" style={{ marginTop: '0.5em' }}>
      <div className="ui field">
        <select
          className="ui dropdown"
          value=""
          onChange={(event) => {
            if (event.target.value) {
              onSelect(event.target.value)
              event.target.value = ''
            }
          }}
        >
          <option value="">点这里选择{prefix === 'ispName' ? 'ISP名称' : '名称'}</option>
          {(query.data?.options || []).map((option) => (
            <option key={option.id} value={option.name}>
              {option.fullname || option.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function WafRuleEditor({
  type,
  rule,
  onSaved,
  onCancel,
}: {
  type: string
  rule: WafRule | null
  onSaved: (rule: WafRule) => void
  onCancel: () => void
}) {
  const toast = useToast()
  const metadataQuery = useQuery({
    queryKey: ['waf-rule-metadata', type],
    queryFn: () => apiGet<WafRuleMetadata>('/servers/components/waf/createRulePopup', { type }),
    staleTime: 300_000,
  })
  const [prefix, setPrefix] = useState('')
  const [paramName, setParamName] = useState('')
  const [operator, setOperator] = useState('match')
  const [value, setValue] = useState('')
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(false)
  const [description, setDescription] = useState('')
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [composedOptionsJSON, setComposedOptionsJSON] = useState('{}')
  const [regexpTestOn, setRegexpTestOn] = useState(false)
  const [regexpTestBody, setRegexpTestBody] = useState('')
  const [regexpResult, setRegexpResult] = useState<{ isOk: boolean; message: string }>({ isOk: false, message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!rule) {
      return
    }
    const match = rule.param.match(/^\$\{\s*([^}]+)\s*}$/)
    const paramExpression = match ? match[1] : rule.param
    const dotIndex = paramExpression.indexOf('.')
    setPrefix(dotIndex > 0 ? paramExpression.slice(0, dotIndex) : paramExpression)
    setParamName(dotIndex > 0 ? paramExpression.slice(dotIndex + 1) : '')
    setOperator(rule.operator)
    setValue(rule.value)
    setIsCaseInsensitive(Boolean(rule.isCaseInsensitive))
    setDescription(rule.description || '')
    setComposedOptionsJSON(JSON.stringify(rule.checkpointOptions || {}, null, 2))
    const values: Record<string, string> = {}
    if (rule.checkpointOptions) {
      for (const [key, optionValue] of Object.entries(rule.checkpointOptions)) {
        values[key] = String(optionValue ?? '')
      }
    }
    setOptionValues(values)
  }, [rule])

  if (metadataQuery.isLoading) {
    return <LoadingBlock />
  }
  if (metadataQuery.isError || !metadataQuery.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const checkpoints = metadataQuery.data.checkpoints
  const operators = metadataQuery.data.operators
  const checkpoint = checkpoints.find((item) => item.prefix === prefix)
  const operatorDefinition = operators.find((item) => item.code === operator)
  const composedCheckpoints = checkpoints.filter((item) => item.isComposed)
  const plainCheckpoints = checkpoints.filter((item) => !item.isComposed)

  function changeCheckpoint(nextPrefix: string) {
    setPrefix(nextPrefix)
    setParamName('')
    setOptionValues({})
    const nextCheckpoint = checkpoints.find((item) => item.prefix === nextPrefix)
    if (!nextCheckpoint) {
      return
    }
    if (nextCheckpoint.dataType === 'bool' || nextCheckpoint.dataType === 'number') {
      setOperator('eq')
    } else {
      setOperator('match')
    }
    if (nextCheckpoint.options) {
      const values: Record<string, string> = {}
      for (const option of nextCheckpoint.options) {
        values[option.code] = String(option.value ?? '')
      }
      setOptionValues(values)
    }
  }

  async function testRegexp(body: string) {
    try {
      const result = await apiPost<{ result: { isOk: boolean; message: string } }>('/servers/components/waf/testRegexp', {
        regexp: value,
        body,
        isCaseInsensitive: isCaseInsensitive ? 1 : 0,
      })
      setRegexpResult(result.result)
    } catch (error) {
      setRegexpResult({ isOk: false, message: error instanceof Error ? error.message : '测试失败' })
    }
  }

  async function save() {
    if (!prefix) {
      toast('请选择参数', 'error')
      return
    }
    setSubmitting(true)
    try {
      if (checkpoint?.isComposed) {
        let parsedOptions: Record<string, unknown> = {}
        try {
          parsedOptions = JSON.parse(composedOptionsJSON) as Record<string, unknown>
        } catch {
          toast('配置选项不是有效的JSON', 'error')
          setSubmitting(false)
          return
        }
        setSubmitting(false)
        onSaved({
          id: rule?.id || 0,
          isOn: true,
          param: paramName ? `\${${prefix}.${paramName}}` : `\${${prefix}}`,
          operator,
          value,
          isCaseInsensitive,
          isComposed: true,
          checkpointOptions: parsedOptions,
          paramFilters: rule?.paramFilters || [],
          description,
        })
        return
      }

      const optionsJSON = (checkpoint?.options || []).map((option) => ({
        code: option.code,
        value: optionValues[option.code] ?? option.value ?? '',
      }))
      const result = await apiPost<{ rule: WafRule }>('/servers/components/waf/createRulePopup', {
        ruleId: rule?.id || 0,
        prefix,
        operator,
        param: paramName,
        optionsJSON: checkpoint && checkpoint.options && checkpoint.options.length > 0 ? JSON.stringify(optionsJSON) : '',
        paramFiltersJSON: rule?.paramFilters ? JSON.stringify(rule.paramFilters) : '',
        value,
        case: isCaseInsensitive ? 1 : '',
        description,
      })
      onSaved(result.rule)
    } catch (error) {
      toast(error instanceof Error ? error.message : '校验规则失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function renderOption(option: NonNullable<WafCheckpoint['options']>[number]) {
    const currentValue = optionValues[option.code] ?? option.value ?? ''
    if (option.type === 'options' && option.options) {
      return (
        <div className="ui fields inline" key={option.code}>
          <div className="ui field">
            <select
              className="ui dropdown"
              style={{ minWidth: `${option.size || 10}em` }}
              value={currentValue}
              onChange={(event) => setOptionValues((values) => ({ ...values, [option.code]: event.target.value }))}
            >
              {option.options.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">{option.rightLabel}</div>
        </div>
      )
    }
    return (
      <div className="ui fields inline" key={option.code}>
        <div className="ui field">
          <input
            type="text"
            placeholder={option.placeholder}
            maxLength={option.maxLength && option.maxLength > 0 ? option.maxLength : 1024}
            size={option.size}
            value={currentValue}
            onChange={(event) => setOptionValues((values) => ({ ...values, [option.code]: event.target.value }))}
          />
        </div>
        <div className="ui field">{option.rightLabel}</div>
      </div>
    )
  }

  return (
    <div className="ui segment">
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">参数 *</td>
            <td>
              <select className="ui dropdown auto-width" value={prefix} onChange={(event) => changeCheckpoint(event.target.value)}>
                <option value="">[选择参数]</option>
                {composedCheckpoints.length > 0 ? (
                  <optgroup label="特殊参数">
                    {composedCheckpoints.map((item) => (
                      <option key={item.prefix} value={item.prefix}>
                        {item.name} - [{item.prefix}]
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="通用参数">
                  {plainCheckpoints.map((item) => (
                    <option key={item.prefix} value={item.prefix}>
                      {item.name} - [{item.prefix}]
                    </option>
                  ))}
                </optgroup>
              </select>
              {checkpoint ? (
                <p className="comment">
                  <span className="ui label tiny basic">{`\${${checkpoint.prefix}}`}</span>
                  {checkpoint.description}
                </p>
              ) : null}
            </td>
          </tr>

          {checkpoint && checkpoint.hasParams ? (
            <tr>
              <td>参数名</td>
              <td>
                {checkpoint.params ? (
                  <select className="ui dropdown auto-width" value={paramName} onChange={(event) => setParamName(event.target.value)}>
                    {checkpoint.params.map((param: KeyValueOption) => (
                      <option key={param.value} value={param.value}>
                        {param.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" maxLength={100} value={paramName} onChange={(event) => setParamName(event.target.value)} />
                )}
              </td>
            </tr>
          ) : null}

          {checkpoint?.isComposed ? (
            <tr>
              <td>配置选项</td>
              <td>
                <textarea rows={4} value={composedOptionsJSON} onChange={(event) => setComposedOptionsJSON(event.target.value)} />
                <p className="comment">组合参数的配置选项，使用JSON格式，例如 {'{"period":60,"requests":100}'}。</p>
              </td>
            </tr>
          ) : null}

          {checkpoint && !checkpoint.isComposed && checkpoint.options && checkpoint.options.length > 0 ? (
            <tr>
              <td>配置选项</td>
              <td>
                {checkpoint.options.map((option) => (
                  <div key={option.code} style={{ marginBottom: '0.5em' }}>
                    <div>
                      <label>{option.name}</label>
                    </div>
                    {renderOption(option)}
                    {option.comment ? <p className="comment">{option.comment}</p> : null}
                  </div>
                ))}
              </td>
            </tr>
          ) : null}

          {checkpoint && !checkpoint.isComposed ? (
            <>
              <tr>
                <td>操作符 *</td>
                <td>
                  <select className="ui dropdown auto-width" value={operator} onChange={(event) => setOperator(event.target.value)}>
                    {operators.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {operatorDefinition ? (
                    <p className="comment" dangerouslySetInnerHTML={{ __html: operatorDefinition.description }} />
                  ) : null}
                </td>
              </tr>

              {operatorDefinition && operatorDefinition.dataType !== 'none' ? (
                <tr>
                  <td>对比值</td>
                  <td>
                    {checkpoint.dataType === 'bool' ? (
                      <select className="ui selectable auto-width" value={value} onChange={(event) => setValue(event.target.value)}>
                        <option value="">[请选择]</option>
                        <option value="1">是(1)</option>
                        <option value="0">否(0)</option>
                      </select>
                    ) : operatorDefinition.dataType === 'number' ? (
                      <input
                        type="number"
                        style={{ width: '16em' }}
                        maxLength={30}
                        placeholder="对比数字"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                      />
                    ) : operatorDefinition.dataType === 'regexp' ||
                      operatorDefinition.dataType === 'wildcard' ||
                      operatorDefinition.dataType === 'strings' ? (
                      <textarea rows={3} maxLength={4096} value={value} onChange={(event) => setValue(event.target.value)} />
                    ) : (
                      <input
                        type="text"
                        style={{ width: '16em' }}
                        maxLength={100}
                        placeholder="对比值"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                      />
                    )}
                    {operatorDefinition.dataType === 'strings' ? <p className="comment">每行一个数据。</p> : null}
                    {operatorDefinition.dataType === 'regexp' ? (
                      <p className="comment">
                        正则表达式中对于要匹配的内容中的特殊字符需要转义处理，比如把 <code>a换行b</code> 改成 <code>a|b</code>。
                      </p>
                    ) : null}
                    {geoEndpoints[checkpoint.prefix] ? (
                      <GeoValueSelect
                        prefix={checkpoint.prefix}
                        onSelect={(name) => setValue((current) => (current.length === 0 ? name : `${current}|${name}`))}
                      />
                    ) : null}
                  </td>
                </tr>
              ) : null}

              {operatorDefinition && operatorDefinition.dataType === 'regexp' ? (
                <tr>
                  <td>正则表达式测试</td>
                  <td>
                    {!regexpTestOn ? (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setRegexpTestOn(true)
                        }}
                      >
                        [输入测试字符串]
                      </a>
                    ) : (
                      <div>
                        <textarea
                          rows={3}
                          placeholder="输入要测试的内容"
                          value={regexpTestBody}
                          onChange={(event) => {
                            setRegexpTestBody(event.target.value)
                            void testRegexp(event.target.value)
                          }}
                        />
                        <p className="comment">
                          <span className={regexpResult.isOk ? 'green' : 'red'}>{regexpResult.message}</span>
                          &nbsp;
                          <a
                            href=""
                            onClick={(event) => {
                              event.preventDefault()
                              setRegexpTestOn(false)
                            }}
                          >
                            [结束测试]
                          </a>
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : null}

              {checkpoint.dataType !== 'bool' && operatorDefinition?.case !== 'none' ? (
                <tr>
                  <td>不区分大小写</td>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={isCaseInsensitive}
                        onChange={(event) => {
                          setIsCaseInsensitive(event.target.checked)
                          if (regexpTestOn) {
                            void testRegexp(regexpTestBody)
                          }
                        }}
                      />
                      <label />
                    </div>
                    <p className="comment">开启后忽略英文字母大小写</p>
                  </td>
                </tr>
              ) : null}
            </>
          ) : null}

          <tr>
            <td>备注</td>
            <td>
              <input type="text" value={description} onChange={(event) => setDescription(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>

      <div>
        <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="button" disabled={submitting} onClick={() => void save()}>
          确定
        </button>
        &nbsp;
        <button className="ui button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}
