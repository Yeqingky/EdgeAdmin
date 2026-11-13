import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Checkbox } from '../../../components/form'
import { SettingsTabs } from '../common'
import '../../../../../web/views/@default/settings/updates/index.css'

interface UpdatesConfig {
  autoCheck: boolean
  ignoredVersion: string
}

interface UpdatesData {
  version: string
  doCheck: boolean
  isUpgrading: boolean
  isUpgradingDB: boolean
  upgradeProgress: string
  config: UpdatesConfig
}

interface CheckResult {
  isOk: boolean
  message: string
  hasNew?: boolean
  version?: string
  dlURL?: string
  day?: string
  description?: string
  docURL?: string
}

export function UpdatesSettingsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings-updates'],
    queryFn: () => apiGet<UpdatesData>('/settings/updates'),
  })
  const [isStarted, setIsStarted] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<CheckResult>({ isOk: false, message: '' })
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isUpgradingDB, setIsUpgradingDB] = useState(false)
  const [isUpgraded, setIsUpgraded] = useState(false)
  const [upgradeProgress, setUpgradeProgress] = useState('0')
  const [autoCheck, setAutoCheck] = useState(true)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!query.data) {
      return
    }
    setAutoCheck(query.data.config.autoCheck)
    setIsUpgrading(query.data.isUpgrading)
    setIsUpgradingDB(query.data.isUpgradingDB)
    setUpgradeProgress(query.data.upgradeProgress)
    if (!startedRef.current) {
      startedRef.current = true
      if (query.data.doCheck && !query.data.isUpgrading) {
        window.setTimeout(() => {
          void check()
        }, 1000)
      }
    }
  }, [query.data])

  useEffect(() => {
    if (!isUpgrading) {
      return
    }
    let cancelled = false
    const tick = async () => {
      try {
        const data = await apiGet<{ isUpgrading: boolean; isUpgradingDB: boolean; upgradeProgress: string }>('/settings/updates/upgrade')
        if (cancelled) {
          return
        }
        setUpgradeProgress(data.upgradeProgress)
        setIsUpgrading(data.isUpgrading)
        setIsUpgradingDB(data.isUpgradingDB)
        if (data.isUpgradingDB) {
          setIsUpgraded(true)
        }
      } catch {
        // ignore polling errors
      }
    }
    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isUpgrading])

  async function check() {
    setIsStarted(true)
    setIsChecking(true)
    try {
      const data = await apiPost<{ result: CheckResult }>('/settings/updates')
      setResult(data.result)
    } catch (error) {
      setResult({ isOk: false, message: error instanceof Error ? error.message : '检查更新失败' })
    } finally {
      setIsChecking(false)
    }
  }

  async function changeAutoCheck(checked: boolean) {
    setAutoCheck(checked)
    try {
      await apiPost('/settings/updates/update', { autoCheck: checked ? 1 : 0 })
      toast('已保存')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  async function ignoreVersion(version: string) {
    if (!(await confirm({ message: `确定要忽略版本 v${version} 版本更新吗？` }))) {
      return
    }
    try {
      await apiPost('/settings/updates/ignoreVersion', { version })
      await queryClient.invalidateQueries({ queryKey: ['settings-updates'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  async function resetIgnoredVersion() {
    if (!(await confirm({ message: '确定要重置已忽略版本吗？' }))) {
      return
    }
    try {
      await apiPost('/settings/updates/resetIgnoredVersion')
      await queryClient.invalidateQueries({ queryKey: ['settings-updates'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  async function install(dlURL: string) {
    setIsUpgrading(true)
    try {
      await apiPost('/settings/updates/upgrade', { url: dlURL })
      window.setTimeout(() => {
        toast(isUpgraded ? '升级成功，当前管理系统将会尝试自动重启，请刷新页面查看重启状态。' : '下载覆盖成功，当前管理系统将会尝试自动重启，请刷新页面查看重启状态。')
      }, 3000)
    } catch (error) {
      setIsUpgrading(false)
      toast(error instanceof Error ? error.message : '升级失败', 'error')
    }
  }

  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const showUpgrading = isUpgrading || isUpgraded

  return (
    <div>
      <SettingsTabs kind="basic" active="updates" />
      <div className="ui margin" />

      {showUpgrading ? (
        <div>
          {!isUpgradingDB && !isUpgraded ? <p className="ui message warning">正在下载并升级到新版本，请耐心等待 {upgradeProgress}% ...</p> : null}
          {isUpgradingDB ? <p className="ui message warning">正在升级数据库 ...</p> : null}
          {!isUpgradingDB && isUpgraded ? <p className="ui message warning">升级完成！</p> : null}
        </div>
      ) : null}

      {!showUpgrading ? (
        <div>
          <form className="ui form">
            <table className="ui table definition selectable">
              <tbody>
                <tr>
                  <td className="title">当前已安装版本</td>
                  <td>v{data.version}</td>
                </tr>
                {data.config.ignoredVersion.length > 0 ? (
                  <tr>
                    <td>已忽略版本</td>
                    <td>
                      v{data.config.ignoredVersion} &nbsp;{' '}
                      <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); void resetIgnoredVersion() }}>
                        [重置]
                      </a>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>自动检查</td>
                  <td>
                    <Checkbox checked={autoCheck} onChange={(checked) => void changeAutoCheck(checked)} />
                    <p className="comment">选中后系统将定时检查是否有新版本更新。</p>
                  </td>
                </tr>
                {isStarted ? (
                  <tr>
                    <td>最新版本</td>
                    <td>
                      {isChecking ? (
                        <div>
                          <span className="blue">正在连接服务器检查更新...</span>
                        </div>
                      ) : null}
                      {!isChecking ? (
                        <div>
                          {result.isOk ? (
                            <div className="version-box">
                              <span className="green">
                                {result.message}
                                {result.hasNew ? (
                                  <>
                                    ：
                                    <br />
                                    <a href={result.dlURL}>下载地址：{result.dlURL}</a>
                                  </>
                                ) : null}
                              </span>
                              {result.hasNew ? (
                                <div>
                                  <div className="ui divider" />
                                  <button className="ui button tiny" type="button" onClick={() => result.dlURL && void install(result.dlURL)}>
                                    安装此版本
                                  </button>
                                  &nbsp; &nbsp;
                                  <button
                                    className="ui button tiny basic"
                                    type="button"
                                    onClick={() => result.version && void ignoreVersion(result.version)}
                                  >
                                    忽略此版本
                                  </button>
                                  <div className="ui divider" />
                                  {result.day ? <div>发布日期：{result.day}</div> : null}
                                  {result.description ? (
                                    <div>
                                      版本介绍：<pre>{result.description}</pre>
                                      {result.docURL ? (
                                        <div>
                                          <div className="ui divider" />
                                          <div>
                                            完整变更说明：<a href={result.docURL} target="_blank" rel="noreferrer">{result.docURL}</a>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="red">{result.message}</span>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {!isChecking ? (
              <button className="ui button primary" type="button" onClick={() => void check()}>
                开始检查
              </button>
            ) : (
              <button className="ui button disabled" type="button">
                正在检查...
              </button>
            )}
          </form>
        </div>
      ) : null}
    </div>
  )
}
