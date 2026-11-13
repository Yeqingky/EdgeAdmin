import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { MoreOptionsRow, PriorRow } from './fields'
import { LocationShell } from './LocationShell'
import type { CharsetConfig, CharsetItem, LocationPageBase } from './types'

interface CharsetData extends LocationPageBase {
  charsetConfig?: CharsetConfig | null
  usualCharsets: CharsetItem[]
  allCharsets: CharsetItem[]
}

function CharsetForm({ data }: { data: CharsetData }) {
  const toast = useToast()
  const config = data.charsetConfig
  const [isPrior, setIsPrior] = useState(config?.isPrior ?? false)
  const [isOn, setIsOn] = useState(config?.isOn ?? false)
  const [charset, setCharset] = useState(config?.charset || '')
  const [isUpper, setIsUpper] = useState(config?.isUpper ?? false)
  const [force, setForce] = useState(config?.force ?? false)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/charset', {
        webId: data.webId,
        charsetJSON: JSON.stringify({ isPrior, isOn, charset, isUpper, force }),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const visible = isPrior

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <PriorRow isPrior={isPrior} onChange={setIsPrior} />
        {visible ? (
          <FormRow title="启用字符编码">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        ) : null}
      </FormTable>

      {visible && isOn ? (
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">选择字符编码</td>
              <td>
                <Select style={{ width: '20em' }} value={charset} onChange={(event) => setCharset(event.target.value)}>
                  <option value="">[未选择]</option>
                  <optgroup label="常用字符编码" />
                  {data.usualCharsets.map((item) => (
                    <option key={`usual-${item.charset}`} value={item.charset}>{item.charset}({item.name})</option>
                  ))}
                  <optgroup label="全部字符编码" />
                  {data.allCharsets.map((item) => (
                    <option key={`all-${item.charset}`} value={item.charset}>{item.charset}({item.name})</option>
                  ))}
                </Select>
              </td>
            </tr>
          </tbody>
          <MoreOptionsRow visible={advancedVisible} onToggle={() => setAdvancedVisible((value) => !value)} />
          {advancedVisible ? (
            <tbody>
              <tr>
                <td>强制替换</td>
                <td>
                  <Checkbox checked={force} onChange={setForce} />
                  <p className="comment">选中后,表示强制覆盖已经设置的字符集;不选中,表示如果源站已经设置了字符集,则保留不修改.</p>
                </td>
              </tr>
              <tr>
                <td>字符编码大写</td>
                <td>
                  <Checkbox checked={isUpper} onChange={setIsUpper} />
                  <p className="comment">选中后将指定的字符编码转换为大写,比如默认为<code>utf-8</code>,选中后将改为<code>UTF-8</code>.</p>
                </td>
              </tr>
            </tbody>
          ) : null}
        </table>
      ) : null}

      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function LocationCharsetPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-charset', serverId, locationId],
    queryFn: () =>
      apiGet<CharsetData>('/servers/server/settings/locations/charset', {
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
      <CharsetForm data={data} />
    </LocationShell>
  )
}
