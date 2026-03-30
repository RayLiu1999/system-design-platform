// 關聯式資料庫模擬器 — Index / Query Plan / Transaction Isolation
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './RelationalDBSimulator.css'

const TABS = [
  { id: 'index', label: 'Index（索引）' },
  { id: 'isolation', label: 'Isolation Level' },
]

const ISOLATION_LEVELS = [
  {
    level: 'READ UNCOMMITTED',
    desc: '最低隔離等級。允許 Dirty Read：事務可以讀到其他未提交事務的修改。',
    problems: ['Dirty Read ✗', 'Non-Repeatable Read ✗', 'Phantom Read ✗'],
    performance: '最快',
  },
  {
    level: 'READ COMMITTED',
    desc: 'PostgreSQL 預設。只能讀到已提交的資料，但同一事務中兩次讀取可能得到不同結果。',
    problems: ['Dirty Read ✓', 'Non-Repeatable Read ✗', 'Phantom Read ✗'],
    performance: '快',
  },
  {
    level: 'REPEATABLE READ',
    desc: 'MySQL InnoDB 預設。同一事務中多次讀取同一行保證結果一致，但可能出現 Phantom Read。',
    problems: ['Dirty Read ✓', 'Non-Repeatable Read ✓', 'Phantom Read ✗'],
    performance: '中',
  },
  {
    level: 'SERIALIZABLE',
    desc: '最高隔離等級。事務完全串行化執行，無任何並發問題，但效能最差。',
    problems: ['Dirty Read ✓', 'Non-Repeatable Read ✓', 'Phantom Read ✓'],
    performance: '最慢',
  },
]

/**
 * 關聯式資料庫模擬器
 * 索引策略視覺化 + 事務隔離等級對比
 */
export default function RelationalDBSimulator({ onInteract }) {
  const [tab, setTab] = useState('index')

  // Index 狀態
  const [tableData] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'][i % 10],
      age: 20 + Math.floor(Math.random() * 40),
      city: ['Taipei', 'Tokyo', 'Singapore', 'NYC'][i % 4],
    }))
  )
  const [queryType, setQueryType] = useState('full')
  const [scanCount, setScanCount] = useState(0)
  const [queryResult, setQueryResult] = useState([])

  // Isolation 狀態
  const [selectedLevel, setSelectedLevel] = useState(1)

  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const addLog = useCallback((type, msg) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 15))
  }, [])

  // 模擬查詢（Full Scan vs Index Scan）
  const executeQuery = useCallback((searchName) => {
    triggerInteract()
    const targetName = searchName || 'Alice'

    if (queryType === 'full') {
      // Full Table Scan: 掃描所有行
      const results = tableData.filter(r => r.name === targetName)
      setScanCount(tableData.length)
      setQueryResult(results)
      addLog('warning', `🔍 Full Table Scan: WHERE name = '${targetName}'`)
      addLog('info', `  掃描行數: ${tableData.length}（全表）→ 找到 ${results.length} 筆`)
      addLog('warning', `  ⚠️ O(n) 時間複雜度，表大時效能極差`)
    } else {
      // Index Scan: 直接定位
      const results = tableData.filter(r => r.name === targetName)
      const scanned = Math.min(results.length + 1, 3)
      setScanCount(scanned)
      setQueryResult(results)
      addLog('success', `🔍 Index Scan (B-Tree): WHERE name = '${targetName}'`)
      addLog('info', `  掃描行數: ${scanned}（索引定位）→ 找到 ${results.length} 筆`)
      addLog('success', `  ✓ O(log n) 時間複雜度，索引加速查詢`)
    }
  }, [queryType, tableData, triggerInteract, addLog])

  const handleReset = useCallback(() => {
    setScanCount(0)
    setQueryResult([])
    setLogs([])
  }, [])

  return (
    <div className="simulator-container rdb-sim" id="relational-db-simulator">
      <div className="simulator-title">
        <span className="icon">🗄️</span>
        關聯式資料庫模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="index" onChange={(t) => { setTab(t); handleReset() }} />

      {tab === 'index' ? (
        <>
          <div className="rdb-desc">
            <strong>索引（Index）</strong>是資料庫查詢效能的關鍵。B-Tree 索引將 O(n) 全表掃描降至 O(log n)。
            但索引也有代價：佔用磁碟空間、寫入時需維護索引結構。
          </div>

          {/* 查詢模式切換 */}
          <div className="rdb-mode-switch">
            <button className={`rdb-mode ${queryType === 'full' ? 'active warning' : ''}`} onClick={() => { setQueryType('full'); handleReset() }}>
              📋 Full Table Scan
            </button>
            <button className={`rdb-mode ${queryType === 'index' ? 'active success' : ''}`} onClick={() => { setQueryType('index'); handleReset() }}>
              ⚡ Index Scan (B-Tree)
            </button>
          </div>

          {/* 表格資料 */}
          <div className="rdb-table-container">
            <table className="rdb-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>name {queryType === 'index' && '🔑'}</th>
                  <th>age</th>
                  <th>city</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => {
                  const isScanned = queryType === 'full' ? i < scanCount : queryResult.some(r => r.id === row.id)
                  const isResult = queryResult.some(r => r.id === row.id)
                  return (
                    <tr key={row.id} className={`${isResult ? 'result' : ''} ${isScanned && !isResult ? 'scanned' : ''}`}>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>{row.age}</td>
                      <td>{row.city}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rdb-query-btns">
            <button className="btn btn-primary" onClick={() => executeQuery('Alice')}>🔍 SELECT WHERE name='Alice'</button>
            <button className="btn btn-ghost" onClick={() => executeQuery('Charlie')}>🔍 WHERE name='Charlie'</button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: queryType === 'full' ? 'var(--clr-warning)' : 'var(--clr-success)' }}>{scanCount}</div>
              <div className="sim-stat-label">掃描行數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{queryResult.length}</div>
              <div className="sim-stat-label">結果筆數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{queryType === 'full' ? 'O(n)' : 'O(log n)'}</div>
              <div className="sim-stat-label">時間複雜度</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rdb-desc">
            <strong>事務隔離等級</strong>：SQL 標準定義四種隔離等級，控制並發事務之間的可見性。
            等級越高越安全，但效能越差。需根據業務場景選擇合適的等級。
          </div>

          <div className="rdb-isolation-cards">
            {ISOLATION_LEVELS.map((iso, i) => (
              <div
                key={iso.level}
                className={`rdb-iso-card ${selectedLevel === i ? 'active' : ''}`}
                onClick={() => { setSelectedLevel(i); triggerInteract() }}
              >
                <div className="rdb-iso-level">{iso.level}</div>
                <div className="rdb-iso-desc">{iso.desc}</div>
                <div className="rdb-iso-problems">
                  {iso.problems.map((p, j) => (
                    <span key={j} className={`rdb-iso-tag ${p.includes('✓') ? 'safe' : 'danger'}`}>{p}</span>
                  ))}
                </div>
                <div className="rdb-iso-perf">效能: {iso.performance}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="rdb-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
