import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CountrySelectBody, ProvinceSelectBody, type RegionCountry, type RegionProvince } from './RegionSelectors'

function parseIds(value: string | null): number[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function SelectCountriesPage() {
  const [searchParams] = useSearchParams()
  const initialIds = parseIds(searchParams.get('countryIds'))
  const [selected, setSelected] = useState<RegionCountry[]>([])

  return (
    <div>
      <h3>选择国家和地区</h3>
      <CountrySelectBody initialIds={initialIds} onSaved={setSelected} />
      {selected.length > 0 ? (
        <div className="ui message success">
          已选择：
          {selected.map((country) => (
            <span key={country.id} className="ui label small basic">
              {country.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SelectProvincesPage() {
  const [searchParams] = useSearchParams()
  const initialIds = parseIds(searchParams.get('provinceIds'))
  const [selected, setSelected] = useState<RegionProvince[]>([])

  return (
    <div>
      <h3>选择省份</h3>
      <ProvinceSelectBody initialIds={initialIds} onSaved={setSelected} />
      {selected.length > 0 ? (
        <div className="ui message success">
          已选择：
          {selected.map((province) => (
            <span key={province.id} className="ui label small basic">
              {province.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
