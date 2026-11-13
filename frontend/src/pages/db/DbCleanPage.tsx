import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { DbTabs } from './DbTabs'

interface TableItem {
  name: string
  rows: number
  size: string
  canDelete: boolean
  canClean: boolean
  comment: string
}

export function DbCleanPage() {
  const [params] = useSearchParams()
  const nodeId = Number(params.get('nodeId') || 0)
  const confirm = useConfirm()
  const toast = useToast()
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (nodeId <= 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiPost<{ tables: TableItem[] }>('/db/clean', { nodeId })
      setTables(data.tables || [])
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  async function deleteTable(name: string) {
    if (!(await confirm({ message: '确定要删除此数据表吗？删除后数据不能恢复！', danger: true, confirmText: '删除' }))) {
      return
    }
    await apiPost('/db/deleteTable', { nodeId, table: name })
    toast('操作成功')
    await reload()
  }

  async function truncateTable(name: string) {
    if (!(await confirm({ message: '确定要清空此数据表吗？清空后数据不能恢复！', danger: true, confirmText: '清空' }))) {
      return
    }
    await apiPost('/db/truncateTable', { nodeId, table: name })
    toast('操作成功')
    await reload()
  }

  if (nodeId <= 0) {
    return <div className="ui negative message">缺少nodeId参数。</div>
  }

  return (
    <div>
      <DbTabs nodeId={nodeId} active="clean" />
      {loading ? <div className="ui message">正在加载中...</div> : (
        <table className="ui table selectable">
          <thead>
            <tr><th>表名</th><th>占用空间</th><th>用途</th><th className="two op">操作</th></tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.name}>
                <td>{table.name}</td>
                <td>{table.size}{table.rows > 0 ? <span className="grey small">（{table.rows}行）</span> : null}</td>
                <td>{table.comment}</td>
                <td>
                  {table.canDelete ? <><a href="" onClick={(event) => { event.preventDefault(); void deleteTable(table.name) }}>删除</a> &nbsp;</> : null}
                  {table.canClean ? <a href="" onClick={(event) => { event.preventDefault(); void truncateTable(table.name) }}>清空</a> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
