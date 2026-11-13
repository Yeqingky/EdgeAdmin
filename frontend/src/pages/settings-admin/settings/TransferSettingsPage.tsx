import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiPost, apiPostForm } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { SettingsTabs } from '../common'
import '../../../../../web/views/@default/settings/transfer/index.css'

type Step = 'prepare' | 'database' | 'api' | 'address' | 'admin' | 'upgrade' | 'finish'

const STEPS: { key: Step; title: string }[] = [
  { key: 'prepare', title: '开始' },
  { key: 'database', title: '迁移数据库' },
  { key: 'api', title: '迁移API节点' },
  { key: 'address', title: '变更地址' },
  { key: 'admin', title: '迁移管理平台' },
  { key: 'upgrade', title: '升级节点配置' },
  { key: 'finish', title: '完成' },
]

export function TransferSettingsPage() {
  const toast = useToast()
  const [step, setStep] = useState<Step>('prepare')

  const [databaseChanged, setDatabaseChanged] = useState('1')
  const [databaseTransferred, setDatabaseTransferred] = useState('0')

  const [apiNodeChanged, setAPINodeChanged] = useState('1')
  const [apiNodeInstalled, setAPINodeInstalled] = useState('1')
  const [apiNodeHost, setAPINodeHost] = useState('')
  const [apiNodePort, setAPINodePort] = useState('')
  const [apiNodeProtocol, setAPINodeProtocol] = useState('http')
  const [apiAddressHosts, setAPIAddressHosts] = useState<string[]>([])
  const [newHosts, setNewHosts] = useState<string[]>([])

  const [adminNodeChanged, setAdminNodeChanged] = useState('1')
  const [adminNodeInstalled, setAdminNodeInstalled] = useState('1')

  const [isUpgrading, setIsUpgrading] = useState(false)
  const [percentNodes, setPercentNodes] = useState(0)
  const [countNodes, setCountNodes] = useState(0)
  const [countFinishedNodes, setCountFinishedNodes] = useState(0)
  const upgradeCancelled = useRef(false)
  const upgradeTimer = useRef(0)

  useEffect(() => {
    return () => {
      upgradeCancelled.current = true
      window.clearTimeout(upgradeTimer.current)
    }
  }, [])

  function goBack(target: Step) {
    let next = target
    if (target === 'upgrade' && apiNodeChanged === '0') {
      next = 'admin'
    }
    setStep(next)
  }

  async function doAPI() {
    if (apiNodeChanged === '0') {
      setStep('admin')
      return
    }
    if (apiNodeInstalled === '0') {
      toast('请先安装新的API节点', 'error')
      return
    }
    try {
      const data = await apiPost<{ hosts: string[] }>('/settings/transfer/validateAPI', {
        host: apiNodeHost,
        port: apiNodePort,
        protocol: apiNodeProtocol,
      })
      setAPIAddressHosts(data.hosts ?? [])
      setNewHosts((data.hosts ?? []).map(() => ''))
      if (apiNodeChanged === '1') {
        setStep('address')
      } else {
        setStep('admin')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '检验API节点失败', 'error')
    }
  }

  async function submitHosts(event: FormEvent) {
    event.preventDefault()
    try {
      const form = new FormData()
      form.set('protocol', apiNodeProtocol)
      form.set('host', apiNodeHost)
      form.set('port', apiNodePort)
      for (const host of apiAddressHosts) {
        form.append('oldHosts', host)
      }
      for (const host of newHosts) {
        form.append('newHosts', host)
      }
      await apiPostForm('/settings/transfer/updateHosts', form)
      setStep('admin')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  function doAdmin() {
    if (adminNodeChanged === '1' && adminNodeInstalled === '0') {
      toast('请先安装新的管理平台', 'error')
      return
    }
    setStep(apiNodeChanged === '0' ? 'finish' : 'upgrade')
  }

  async function doStartUpgrade() {
    setPercentNodes(0)
    setCountNodes(0)
    setCountFinishedNodes(0)
    upgradeCancelled.current = false
    try {
      const data = await apiPost<{ countNodes: number }>('/settings/transfer/statNodes')
      setCountNodes(data.countNodes)
      setIsUpgrading(true)
      if (data.countNodes === 0) {
        setPercentNodes(100)
        return
      }
      await upgradeNext(data.countNodes, 0)
    } catch (error) {
      setIsUpgrading(false)
      toast(error instanceof Error ? error.message : '统计节点失败', 'error')
    }
  }

  async function upgradeNext(total: number, finished: number) {
    if (upgradeCancelled.current || finished >= total) {
      return
    }
    try {
      const data = await apiPost<{ hasNext: boolean; count: number }>('/settings/transfer/upgradeNodes', {
        apiNodeProtocol,
        apiNodeHost,
        apiNodePort,
      })
      const nextFinished = finished + data.count
      setCountFinishedNodes(nextFinished)
      setPercentNodes(Math.min(100, total > 0 ? (nextFinished * 100) / total : 100))
      if (data.hasNext) {
        upgradeTimer.current = window.setTimeout(() => {
          void upgradeNext(total, nextFinished)
        }, 5000)
      }
    } catch (error) {
      setIsUpgrading(false)
      toast(error instanceof Error ? error.message : '升级节点失败', 'error')
    }
  }

  return (
    <div>
      <SettingsTabs kind="advanced" active="transfer" />
      <div className="margin" />

      <div className="ui steps fluid small">
        {STEPS.map((item) => (
          <div key={item.key} className={`ui step${step === item.key ? ' active' : ''}`}>
            <div className="content">{item.title}</div>
          </div>
        ))}
      </div>

      {step === 'prepare' ? (
        <div className="step-box">
          <div className="content">
            <p>通过此引导程序可以帮助你将当前平台配置迁移到新的平台中。</p>
            <p>每个步骤请小心操作，一旦配置错误可能需要手工还原。</p>
          </div>
          <div className="ui button-group">
            <button className="ui button primary next" onClick={() => setStep('database')}>
              下一步
            </button>
          </div>
        </div>
      ) : null}

      {step === 'database' ? (
        <div className="step-box">
          <form className="ui form">
            <table className="ui table selectable definition">
              <tbody>
                <tr>
                  <td className="title">数据库地址是否改变？</td>
                  <td>
                    <div className="ui fields inline">
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={databaseChanged === '0'} onChange={() => setDatabaseChanged('0')} />
                          <label>没有变</label>
                        </div>
                      </div>
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={databaseChanged === '1'} onChange={() => setDatabaseChanged('1')} />
                          <label>变了</label>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                {databaseChanged === '1' ? (
                  <tr>
                    <td>数据是否已经导入到新的数据库？</td>
                    <td>
                      <div className="ui fields inline">
                        <div className="ui field">
                          <div className="ui radio checkbox">
                            <input type="radio" checked={databaseTransferred === '0'} onChange={() => setDatabaseTransferred('0')} />
                            <label>没有导入</label>
                          </div>
                        </div>
                        <div className="ui field">
                          <div className="ui radio checkbox">
                            <input type="radio" checked={databaseTransferred === '1'} onChange={() => setDatabaseTransferred('1')} />
                            <label>已经导入</label>
                          </div>
                        </div>
                      </div>
                      {databaseTransferred === '0' ? (
                        <p className="comment">
                          <span className="red">请自行将当前数据库中数据导入到新的数据库中。</span>
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </form>
          <div className="ui button-group">
            <button className="ui button prev" onClick={() => goBack('prepare')}>
              上一步
            </button>
            <button
              className="ui button primary next"
              onClick={() => {
                if (databaseChanged === '1' && databaseTransferred === '0') {
                  toast('请先将当前的数据导入到新的数据库中。', 'error')
                  return
                }
                setStep('api')
              }}
            >
              下一步
            </button>
          </div>
        </div>
      ) : null}

      {step === 'api' ? (
        <div className="step-box">
          <form className="ui form">
            <table className="ui table selectable definition">
              <tbody>
                <tr>
                  <td className="title">API节点地址是否变更？</td>
                  <td>
                    <div className="ui fields inline">
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={apiNodeChanged === '1'} onChange={() => setAPINodeChanged('1')} />
                          <label>已经变更</label>
                        </div>
                      </div>
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={apiNodeChanged === '0'} onChange={() => setAPINodeChanged('0')} />
                          <label>没有变更</label>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                {apiNodeChanged === '1' ? (
                  <>
                    <tr>
                      <td>是否已安装新的API节点</td>
                      <td>
                        <div className="ui fields inline">
                          <div className="ui field">
                            <div className="ui radio checkbox">
                              <input type="radio" checked={apiNodeInstalled === '1'} onChange={() => setAPINodeInstalled('1')} />
                              <label>已经安装</label>
                            </div>
                          </div>
                          <div className="ui field">
                            <div className="ui radio checkbox">
                              <input type="radio" checked={apiNodeInstalled === '0'} onChange={() => setAPINodeInstalled('0')} />
                              <label>没有安装</label>
                            </div>
                          </div>
                        </div>
                        {apiNodeInstalled === '0' ? (
                          <p className="comment">
                            <span className="red">
                              请先安装新的API节点，请拷贝当前的API节点配置
                              <span className="ui label basic small">configs/api.yaml</span>和
                              <span className="ui label basic small">configs/db.yaml</span>
                              到新API节点对应的位置，并记得修改其中的
                              <span className="ui label basic small">configs/db.yaml</span>中的数据库地址、用户名、密码。
                            </span>
                          </p>
                        ) : null}
                      </td>
                    </tr>
                    <tr>
                      <td>新的API节点IP或域名 *</td>
                      <td>
                        <input
                          type="text"
                          placeholder="IP或域名"
                          value={apiNodeHost}
                          style={{ width: '14em' }}
                          maxLength={100}
                          onChange={(event) => setAPINodeHost(event.target.value)}
                        />
                        <p className="comment">如果有多个IP或者域名，填写任意其中一个即可。</p>
                      </td>
                    </tr>
                    <tr>
                      <td>新的API节点端口 *</td>
                      <td>
                        <input
                          type="text"
                          value={apiNodePort}
                          style={{ width: '5em' }}
                          maxLength={5}
                          placeholder="端口"
                          onChange={(event) => setAPINodePort(event.target.value)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>新的API节点协议</td>
                      <td>
                        <select className="ui dropdown auto-width" value={apiNodeProtocol} onChange={(event) => setAPINodeProtocol(event.target.value)}>
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                        </select>
                      </td>
                    </tr>
                  </>
                ) : null}
              </tbody>
            </table>
          </form>
          <div className="button-group">
            <button className="ui button prev" onClick={() => goBack('database')}>
              上一步
            </button>
            <button className="ui button primary next" onClick={() => void doAPI()}>
              下一步
            </button>
          </div>
        </div>
      ) : null}

      {step === 'address' ? (
        <div className="step-box">
          <form className="ui form" onSubmit={submitHosts}>
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>API节点原地址</th>
                  <th>API节点新地址（留空表示不修改）</th>
                </tr>
              </thead>
              <tbody>
                {apiAddressHosts.map((host, index) => (
                  <tr key={host}>
                    <td>{host}</td>
                    <td>
                      <input
                        type="text"
                        maxLength={100}
                        value={newHosts[index] ?? ''}
                        onChange={(event) =>
                          setNewHosts((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="button-group">
              <button className="ui button prev" type="button" onClick={() => goBack('api')}>
                上一步
              </button>
              <button type="submit" className="ui button primary next">
                下一步
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {step === 'admin' ? (
        <div className="step-box">
          <form className="ui form">
            <table className="ui table selectable definition">
              <tbody>
                <tr>
                  <td className="title">管理平台地址是否变更？</td>
                  <td>
                    <div className="ui fields inline">
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={adminNodeChanged === '1'} onChange={() => setAdminNodeChanged('1')} />
                          <label>已经变更</label>
                        </div>
                      </div>
                      <div className="ui field">
                        <div className="ui radio checkbox">
                          <input type="radio" checked={adminNodeChanged === '0'} onChange={() => setAdminNodeChanged('0')} />
                          <label>没有变更</label>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                {adminNodeChanged === '1' ? (
                  <tr>
                    <td>是否已安装新的管理平台</td>
                    <td>
                      <div className="ui fields inline">
                        <div className="ui field">
                          <div className="ui radio checkbox">
                            <input type="radio" checked={adminNodeInstalled === '1'} onChange={() => setAdminNodeInstalled('1')} />
                            <label>已经安装</label>
                          </div>
                        </div>
                        <div className="ui field">
                          <div className="ui radio checkbox">
                            <input type="radio" checked={adminNodeInstalled === '0'} onChange={() => setAdminNodeInstalled('0')} />
                            <label>没有安装</label>
                          </div>
                        </div>
                      </div>
                      {adminNodeInstalled === '0' ? (
                        <p className="comment">
                          <span className="red">
                            请先安装新的管理平台，请拷贝当前的管理平台下的
                            <span className="ui label basic small">configs/</span>
                            目录下的配置到新管理平台对应的位置。
                          </span>
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </form>
          <div className="ui button-group">
            {apiNodeChanged === '0' ? (
              <button className="ui button prev" onClick={() => goBack('api')}>
                上一步
              </button>
            ) : (
              <button className="ui button prev" onClick={() => goBack('address')}>
                上一步
              </button>
            )}
            <button className="ui button primary next" onClick={doAdmin}>
              下一步
            </button>
          </div>
        </div>
      ) : null}

      {step === 'upgrade' ? (
        <div className="step-box">
          <form className="ui form">
            <table className="ui table selectable definition">
              <tbody>
                <tr>
                  <td className="title">升级节点API地址配置</td>
                  <td>
                    <span>
                      {apiNodeProtocol}://{apiNodeHost.includes(':') ? `[${apiNodeHost}]` : apiNodeHost}:{apiNodePort}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>当前平台节点数</td>
                  <td>
                    <span>{isUpgrading ? countNodes : '-'}</span>
                  </td>
                </tr>
                <tr>
                  <td>新平台节点数</td>
                  <td>
                    <span>{isUpgrading ? countFinishedNodes : '-'}</span>
                  </td>
                </tr>
                <tr>
                  <td>完成比例</td>
                  <td>
                    <span>{isUpgrading ? `${percentNodes}%` : '-'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
          <div className="ui button-group">
            <button className="ui button prev" onClick={() => goBack('admin')}>
              上一步
            </button>
            {!isUpgrading ? (
              <button className="ui button primary next" onClick={() => void doStartUpgrade()}>
                开始升级
              </button>
            ) : null}
            {isUpgrading && percentNodes < 100 ? (
              <button className="ui button next disabled" disabled>
                等待完成
              </button>
            ) : null}
            {isUpgrading && percentNodes === 100 ? (
              <button className="ui button primary next" onClick={() => setStep('finish')}>
                下一步
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 'finish' ? (
        <div className="step-box">
          <div className="content">
            {adminNodeChanged === '1' ? (
              <p>所有迁移任务已完成，请登录新的管理平台进行管理。</p>
            ) : (
              <p>所有迁移任务已完成。</p>
            )}
          </div>
          <div className="ui button-group">
            <button className="ui button prev" onClick={() => goBack('upgrade')}>
              上一步
            </button>
            <button className="ui button primary next" onClick={() => { window.location.href = '/' }}>
              完成
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
