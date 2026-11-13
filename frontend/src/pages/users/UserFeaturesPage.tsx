import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { UserTabs } from './UserTabs'

interface Feature {
  name: string
  code: string
  description: string
  isChecked: boolean
}

export function UserFeaturesPage() {
  const [params] = useSearchParams()
  const userId = Number(params.get('userId') || 0)
  const toast = useToast()
  const query = useQuery({ queryKey: ['user-features', userId], queryFn: () => apiGet<{ features: Feature[] }>('/users/features', { userId }) })
  const [features, setFeatures] = useState<Feature[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setFeatures(query.data.features)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/users/features', {
        csrfToken: await getCsrfToken(),
        userId,
        codes: features.filter((feature) => feature.isChecked).map((feature) => feature.code),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <UserTabs userId={userId} active="feature" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="功能列表">
            <div className="feature-boxes">
              {features.map((feature) => (
                <div className="feature-box" key={feature.code}>
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={feature.isChecked}
                      onChange={(event) =>
                        setFeatures((current) =>
                          current.map((item) => (item.code === feature.code ? { ...item, isChecked: event.target.checked } : item)),
                        )
                      }
                    />
                    <label>{feature.name}</label>
                  </div>
                  <p className="comment">{feature.description}</p>
                </div>
              ))}
            </div>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
