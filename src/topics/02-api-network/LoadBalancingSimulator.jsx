// Load Balancing Simulator — 重構自現有的 HTML 版本，轉為 React 元件
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './LoadBalancingSimulator.css'

const ALGORITHMS = [
  { id: 'rr', label: 'Round Robin' },
  { id: 'wrr', label: 'Weighted RR' },
  { id: 'lc', label: 'Least Connection' },
  { id: 'ip', label: 'IP Hash' },
  { id: 'rand', label: 'Random' },
]

const ALGO_DESCRIPTIONS = {
  rr: '依序將請求分派給每台伺服器，每輪各拿一次。所有伺服器處理能力相同時效果最佳，實作最簡單。',
  wrr: '根據各伺服器的「權重」按比例分配流量，適合規格不同的伺服器叢集（如高配與低配混用）。權重越高拿到越多請求。',
  lc: '每次都把請求送給當前連線數最少的伺服器。適合請求處理時間差異大的場景（例如有長連線的 WebSocket）。',
  ip: '根據客戶端 IP 的雜湊值決定目標伺服器，相同 IP 永遠打到同一台。適合需要 Session 親和性（Sticky Session）的情境。',
  rand: '完全隨機選一台伺服器。實作極簡，在大流量下統計效果接近 Round Robin，但無法保證均衡。',
}

const WEIGHTS = [3, 2, 1]
const SERVER_COUNT = 3

/**
 * Load Balancing Simulator 互動模擬器
 * 支援 5 種負載均衡算法的視覺化模擬
 */
export default function LoadBalancingSimulator({ onInteract }) {
  const [algo, setAlgo] = useState('rr')
  const [total, setTotal] = useState(0)
  const [hits, setHits] = useState([0, 0, 0])
  const [activeConn, setActiveConn] = useState([0, 0, 0])
  const [activeServer, setActiveServer] = useState(-1)
  const [logs, setLogs] = useState([])

  // 使用 ref 追蹤可變值（避免閉包問題）
  const rrIdxRef = useRef(0)
  const wrrPosRef = useRef([0, 0, 0])
  const ipMapRef = useRef({})
  const hitsRef = useRef([0, 0, 0])
  const activeConnRef = useRef([0, 0, 0])
  const totalRef = useRef(0)
  const hasInteracted = useRef(false)

  // 選擇伺服器（核心算法邏輯）
  const pickServer = useCallback((ipKey) => {
    if (algo === 'rr') {
      const s = rrIdxRef.current % SERVER_COUNT
      rrIdxRef.current++
      return s
    }
    if (algo === 'wrr') {
      let best = -1
      let bestW = -1
      const pos = [...wrrPosRef.current]
      for (let i = 0; i < SERVER_COUNT; i++) {
        pos[i] += WEIGHTS[i]
        if (pos[i] > bestW) {
          bestW = pos[i]
          best = i
        }
      }
      pos[best] -= WEIGHTS.reduce((a, b) => a + b, 0)
      wrrPosRef.current = pos
      return best
    }
    if (algo === 'lc') {
      let min = Infinity
      let idx = 0
      activeConnRef.current.forEach((c, i) => {
        if (c < min) { min = c; idx = i }
      })
      return idx
    }
    if (algo === 'ip') {
      if (!(ipKey in ipMapRef.current)) {
        ipMapRef.current[ipKey] = Object.keys(ipMapRef.current).length % SERVER_COUNT
      }
      return ipMapRef.current[ipKey]
    }
    // Random
    return Math.floor(Math.random() * SERVER_COUNT)
  }, [algo])

  // 發送請求
  const sendRequest = useCallback((ip) => {
    const ipKey = ip || `ip${Math.floor(Math.random() * 4)}`
    const s = pickServer(ipKey)

    // 觸發互動記錄
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }

    // 更新統計
    totalRef.current++
    hitsRef.current = [...hitsRef.current]
    hitsRef.current[s]++
    activeConnRef.current = [...activeConnRef.current]
    activeConnRef.current[s]++

    setTotal(totalRef.current)
    setHits([...hitsRef.current])
    setActiveConn([...activeConnRef.current])
    setActiveServer(s)

    // 新增日誌
    setLogs(prev => {
      const next = [{ id: totalRef.current, ip: ipKey, server: s }, ...prev]
      return next.slice(0, 20) // 只保留最近 20 筆
    })

    // 模擬連線釋放（800-2000ms 後）
    const delay = 800 + Math.random() * 1200
    setTimeout(() => {
      activeConnRef.current = [...activeConnRef.current]
      activeConnRef.current[s] = Math.max(0, activeConnRef.current[s] - 1)
      setActiveConn([...activeConnRef.current])
      setActiveServer(-1)
    }, delay)
  }, [pickServer, onInteract])

  // 壓力測試（連續發送 10 個請求）
  const sendBurst = useCallback(() => {
    const ips = ['ip0', 'ip1', 'ip2', 'ip3']
    for (let i = 0; i < 10; i++) {
      setTimeout(() => sendRequest(ips[i % 4]), i * 80)
    }
  }, [sendRequest])

  // 重置所有狀態
  const resetAll = useCallback(() => {
    rrIdxRef.current = 0
    wrrPosRef.current = [0, 0, 0]
    ipMapRef.current = {}
    hitsRef.current = [0, 0, 0]
    activeConnRef.current = [0, 0, 0]
    totalRef.current = 0
    setTotal(0)
    setHits([0, 0, 0])
    setActiveConn([0, 0, 0])
    setActiveServer(-1)
    setLogs([])
  }, [])

  // 切換算法時重置狀態
  const handleAlgoChange = useCallback((newAlgo) => {
    setAlgo(newAlgo)
    // 直接重置 refs 和 state，避免依賴 resetAll
    rrIdxRef.current = 0
    wrrPosRef.current = [0, 0, 0]
    ipMapRef.current = {}
    hitsRef.current = [0, 0, 0]
    activeConnRef.current = [0, 0, 0]
    totalRef.current = 0
    setTotal(0)
    setHits([0, 0, 0])
    setActiveConn([0, 0, 0])
    setActiveServer(-1)
    setLogs([])
  }, [])

  // 計算最大連線數（用於進度條比例）
  const maxConn = Math.max(...activeConn, 1)

  return (
    <div className="simulator-container" id="lb-simulator">
      <div className="simulator-title">
        <span className="icon">⚖️</span>
        Load Balancing Simulator
      </div>

      {/* 算法切換 Tab */}
      <TabGroup
        tabs={ALGORITHMS}
        defaultTab="rr"
        onChange={handleAlgoChange}
      />

      {/* 算法說明 */}
      <div className="lb-algo-desc">
        {ALGO_DESCRIPTIONS[algo]}
      </div>

      {/* Load Balancer 區塊 */}
      <div className="lb-box">
        Load Balancer
      </div>

      {/* 伺服器節點 */}
      <div className="sim-node-group lb-servers">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`sim-node ${activeServer === i ? 'active' : ''}`}
            id={`lb-server-${i}`}
          >
            <div className="node-label">Server {i + 1}</div>
            <div className="node-value">{activeConn[i]}</div>
            {algo === 'wrr' && (
              <div className="node-sub">weight: {WEIGHTS[i]}</div>
            )}
            <div className="sim-bar">
              <div
                className="sim-bar-fill"
                style={{ width: `${Math.round((activeConn[i] / maxConn) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* IP Hash 提示 */}
      {algo === 'ip' && (
        <div className="sim-hint">
          IP Hash 會根據客戶端 IP 的雜湊值固定路由到同一台伺服器（模擬 4 個不同 IP）
        </div>
      )}

      {/* 控制按鈕 */}
      <div className="lb-controls">
        <button className="btn btn-primary" onClick={() => sendRequest()} id="lb-send">
          送出請求 ↗
        </button>
        <button className="btn btn-ghost" onClick={sendBurst} id="lb-burst">
          壓力測試（×10）
        </button>
        <button className="btn btn-ghost" onClick={resetAll} id="lb-reset">
          重置
        </button>
        <span className="lb-total">總請求：{total}</span>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        {[0, 1, 2].map(i => (
          <div key={i} className="sim-stat-card">
            <div className="sim-stat-value">
              {total ? Math.round((hits[i] / total) * 100) : 0}%
            </div>
            <div className="sim-stat-label">S{i + 1} 佔比</div>
          </div>
        ))}
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="lb-log">
          {logs.map(log => (
            <div key={log.id} className="sim-log-line">
              req #{log.id} [{log.ip}] → <span className="highlight">Server {log.server + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
