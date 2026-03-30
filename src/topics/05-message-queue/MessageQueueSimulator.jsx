// 訊息佇列 Delivery Semantics 模擬器
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './MessageQueueSimulator.css'

const SEMANTICS = [
  { id: 'at-most-once', label: 'At-Most-Once' },
  { id: 'at-least-once', label: 'At-Least-Once' },
  { id: 'exactly-once', label: 'Exactly-Once' },
]

const SEMANTIC_DESC = {
  'at-most-once': '訊息最多被處理一次。Producer 送出後不重試，Consumer 收到就 ACK。可能會遺失訊息，但不會重複。適合：日誌、監控指標（丟一些可接受）。',
  'at-least-once': '訊息至少被處理一次。Producer 會重試直到收到 ACK，Consumer 處理完才 ACK。可能重複處理，需要消費端做冪等性（Idempotency）設計。適合：支付、訂單處理。',
  'exactly-once': '訊息恰好被處理一次。結合交易性 Producer、Consumer Offset Commit 和冪等性設計。實作成本最高但保證最強。適合：金融交易、庫存扣減。',
}

/**
 * 訊息佇列 Delivery Semantics 模擬器
 * 視覺化 Producer → Queue → Consumer 的訊息投遞語意
 */
export default function MessageQueueSimulator({ onInteract }) {
  const [semantic, setSemantic] = useState('at-most-once')
  const [queue, setQueue] = useState([]) // 佇列中的訊息
  const [produced, setProduced] = useState(0) // 已生產
  const [consumed, setConsumed] = useState(0) // 已消費（含重複）
  const [lost, setLost] = useState(0) // 遺失
  const [duplicated, setDuplicated] = useState(0) // 重複消費
  const [uniqueProcessed, setUniqueProcessed] = useState(0) // 實際處理（去重）
  const [processedIds, setProcessedIds] = useState(new Set()) // 已處理的訊息 ID
  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const msgIdRef = useRef(0)
  const hasInteracted = useRef(false)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const addLog = useCallback((type, msg) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 30))
  }, [])

  // 發送訊息
  const produceMessage = useCallback(() => {
    triggerInteract()
    msgIdRef.current++
    const msgId = msgIdRef.current
    const msg = { id: msgId, content: `order_${msgId}`, attempts: 0 }

    setProduced(prev => prev + 1)

    if (semantic === 'at-most-once') {
      // 模擬網路不可靠：20% 機率訊息遺失
      if (Math.random() < 0.2) {
        addLog('error', `📤 Message #${msgId} 發送失敗 — 訊息遺失（At-Most-Once 不重試）`)
        setLost(prev => prev + 1)
        return
      }
      setQueue(prev => [...prev, msg])
      addLog('success', `📤 Message #${msgId} 已送入 Queue`)
    } else if (semantic === 'at-least-once') {
      // 模擬重試：可能送入多次
      const willRetry = Math.random() < 0.3
      setQueue(prev => [...prev, msg])
      addLog('success', `📤 Message #${msgId} 已送入 Queue`)
      if (willRetry) {
        // 模擬重試導致重複入隊
        setTimeout(() => {
          setQueue(prev => [...prev, { ...msg, attempts: 1 }])
          addLog('warning', `📤 Message #${msgId} 重試 — 再次送入 Queue（可能導致重複消費）`)
        }, 300)
      }
    } else {
      // Exactly-Once：交易性 Producer
      setQueue(prev => [...prev, { ...msg, txId: `tx_${msgId}` }])
      addLog('success', `📤 Message #${msgId} 以交易方式送入 Queue（txId: tx_${msgId}）`)
    }
  }, [semantic, triggerInteract, addLog])

  // 消費訊息
  const consumeMessage = useCallback(() => {
    triggerInteract()
    setQueue(prev => {
      if (prev.length === 0) {
        addLog('info', '📭 Queue 為空，沒有訊息可消費')
        return prev
      }

      const [msg, ...rest] = prev
      setConsumed(c => c + 1)

      if (semantic === 'at-most-once') {
        // 直接 ACK，不管處理是否成功
        setProcessedIds(s => new Set([...s, msg.id]))
        setUniqueProcessed(u => u + 1)
        addLog('success', `📥 消費 Message #${msg.id} → 立即 ACK（不管處理結果）`)
      } else if (semantic === 'at-least-once') {
        const isDupe = processedIds.has(msg.id)
        if (isDupe) {
          setDuplicated(d => d + 1)
          addLog('warning', `📥 消費 Message #${msg.id} → ⚠️ 重複消費！（需要冪等性保護）`)
        } else {
          setProcessedIds(s => new Set([...s, msg.id]))
          setUniqueProcessed(u => u + 1)
          addLog('success', `📥 消費 Message #${msg.id} → 處理完成後 ACK`)
        }
      } else {
        // Exactly-Once：結合 offset commit 和冪等性
        const isDupe = processedIds.has(msg.id)
        if (isDupe) {
          addLog('info', `📥 Message #${msg.id} 已處理過 → 冪等性跳過，Offset 推進`)
        } else {
          setProcessedIds(s => new Set([...s, msg.id]))
          setUniqueProcessed(u => u + 1)
          addLog('success', `📥 消費 Message #${msg.id} → 交易性 Commit（Offset + 業務邏輯原子提交）`)
        }
      }

      return rest
    })
  }, [semantic, processedIds, triggerInteract, addLog])

  // 批次操作
  const produceBatch = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => produceMessage(), i * 100)
    }
  }, [produceMessage])


  // 重置
  const handleReset = useCallback(() => {
    setQueue([])
    setProduced(0)
    setConsumed(0)
    setLost(0)
    setDuplicated(0)
    setUniqueProcessed(0)
    setProcessedIds(new Set())
    setLogs([])
    msgIdRef.current = 0
  }, [])

  // 切換語意
  const handleSemanticChange = useCallback((s) => {
    setSemantic(s)
    handleReset()
  }, [handleReset])

  return (
    <div className="simulator-container mq-sim" id="mq-simulator">
      <div className="simulator-title">
        <span className="icon">📬</span>
        訊息佇列 Delivery Semantics 模擬器
      </div>

      <TabGroup tabs={SEMANTICS} defaultTab="at-most-once" onChange={handleSemanticChange} />

      <div className="mq-desc">{SEMANTIC_DESC[semantic]}</div>

      {/* Producer → Queue → Consumer 流程圖 */}
      <div className="mq-flow">
        <div className="mq-flow-node producer">
          <div className="flow-icon">📤</div>
          <div className="flow-label">Producer</div>
          <div className="flow-stat">已發送: {produced}</div>
        </div>

        <div className="mq-flow-arrow">→</div>

        <div className="mq-flow-node queue-box">
          <div className="flow-icon">📬</div>
          <div className="flow-label">Queue</div>
          <div className="flow-stat">待處理: {queue.length}</div>
          {/* 佇列中的訊息視覺化 */}
          <div className="mq-queue-items">
            {queue.slice(0, 8).map((msg, i) => (
              <div key={`${msg.id}-${msg.attempts}-${i}`} className={`mq-queue-item ${msg.attempts > 0 ? 'retry' : ''}`}>
                #{msg.id}
              </div>
            ))}
            {queue.length > 8 && <span className="mq-queue-more">+{queue.length - 8}</span>}
          </div>
        </div>

        <div className="mq-flow-arrow">→</div>

        <div className="mq-flow-node consumer">
          <div className="flow-icon">📥</div>
          <div className="flow-label">Consumer</div>
          <div className="flow-stat">已消費: {consumed}</div>
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="mq-controls">
        <button className="btn btn-primary" onClick={produceMessage} id="mq-produce">
          📤 發送訊息
        </button>
        <button className="btn btn-ghost" onClick={produceBatch} id="mq-batch">
          📤 批次發送（×5）
        </button>
        <button className="btn btn-primary" onClick={consumeMessage} id="mq-consume">
          📥 消費一筆
        </button>
        <button className="btn btn-ghost" onClick={handleReset} id="mq-reset">
          重置
        </button>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{produced}</div>
          <div className="sim-stat-label">已發送</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{uniqueProcessed}</div>
          <div className="sim-stat-label">實際處理</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: lost > 0 ? 'var(--clr-error)' : undefined }}>{lost}</div>
          <div className="sim-stat-label">遺失</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: duplicated > 0 ? 'var(--clr-warning)' : undefined }}>{duplicated}</div>
          <div className="sim-stat-label">重複消費</div>
        </div>
      </div>

      {/* 日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="mq-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
