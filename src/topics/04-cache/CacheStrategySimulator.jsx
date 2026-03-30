// 快取策略模擬器 — Cache-Aside / Write-Through / Write-Behind / Read-Through
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './CacheStrategySimulator.css'

const STRATEGIES = [
  { id: 'cache-aside', label: 'Cache-Aside' },
  { id: 'read-through', label: 'Read-Through' },
  { id: 'write-through', label: 'Write-Through' },
  { id: 'write-behind', label: 'Write-Behind' },
]

const STRATEGY_DESC = {
  'cache-aside': '應用程式自行管理快取。讀取時先查 Cache，Miss 則查 DB 後寫入 Cache。寫入時直接寫 DB 並刪除 Cache（Invalidate）。最常見、最彈性的模式。',
  'read-through': 'Cache 層自動代理讀取。應用只和 Cache 互動，Cache Miss 時由 Cache Provider 自動從 DB 載入。簡化應用層邏輯，但 Cache 需要支援此功能。',
  'write-through': '寫入時同步寫 Cache 和 DB。保證 Cache 和 DB 一致，但寫入延遲較高（兩次寫入）。適合讀多寫少且一致性要求高的場景。',
  'write-behind': '寫入時先寫 Cache，非同步批次寫入 DB。寫入延遲最低，但有資料遺失風險（Cache 當機時未持久化的資料會遺失）。',
}

/**
 * 快取策略模擬器
 * 視覺化四種快取設計模式的讀寫流程
 */
export default function CacheStrategySimulator({ onInteract }) {
  const [strategy, setStrategy] = useState('cache-aside')
  const [cache, setCache] = useState({})
  const [db, setDb] = useState({ user_1: 'Alice', user_2: 'Bob', user_3: 'Charlie' })
  const [pendingWrites, setPendingWrites] = useState([]) // Write-Behind 待寫入
  const [logs, setLogs] = useState([])
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 20))
  }, [])

  // 讀取操作
  const handleRead = useCallback((key) => {
    triggerInteract()

    if (strategy === 'cache-aside') {
      // Cache-Aside：應用先查 Cache
      if (cache[key]) {
        setHits(h => h + 1)
        addLog('success', `📖 讀取 "${key}" → Cache HIT ✓: "${cache[key]}"`)
      } else {
        setMisses(m => m + 1)
        const value = db[key]
        if (value) {
          setCache(c => ({ ...c, [key]: value }))
          addLog('warning', `📖 讀取 "${key}" → Cache MISS → 從 DB 取得 "${value}" → 寫入 Cache`)
        } else {
          addLog('error', `📖 讀取 "${key}" → Cache MISS → DB 也沒有此資料`)
        }
      }
    } else if (strategy === 'read-through') {
      // Read-Through：應用只問 Cache，Cache 自動代理 DB
      if (cache[key]) {
        setHits(h => h + 1)
        addLog('success', `📖 App → Cache: 讀取 "${key}" → HIT ✓: "${cache[key]}"`)
      } else {
        setMisses(m => m + 1)
        const value = db[key]
        if (value) {
          setCache(c => ({ ...c, [key]: value }))
          addLog('info', `📖 App → Cache: "${key}" Miss → Cache 自動從 DB 載入 "${value}"`)
        } else {
          addLog('error', `📖 App → Cache → DB: "${key}" 不存在`)
        }
      }
    } else {
      // Write-Through / Write-Behind：讀取邏輯相同
      if (cache[key]) {
        setHits(h => h + 1)
        addLog('success', `📖 讀取 "${key}" → Cache HIT ✓: "${cache[key]}"`)
      } else {
        setMisses(m => m + 1)
        const value = db[key]
        if (value) {
          setCache(c => ({ ...c, [key]: value }))
          addLog('warning', `📖 讀取 "${key}" → Cache MISS → DB: "${value}" → 載入 Cache`)
        } else {
          addLog('error', `📖 讀取 "${key}" → Cache MISS → DB 無資料`)
        }
      }
    }
  }, [strategy, cache, db, triggerInteract, addLog])

  // 寫入操作
  const handleWrite = useCallback((key, value) => {
    triggerInteract()

    if (strategy === 'cache-aside') {
      // Cache-Aside：寫 DB → 刪除 Cache
      setDb(d => ({ ...d, [key]: value }))
      setCache(c => {
        const next = { ...c }
        delete next[key]
        return next
      })
      addLog('info', `✍️ 寫入 "${key}" = "${value}" → 更新 DB → 刪除 Cache（Invalidate）`)
    } else if (strategy === 'write-through') {
      // Write-Through：同步寫 Cache + DB
      setCache(c => ({ ...c, [key]: value }))
      setDb(d => ({ ...d, [key]: value }))
      addLog('success', `✍️ Write-Through: "${key}" = "${value}" → 同步寫入 Cache + DB ✓`)
    } else if (strategy === 'write-behind') {
      // Write-Behind：先寫 Cache，加入待寫入佇列
      setCache(c => ({ ...c, [key]: value }))
      setPendingWrites(prev => [...prev, { key, value }])
      addLog('warning', `✍️ Write-Behind: "${key}" = "${value}" → 已寫入 Cache → 待非同步寫入 DB（佇列: ${pendingWrites.length + 1}）`)
    } else {
      // Read-Through 的寫入：直接寫 DB + Cache
      setDb(d => ({ ...d, [key]: value }))
      setCache(c => ({ ...c, [key]: value }))
      addLog('info', `✍️ 寫入 "${key}" = "${value}" → 更新 DB + Cache`)
    }
  }, [strategy, pendingWrites, triggerInteract, addLog])

  // Write-Behind：Flush 待寫入
  const flushPending = useCallback(() => {
    triggerInteract()
    if (pendingWrites.length === 0) {
      addLog('info', '📤 沒有待寫入的資料')
      return
    }
    pendingWrites.forEach(({ key, value }) => {
      setDb(d => ({ ...d, [key]: value }))
    })
    addLog('success', `📤 Flush 完成：${pendingWrites.length} 筆資料已非同步寫入 DB`)
    setPendingWrites([])
  }, [pendingWrites, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setCache({})
    setDb({ user_1: 'Alice', user_2: 'Bob', user_3: 'Charlie' })
    setPendingWrites([])
    setLogs([])
    setHits(0)
    setMisses(0)
  }, [])

  const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(0) : 0

  return (
    <div className="simulator-container cs-sim" id="cache-strategy-simulator">
      <div className="simulator-title">
        <span className="icon">📦</span>
        快取策略模擬器
      </div>

      <TabGroup tabs={STRATEGIES} defaultTab="cache-aside" onChange={(s) => { setStrategy(s); handleReset() }} />

      <div className="cs-desc">{STRATEGY_DESC[strategy]}</div>

      {/* Cache + DB 狀態 */}
      <div className="cs-state-vis">
        <div className="cs-store cache-store">
          <div className="cs-store-title">⚡ Cache</div>
          {Object.keys(cache).length === 0 ? (
            <div className="cs-empty">（空）</div>
          ) : (
            Object.entries(cache).map(([k, v]) => (
              <div key={k} className="cs-entry">
                <span className="cs-key">{k}</span>
                <span className="cs-val">{v}</span>
              </div>
            ))
          )}
        </div>

        <div className="cs-arrow-block">
          <div className="cs-arrow-label">{strategy === 'write-behind' ? '非同步' : '同步'}</div>
          <div className="cs-arrow">⇄</div>
        </div>

        <div className="cs-store db-store">
          <div className="cs-store-title">💾 Database</div>
          {Object.entries(db).map(([k, v]) => (
            <div key={k} className="cs-entry">
              <span className="cs-key">{k}</span>
              <span className="cs-val">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write-Behind 待寫入 */}
      {strategy === 'write-behind' && pendingWrites.length > 0 && (
        <div className="cs-pending">
          ⏳ 待寫入佇列：{pendingWrites.map((w, i) => (
            <span key={i} className="cs-pending-item">{w.key}={w.value}</span>
          ))}
          <button className="btn-sm" onClick={flushPending} style={{ marginLeft: 'var(--space-3)' }}>📤 Flush</button>
        </div>
      )}

      {/* 操作面板 */}
      <div className="cs-actions">
        <div className="cs-action-group">
          <span className="cs-action-label">讀取：</span>
          <button className="btn btn-primary" onClick={() => handleRead('user_1')}>📖 user_1</button>
          <button className="btn btn-ghost" onClick={() => handleRead('user_2')}>📖 user_2</button>
          <button className="btn btn-ghost" onClick={() => handleRead('user_3')}>📖 user_3</button>
        </div>
        <div className="cs-action-group">
          <span className="cs-action-label">寫入：</span>
          <button className="btn btn-ghost" onClick={() => handleWrite('user_1', `Alice_v${Math.floor(Math.random()*100)}`)}>✍️ user_1</button>
          <button className="btn btn-ghost" onClick={() => handleWrite('user_4', 'Dave')}>✍️ user_4 (新)</button>
          <button className="btn btn-ghost" onClick={handleReset}>重置</button>
        </div>
      </div>

      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{hits}</div>
          <div className="sim-stat-label">Cache Hit</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-warning)' }}>{misses}</div>
          <div className="sim-stat-label">Cache Miss</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{hitRate}%</div>
          <div className="sim-stat-label">命中率</div>
        </div>
        {strategy === 'write-behind' && (
          <div className="sim-stat-card">
            <div className="sim-stat-value" style={{ color: pendingWrites.length > 0 ? 'var(--clr-warning)' : undefined }}>{pendingWrites.length}</div>
            <div className="sim-stat-label">待寫入</div>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="cache-strategy-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
