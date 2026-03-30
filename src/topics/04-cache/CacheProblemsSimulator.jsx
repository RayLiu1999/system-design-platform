// 快取三大問題模擬器 — 穿透 (Penetration) / 擊穿 (Breakdown) / 雪崩 (Avalanche)
import { useState, useCallback, useRef, useEffect } from 'react'
import TabGroup from '../../components/TabGroup'
import './CacheProblemsSimulator.css'

const PROBLEMS = [
  { id: 'penetration', label: '穿透 (Penetration)' },
  { id: 'breakdown', label: '擊穿 (Breakdown)' },
  { id: 'avalanche', label: '雪崩 (Avalanche)' },
]

const DESCRIPTIONS = {
  penetration: {
    problem: '查詢一個快取和資料庫中都不存在的 Key，每次請求都穿透快取直接打到 DB。惡意攻擊者可以利用此漏洞發送大量不存在的 Key 來打垮 DB。',
    solution: '✅ 布隆過濾器 (Bloom Filter)：在快取之前加一層布隆過濾器，快速判斷 Key 是否「肯定不存在」。如果不存在直接回傳，不查 DB。',
  },
  breakdown: {
    problem: '某個超熱點 Key 過期的瞬間，大量並發請求同時穿透到 DB，造成 DB 瞬間壓力暴增。',
    solution: '✅ 互斥鎖 (Mutex Lock)：當快取 Miss 時，只讓一個請求去查 DB 並回填快取，其餘請求等待。避免大量並發同時打 DB。',
  },
  avalanche: {
    problem: '大量 Key 在同一時間點過期（例如快取伺服器重啟），導致所有請求瞬間湧向 DB，DB 被打爆。',
    solution: '✅ 隨機 TTL：為每個 Key 的過期時間加上隨機偏移量（如基礎 TTL ± 隨機秒數），避免大量 Key 同時過期。',
  },
}

const MAX_DB_LOAD = 100
const CACHE_SIZE = 8 // 視覺化的快取格數

/**
 * 快取三大問題模擬器
 * 先觀察問題發生，再啟用對應解法觀察改善效果
 */
export default function CacheProblemsSimulator({ onInteract }) {
  const [problem, setProblem] = useState('penetration')
  const [solutionEnabled, setSolutionEnabled] = useState(false)
  const [dbLoad, setDbLoad] = useState(0)
  const [cacheHits, setCacheHits] = useState(0)
  const [cacheMisses, setCacheMisses] = useState(0)
  const [blocked, setBlocked] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const [logs, setLogs] = useState([])
  const [dbLoadHistory, setDbLoadHistory] = useState([]) // DB 負載歷史（用於簡易圖表）
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)
  const dbLoadRef = useRef(0)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const addLog = useCallback((type, message) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message }, ...prev].slice(0, 25))
  }, [])

  // 模擬 DB 負載自然衰減
  useEffect(() => {
    const decay = setInterval(() => {
      dbLoadRef.current = Math.max(0, dbLoadRef.current - 3)
      setDbLoad(dbLoadRef.current)
      setDbLoadHistory(prev => [...prev, dbLoadRef.current].slice(-40))
    }, 200)
    return () => clearInterval(decay)
  }, [])

  // 模擬穿透攻擊
  const simulatePenetration = useCallback(() => {
    // 查詢不存在的 Key
    const fakeKey = `nonexistent_${Math.floor(Math.random() * 99999)}`

    if (solutionEnabled) {
      // 布隆過濾器攔截
      setBlocked(prev => prev + 1)
      addLog('success', `🛡️ Bloom Filter 攔截：Key "${fakeKey}" 不存在，已阻擋`)
      return
    }

    // 無防護：穿透到 DB
    dbLoadRef.current = Math.min(MAX_DB_LOAD, dbLoadRef.current + 12)
    setDbLoad(dbLoadRef.current)
    setCacheMisses(prev => prev + 1)
    addLog('error', `💥 穿透！Key "${fakeKey}" 不在快取也不在 DB，查詢穿透到 DB`)
  }, [solutionEnabled, addLog])

  // 模擬擊穿
  const simulateBreakdown = useCallback(() => {
    const hotKey = 'hot_product_001'

    if (solutionEnabled) {
      // 互斥鎖：只有第一個請求去查 DB
      setCacheHits(prev => prev + 1)
      addLog('success', `🔒 互斥鎖保護：Hot Key "${hotKey}" 只有 1 個請求查 DB，其餘等待快取回填`)
      dbLoadRef.current = Math.min(MAX_DB_LOAD, dbLoadRef.current + 2)
      setDbLoad(dbLoadRef.current)
      return
    }

    // 無防護：所有並發請求都穿透到 DB
    dbLoadRef.current = Math.min(MAX_DB_LOAD, dbLoadRef.current + 18)
    setDbLoad(dbLoadRef.current)
    setCacheMisses(prev => prev + 1)
    addLog('error', `💥 擊穿！Hot Key "${hotKey}" 過期，大量並發同時穿透到 DB`)
  }, [solutionEnabled, addLog])

  // 模擬雪崩
  const simulateAvalanche = useCallback(() => {
    if (solutionEnabled) {
      // 隨機 TTL：Key 分散過期
      const expiredCount = Math.floor(Math.random() * 2) + 1
      dbLoadRef.current = Math.min(MAX_DB_LOAD, dbLoadRef.current + expiredCount * 3)
      setDbLoad(dbLoadRef.current)
      setCacheMisses(prev => prev + expiredCount)
      setCacheHits(prev => prev + (5 - expiredCount))
      addLog('success', `🎲 隨機 TTL：僅 ${expiredCount} 個 Key 過期，DB 負載可控`)
      return
    }

    // 無防護：大量 Key 同時過期
    const expiredCount = Math.floor(Math.random() * 5) + 5
    dbLoadRef.current = Math.min(MAX_DB_LOAD, dbLoadRef.current + expiredCount * 5)
    setDbLoad(dbLoadRef.current)
    setCacheMisses(prev => prev + expiredCount)
    addLog('error', `💥 雪崩！${expiredCount} 個 Key 同時過期，DB 負載暴增至 ${dbLoadRef.current}%`)
  }, [solutionEnabled, addLog])

  // 發送請求
  const sendRequest = useCallback(() => {
    triggerInteract()
    setTotalRequests(prev => prev + 1)

    if (problem === 'penetration') simulatePenetration()
    else if (problem === 'breakdown') simulateBreakdown()
    else simulateAvalanche()
  }, [problem, simulatePenetration, simulateBreakdown, simulateAvalanche, triggerInteract])

  // 壓力測試
  const sendBurst = useCallback(() => {
    triggerInteract()
    for (let i = 0; i < 10; i++) {
      setTimeout(() => sendRequest(), i * 60)
    }
  }, [sendRequest, triggerInteract])

  // 切換問題類型時重置
  const handleProblemChange = useCallback((newProblem) => {
    setProblem(newProblem)
    setSolutionEnabled(false)
    setDbLoad(0)
    dbLoadRef.current = 0
    setCacheHits(0)
    setCacheMisses(0)
    setBlocked(0)
    setTotalRequests(0)
    setLogs([])
    setDbLoadHistory([])
  }, [])

  // 重置
  const handleReset = useCallback(() => {
    setDbLoad(0)
    dbLoadRef.current = 0
    setCacheHits(0)
    setCacheMisses(0)
    setBlocked(0)
    setTotalRequests(0)
    setLogs([])
    setDbLoadHistory([])
  }, [])

  // DB 負載顏色
  const dbLoadColor = dbLoad > 80 ? 'var(--clr-error)' : dbLoad > 50 ? 'var(--clr-warning)' : 'var(--clr-success)'
  const hitRate = totalRequests > 0 ? Math.round(((cacheHits + blocked) / totalRequests) * 100) : 0

  return (
    <div className="simulator-container cache-problems-sim" id="cache-problems-simulator">
      <div className="simulator-title">
        <span className="icon">🧊</span>
        快取三大問題模擬器
      </div>

      {/* 問題類型切換 */}
      <TabGroup tabs={PROBLEMS} defaultTab="penetration" onChange={handleProblemChange} />

      {/* 問題說明 */}
      <div className="cache-desc problem">
        <strong>❌ 問題：</strong>{DESCRIPTIONS[problem].problem}
      </div>
      <div className="cache-desc solution">
        <strong>{DESCRIPTIONS[problem].solution}</strong>
      </div>

      {/* 啟用解法開關 */}
      <div className="cache-solution-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={solutionEnabled}
            onChange={(e) => { setSolutionEnabled(e.target.checked); triggerInteract() }}
            id="solution-toggle"
          />
          <span className="toggle-switch" />
          <span>{solutionEnabled ? '✅ 解法已啟用' : '❌ 無防護（觀察問題）'}</span>
        </label>
      </div>

      {/* 請求流程視覺化 */}
      <div className="cache-flow">
        <div className="cache-flow-node client">
          <div className="flow-icon">👤</div>
          <div className="flow-label">Client</div>
        </div>

        <div className="cache-flow-arrow">→</div>

        {/* 布隆過濾器（僅穿透問題顯示） */}
        {problem === 'penetration' && solutionEnabled && (
          <>
            <div className="cache-flow-node bloom">
              <div className="flow-icon">🛡️</div>
              <div className="flow-label">Bloom Filter</div>
              <div className="flow-stat">{blocked} 攔截</div>
            </div>
            <div className="cache-flow-arrow">→</div>
          </>
        )}

        <div className="cache-flow-node cache-box">
          <div className="flow-icon">📦</div>
          <div className="flow-label">Cache</div>
          <div className="flow-stat">{cacheHits} 命中</div>
        </div>

        <div className="cache-flow-arrow">→</div>

        <div className={`cache-flow-node db ${dbLoad > 80 ? 'danger' : dbLoad > 50 ? 'warning' : ''}`}>
          <div className="flow-icon">🗄️</div>
          <div className="flow-label">Database</div>
          <div className="flow-stat">{cacheMisses} 穿透</div>
        </div>
      </div>

      {/* DB 負載指示器 */}
      <div className="cache-db-load">
        <div className="cache-db-load-header">
          <span>DB 負載</span>
          <span style={{ color: dbLoadColor, fontWeight: 600 }}>{dbLoad}%</span>
        </div>
        <div className="cache-db-load-bar">
          <div
            className="cache-db-load-fill"
            style={{ width: `${dbLoad}%`, background: dbLoadColor }}
          />
        </div>
        {/* 簡易歷史圖表 */}
        <div className="cache-db-chart">
          {dbLoadHistory.map((val, i) => (
            <div
              key={i}
              className="cache-db-chart-bar"
              style={{
                height: `${Math.max(1, val)}%`,
                background: val > 80 ? 'var(--clr-error)' : val > 50 ? 'var(--clr-warning)' : 'var(--clr-success)',
              }}
            />
          ))}
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="cache-controls">
        <button className="btn btn-primary" onClick={sendRequest} id="cache-send">
          送出請求
        </button>
        <button className="btn btn-ghost" onClick={sendBurst} id="cache-burst">
          壓力測試（×10）
        </button>
        <button className="btn btn-ghost" onClick={handleReset} id="cache-reset">
          重置
        </button>
        <span className="cache-total">命中率：{hitRate}%（共 {totalRequests} 請求）</span>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{cacheHits}</div>
          <div className="sim-stat-label">快取命中</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{cacheMisses}</div>
          <div className="sim-stat-label">穿透到 DB</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-info)' }}>{blocked}</div>
          <div className="sim-stat-label">攔截阻擋</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{hitRate}%</div>
          <div className="sim-stat-label">命中率</div>
        </div>
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="cache-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
