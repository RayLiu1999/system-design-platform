// Rate Limiting 模擬器 — 4 種限流算法視覺化
import { useState, useCallback, useRef, useEffect } from 'react'
import TabGroup from '../../components/TabGroup'
import './RateLimitingSimulator.css'

const ALGORITHMS = [
  { id: 'fixed', label: 'Fixed Window' },
  { id: 'sliding', label: 'Sliding Window' },
  { id: 'token', label: 'Token Bucket' },
  { id: 'leaky', label: 'Leaky Bucket' },
]

const ALGO_DESC = {
  fixed: '將時間分成固定視窗（如 1 秒），每個視窗內允許最多 N 個請求。簡單但有邊界突增問題：在視窗交界處可能瞬間通過 2N 個請求。',
  sliding: '結合前一個視窗和當前視窗的請求比例計算。解決 Fixed Window 的邊界突增問題，提供更平滑的限流效果。',
  token: '以固定速率向桶中添加 Token，每個請求消耗一個 Token。桶滿時 Token 不再增加。允許短暫的突發流量（消耗桶中積累的 Token）。',
  leaky: '請求先進入佇列（桶），以固定速率從桶中處理。桶滿時拒絕新請求。平滑輸出速率，完全消除突發流量。',
}

/**
 * Rate Limiting 模擬器
 * 4 種限流算法的視覺化對比
 */
export default function RateLimitingSimulator({ onInteract }) {
  const [algo, setAlgo] = useState('fixed')
  const [limit, setLimit] = useState(5) // 每秒允許的請求數 / 桶容量
  const [allowed, setAllowed] = useState(0)
  const [rejected, setRejected] = useState(0)
  const [totalReqs, setTotalReqs] = useState(0)
  const [logs, setLogs] = useState([])

  // 算法內部狀態
  const [windowCount, setWindowCount] = useState(0) // Fixed/Sliding Window 當前視窗計數
  const [prevWindowCount, setPrevWindowCount] = useState(0) // Sliding Window 上一視窗計數
  const [tokens, setTokens] = useState(5) // Token Bucket 當前 token 數
  const [queueSize, setQueueSize] = useState(0) // Leaky Bucket 佇列大小
  const [windowProgress, setWindowProgress] = useState(0) // 視窗進度 0-100%

  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)
  const tokensRef = useRef(5)
  const queueRef = useRef(0)
  const windowCountRef = useRef(0)
  const prevWindowCountRef = useRef(0)

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

  // 視窗計時器 + Token 補充 + Leaky Bucket 處理
  useEffect(() => {
    // 每 100ms 更新視窗進度
    const ticker = setInterval(() => {
      setWindowProgress(prev => {
        const next = prev + 10 // 每 100ms 增加 10%（1 秒一個完整視窗）
        if (next >= 100) {
          // 視窗結束，重置計數
          prevWindowCountRef.current = windowCountRef.current
          setPrevWindowCount(windowCountRef.current)
          windowCountRef.current = 0
          setWindowCount(0)
          return 0
        }
        return next
      })

      // Token Bucket：每 200ms 補充一個 token
      tokensRef.current = Math.min(limit, tokensRef.current + 0.5)
      setTokens(Math.floor(tokensRef.current))

      // Leaky Bucket：每 200ms 處理一個請求
      if (queueRef.current > 0) {
        queueRef.current = Math.max(0, queueRef.current - 0.5)
        setQueueSize(Math.ceil(queueRef.current))
      }
    }, 100)

    return () => clearInterval(ticker)
  }, [limit])

  // 發送請求
  const sendRequest = useCallback(() => {
    triggerInteract()
    setTotalReqs(prev => prev + 1)

    let isAllowed = false

    if (algo === 'fixed') {
      // Fixed Window：計數 < limit 則允許
      if (windowCountRef.current < limit) {
        windowCountRef.current++
        setWindowCount(windowCountRef.current)
        isAllowed = true
      }
    } else if (algo === 'sliding') {
      // Sliding Window：結合前一視窗權重
      const weight = 1 - (windowProgress / 100)
      const estimate = prevWindowCountRef.current * weight + windowCountRef.current
      if (estimate < limit) {
        windowCountRef.current++
        setWindowCount(windowCountRef.current)
        isAllowed = true
      }
    } else if (algo === 'token') {
      // Token Bucket：消耗一個 token
      if (tokensRef.current >= 1) {
        tokensRef.current--
        setTokens(Math.floor(tokensRef.current))
        isAllowed = true
      }
    } else if (algo === 'leaky') {
      // Leaky Bucket：加入佇列
      if (queueRef.current < limit) {
        queueRef.current++
        setQueueSize(Math.ceil(queueRef.current))
        isAllowed = true
      }
    }

    if (isAllowed) {
      setAllowed(prev => prev + 1)
      addLog('success', `✅ 請求通過（${algo === 'token' ? `剩餘 Token: ${Math.floor(tokensRef.current)}` : algo === 'leaky' ? `佇列: ${Math.ceil(queueRef.current)}/${limit}` : `計數: ${windowCountRef.current}/${limit}`}）`)
    } else {
      setRejected(prev => prev + 1)
      addLog('error', `❌ 請求被拒絕 — 超過速率限制（${algo === 'token' ? 'Token 不足' : algo === 'leaky' ? '佇列已滿' : '視窗配額用盡'}）`)
    }
  }, [algo, limit, windowProgress, triggerInteract, addLog])

  // 壓力測試
  const sendBurst = useCallback(() => {
    triggerInteract()
    for (let i = 0; i < 15; i++) {
      setTimeout(() => sendRequest(), i * 40)
    }
  }, [sendRequest, triggerInteract])

  // 切換算法
  const handleAlgoChange = useCallback((newAlgo) => {
    setAlgo(newAlgo)
    setAllowed(0)
    setRejected(0)
    setTotalReqs(0)
    setLogs([])
    setWindowCount(0)
    setPrevWindowCount(0)
    setWindowProgress(0)
    setTokens(limit)
    setQueueSize(0)
    windowCountRef.current = 0
    prevWindowCountRef.current = 0
    tokensRef.current = limit
    queueRef.current = 0
  }, [limit])

  // 重置
  const handleReset = useCallback(() => {
    setAllowed(0)
    setRejected(0)
    setTotalReqs(0)
    setLogs([])
    setWindowCount(0)
    setPrevWindowCount(0)
    setTokens(limit)
    setQueueSize(0)
    windowCountRef.current = 0
    prevWindowCountRef.current = 0
    tokensRef.current = limit
    queueRef.current = 0
  }, [limit])

  const allowRate = totalReqs > 0 ? Math.round((allowed / totalReqs) * 100) : 100

  return (
    <div className="simulator-container rate-limit-sim" id="rate-limit-simulator">
      <div className="simulator-title">
        <span className="icon">🚦</span>
        Rate Limiting Simulator
      </div>

      {/* 算法切換 */}
      <TabGroup tabs={ALGORITHMS} defaultTab="fixed" onChange={handleAlgoChange} />

      {/* 算法說明 */}
      <div className="rl-algo-desc">{ALGO_DESC[algo]}</div>

      {/* 參數調整 */}
      <div className="sim-controls">
        <label>
          速率限制：
          <input
            type="range"
            min="2"
            max="10"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            id="rl-limit-slider"
          />
          <span className="rl-limit-value">{limit} req/s</span>
        </label>
      </div>

      {/* 算法狀態視覺化 */}
      <div className="rl-state-panel">
        {(algo === 'fixed' || algo === 'sliding') && (
          <div className="rl-window-vis">
            <div className="rl-window-label">
              {algo === 'fixed' ? 'Fixed Window' : 'Sliding Window'} — {windowCount}/{limit}
            </div>
            <div className="rl-window-bar">
              <div className="rl-window-progress" style={{ width: `${windowProgress}%` }} />
              {/* 每個格子代表一個配額 */}
              <div className="rl-window-slots">
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className={`rl-slot ${i < windowCount ? 'used' : ''}`} />
                ))}
              </div>
            </div>
            {algo === 'sliding' && (
              <div className="rl-sliding-note">上一視窗計數：{prevWindowCount}</div>
            )}
          </div>
        )}

        {algo === 'token' && (
          <div className="rl-bucket-vis">
            <div className="rl-bucket-label">Token Bucket — {Math.floor(tokens)}/{limit}</div>
            <div className="rl-bucket">
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className={`rl-token ${i < Math.floor(tokens) ? 'filled' : ''}`}>
                  {i < Math.floor(tokens) ? '●' : '○'}
                </div>
              ))}
            </div>
            <div className="rl-bucket-note">Token 以固定速率補充中...</div>
          </div>
        )}

        {algo === 'leaky' && (
          <div className="rl-bucket-vis">
            <div className="rl-bucket-label">Leaky Bucket — 佇列 {queueSize}/{limit}</div>
            <div className="rl-leaky-bucket">
              <div className="rl-leaky-water" style={{ height: `${(queueSize / limit) * 100}%` }} />
              <div className="rl-leaky-drip">💧</div>
            </div>
            <div className="rl-bucket-note">請求以固定速率流出...</div>
          </div>
        )}
      </div>

      {/* 控制按鈕 */}
      <div className="rl-controls">
        <button className="btn btn-primary" onClick={sendRequest} id="rl-send">
          送出請求
        </button>
        <button className="btn btn-ghost" onClick={sendBurst} id="rl-burst">
          突發流量（×15）
        </button>
        <button className="btn btn-ghost" onClick={handleReset} id="rl-reset">
          重置
        </button>
        <span className="rl-total">通過率：{allowRate}%</span>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{totalReqs}</div>
          <div className="sim-stat-label">總請求</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{allowed}</div>
          <div className="sim-stat-label">允許</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{rejected}</div>
          <div className="sim-stat-label">拒絕</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{allowRate}%</div>
          <div className="sim-stat-label">通過率</div>
        </div>
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="rl-log">
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
