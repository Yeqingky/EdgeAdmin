import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../../../api/client'
import { Checkbox } from '../../../../components/form'
import { useToast } from '../../../../components/Toast'
import {
  GroupFirstMenu,
  PriorRow,
  SettingsLeftMenu,
  postForm,
  postFormWithCsrf,
  type FormValue,
  type GroupBasic,
  type LeftMenuItem,
} from '../../shared'

export type JsonObject = Record<string, unknown>

export function boolField(config: JsonObject, key: string, fallback = false): boolean {
  const value = config[key]
  return typeof value === 'boolean' ? value : fallback
}

export function stringField(config: JsonObject, key: string, fallback = ''): string {
  const value = config[key]
  return typeof value === 'string' ? value : fallback
}

export function numberField(config: JsonObject, key: string, fallback = 0): number {
  const value = config[key]
  return typeof value === 'number' ? value : fallback
}

export function objectField<T>(config: JsonObject, key: string, fallback: T): T {
  const value = config[key]
  if (value != null && typeof value === 'object') {
    return value as T
  }
  return fallback
}

export function arrayField<T>(config: JsonObject, key: string, fallback: T[] = []): T[] {
  const value = config[key]
  return Array.isArray(value) ? (value as T[]) : fallback
}

export function SettingsShell({
  group,
  leftMenuItems,
  children,
}: {
  group: GroupBasic
  leftMenuItems?: LeftMenuItem[]
  children: ReactNode
}) {
  return (
    <div>
      <GroupFirstMenu group={group} active="settings" />
      <SettingsLeftMenu items={leftMenuItems} />
      <div className="right-box without-menu">{children}</div>
    </div>
  )
}

export function PriorEnableRows({
  config,
  onChange,
  label,
  comment,
}: {
  config: JsonObject
  onChange: (next: JsonObject) => void
  label: string
  comment?: ReactNode
}) {
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')
  return (
    <>
      <PriorRow config={{ isPrior, isOn }} onChange={(next) => onChange({ ...config, isPrior: next.isPrior })} />
      {isPrior ? (
        <tbody>
          <tr>
            <td className="title">{label}</td>
            <td>
              <Checkbox checked={isOn} onChange={(checked) => onChange({ ...config, isOn: checked })} />
              {comment ? <p className="comment">{comment}</p> : null}
            </td>
          </tr>
        </tbody>
      ) : null}
    </>
  )
}

export function useGroupId(): number {
  const [searchParams] = useSearchParams()
  return Number(searchParams.get('groupId') || 0) || 0
}

export function useSettingsQuery<T>(path: string, groupId: number) {
  return useQuery({
    queryKey: [path, groupId],
    queryFn: () => apiGet<T>(path, { groupId }),
    enabled: groupId > 0,
  })
}

export function useSaveSettings(path: string, groupId: number, withCsrf = false) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: Record<string, FormValue>) =>
      withCsrf ? postFormWithCsrf(path, payload) : postForm(path, payload),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: [path, groupId] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })
}

export function useJsonConfig(value: JsonObject | null | undefined, fallback: JsonObject) {
  const [config, setConfig] = useState<JsonObject | null>(null)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setConfig({ ...fallback, ...value })
    } else if (value === null) {
      setConfig({ ...fallback })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return [config, setConfig] as const
}
