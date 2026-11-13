import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { apiGet, apiPostForm, getCsrfToken } from '../../../api/client'
import { Modal } from '../common'
import '../../../../../web/views/@default/ui/selectCountriesPopup.css'
import '../../../../../web/views/@default/ui/selectProvincesPopup.css'

export interface RegionCountry {
  id: number
  name: string
  letter?: string
  isChecked?: boolean
}

export interface RegionProvince {
  id: number
  name: string
  isChecked?: boolean
}

interface CountriesData {
  countries: RegionCountry[]
}

interface ProvincesData {
  provinces: RegionProvince[]
}

function useCheckedIds(ids: number[]) {
  const [checkedIds, setCheckedIds] = useState<number[]>(ids)
  return {
    checkedIds,
    toggle(id: number) {
      setCheckedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    },
    setCheckedIds,
  }
}

export function CountrySelectBody({ initialIds, onSaved }: { initialIds: number[]; onSaved: (countries: RegionCountry[]) => void }) {
  const query = useQuery({
    queryKey: ['ui-select-countries', initialIds.join(',')],
    queryFn: () => apiGet<CountriesData>('/ui/selectCountriesPopup', { countryIds: initialIds.join(',') }),
  })
  const { checkedIds, toggle, setCheckedIds } = useCheckedIds(initialIds)
  const [selectedGroup, setSelectedGroup] = useState('ABC')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const countries = query.data?.countries ?? []
    setCheckedIds(countries.filter((country) => country.isChecked).map((country) => country.id))
  }, [query.data, setCheckedIds])

  const letterGroups = ['ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'YZ']
  const countries = query.data?.countries ?? []

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const body = new FormData()
      body.set('csrfToken', await getCsrfToken())
      for (const id of checkedIds) {
        body.append('countryIds', String(id))
      }
      const data = await apiPostForm<CountriesData>('/ui/selectCountriesPopup', body)
      onSaved(data.countries)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (query.isLoading) {
    return <p className="comment">正在加载中...</p>
  }

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {error.length > 0 ? <div className="ui message error">{error}</div> : null}
      <table className="ui table selectable">
        <tbody>
          <tr>
            <td>
              <div className="ui menu tabular tiny region-letter-group">
                {letterGroups.map((group) => (
                  <a
                    key={group}
                    href=""
                    className={`item${group === selectedGroup ? ' active' : ''}`}
                    onClick={(event) => { event.preventDefault(); setSelectedGroup(group) }}
                  >
                    {group}
                  </a>
                ))}
              </div>
              {selectedGroup.split('').map((letter) => {
                const letterCountries = countries.filter((country) => country.letter === letter)
                if (letterCountries.length === 0) {
                  return null
                }
                return (
                  <div key={letter} className="country-group">
                    <h4>{letter}</h4>
                    <div className="country-list">
                      {letterCountries.map((country) => (
                        <div key={country.id} className="item">
                          <div className="ui checkbox">
                            <input type="checkbox" checked={checkedIds.includes(country.id)} onChange={() => toggle(country.id)} />
                            <label>{country.name}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="clear" />
                  </div>
                )
              })}
            </td>
          </tr>
        </tbody>
      </table>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function ProvinceSelectBody({ initialIds, onSaved }: { initialIds: number[]; onSaved: (provinces: RegionProvince[]) => void }) {
  const query = useQuery({
    queryKey: ['ui-select-provinces', initialIds.join(',')],
    queryFn: () => apiGet<ProvincesData>('/ui/selectProvincesPopup', { provinceIds: initialIds.join(',') }),
  })
  const { checkedIds, toggle, setCheckedIds } = useCheckedIds(initialIds)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const provinces = query.data?.provinces ?? []
    setCheckedIds(provinces.filter((province) => province.isChecked).map((province) => province.id))
  }, [query.data, setCheckedIds])

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const body = new FormData()
      body.set('csrfToken', await getCsrfToken())
      for (const id of checkedIds) {
        body.append('provinceIds', String(id))
      }
      const data = await apiPostForm<ProvincesData>('/ui/selectProvincesPopup', body)
      onSaved(data.provinces)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (query.isLoading) {
    return <p className="comment">正在加载中...</p>
  }

  const provinces = query.data?.provinces ?? []

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {error.length > 0 ? <div className="ui message error">{error}</div> : null}
      <table className="ui table selectable">
        <tbody>
          <tr>
            <td>
              <div className="province-list">
                {provinces.map((province) => (
                  <div key={province.id} className="item">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={checkedIds.includes(province.id)} onChange={() => toggle(province.id)} />
                      <label>{province.name}</label>
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function CountrySelectionModal({
  countries,
  onClose,
  onChange,
}: {
  countries: RegionCountry[]
  onClose: () => void
  onChange: (countries: RegionCountry[]) => void
}) {
  return (
    <Modal title="选择国家和地区" onClose={onClose} width="48em">
      <CountrySelectBody
        initialIds={countries.map((country) => country.id)}
        onSaved={(selected) => {
          onChange(selected)
          onClose()
        }}
      />
    </Modal>
  )
}

export function ProvinceSelectionModal({
  provinces,
  onClose,
  onChange,
}: {
  provinces: RegionProvince[]
  onClose: () => void
  onChange: (provinces: RegionProvince[]) => void
}) {
  return (
    <Modal title="选择省份" onClose={onClose} width="48em">
      <ProvinceSelectBody
        initialIds={provinces.map((province) => province.id)}
        onSaved={(selected) => {
          onChange(selected)
          onClose()
        }}
      />
    </Modal>
  )
}

export function RegionTags({
  items,
  onRemove,
  onAdd,
  addTitle,
}: {
  items: { id: number; name: string }[]
  onRemove: (id: number) => void
  onAdd: () => void
  addTitle: string
}) {
  return (
    <div>
      {items.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {items.map((item) => (
            <span key={item.id} className="ui label tiny basic">
              {item.name}{' '}
              <a href="" title="删除" onClick={(event) => { event.preventDefault(); onRemove(item.id) }}>
                <X size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      <button className="ui button tiny" type="button" title={addTitle} onClick={onAdd}>
        <Plus size={12} />
      </button>
    </div>
  )
}
