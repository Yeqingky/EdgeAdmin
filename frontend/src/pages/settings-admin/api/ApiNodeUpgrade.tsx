import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost, getCsrfToken } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { FormRow, FormTable } from '../../../components/form'
import { Modal, SettingsTabs } from '../common'

interface UpgradeData {
  nodeId: number
  nodeName: string
  currentVersion: string
  latestVersion: string
  result: string
  resultIsOk: boolean
  canUpgrade: boolean
  isUpgrading: boolean
}

function useUpgradeNode(nodeId: number) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['settings-api-node-upgrade', nodeId],
    queryFn: () => apiGet<UpgradeData>('/settings/api/node/upgradePopup', { nodeId }),
  })
  const [requesting, setRequesting] = useState(false)
  const [polling, setPolling] = useState(false)
  const [pollTick, setPollTick] = useState(0)
  const timer = useRef(0)
  const currentVersion = query.data?.currentVersion
  const latestVersion = query.data?.latestVersion
  const refresh = query.refetch

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    if (!polling || !currentVersion || !latestVersion || currentVersion === latestVersion) {
      return
    }
    timer.current = window.setTimeout(async () => {
      try {
        const result = await apiPost<{ isOk: boolean }>('/settings/api/node/upgradeCheck', { nodeId })
        if (result.isOk) {
          setPolling(false)
          await refresh()
        } else {
          setPollTick((tick) => tick + 1)
        }
      } catch {
        setPollTick((tick) => tick + 1)
      }
    }, 3000)
    return () => window.clearTimeout(timer.current)
  }, [polling, pollTick, currentVersion, latestVersion, nodeId, refresh])

  async function startUpgrade(event: FormEvent) {
    event.preventDefault()
    setRequesting(true)
    try {
      await apiPost('/settings/api/node/upgradePopup', { nodeId, csrfToken: await getCsrfToken() })
      toast('升级完成')
      setPolling(true)
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '升级失败', 'error')
    } finally {
      setRequesting(false)
    }
  }

  return { query, requesting, startUpgrade }
}

function UpgradeBody({
  data,
  requesting,
  onStart,
}: {
  data: UpgradeData
  requesting: boolean
  onStart: (event: FormEvent) => void
}) {
  return (
    <form className="ui form" onSubmit={onStart}>
      <FormTable>
        {data.nodeName.length > 0 ? (
          <FormRow title="API节点">
            <span>{data.nodeName}</span>
          </FormRow>
        ) : null}
        {data.currentVersion.length > 0 ? (
          <FormRow title="当前版本">
            <span>v{data.currentVersion}</span>
          </FormRow>
        ) : null}
        {data.latestVersion.length > 0 ? (
          <FormRow title="目标版本">
            <span>v{data.latestVersion}</span>
          </FormRow>
        ) : null}
        <FormRow title="升级结果">
          {data.currentVersion === data.latestVersion ? (
            <span className="green">已经升级到最新版本</span>
          ) : (
            <span className={data.resultIsOk ? undefined : 'red'}>{requesting ? '升级中...' : data.result}</span>
          )}
        </FormRow>
      </FormTable>
      {data.canUpgrade && !requesting && !data.isUpgrading ? (
        <button className="ui button primary" type="submit">
          开始升级
        </button>
      ) : null}
    </form>
  )
}

export function UpgradeApiNodePage({ nodeId }: { nodeId: number }) {
  const { query, requesting, startUpgrade } = useUpgradeNode(nodeId)
  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <h3>远程升级</h3>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <div className="ui negative message">加载失败</div> : null}
      {query.data ? <UpgradeBody data={query.data} requesting={requesting} onStart={startUpgrade} /> : null}
    </div>
  )
}

export function UpgradeApiNodeRoutePage() {
  const [searchParams] = useSearchParams()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  if (nodeId <= 0) {
    return <div className="ui negative message">缺少节点ID</div>
  }
  return <UpgradeApiNodePage nodeId={nodeId} />
}

export function UpgradeApiNodeModal({ nodeId, onClose }: { nodeId: number; onClose: () => void }) {
  const { query, requesting, startUpgrade } = useUpgradeNode(nodeId)
  return (
    <Modal title="远程升级" onClose={onClose}>
      {query.isLoading ? <p className="comment">正在加载中...</p> : null}
      {query.isError ? <div className="ui negative message">加载失败</div> : null}
      {query.data ? <UpgradeBody data={query.data} requesting={requesting} onStart={startUpgrade} /> : null}
    </Modal>
  )
}
