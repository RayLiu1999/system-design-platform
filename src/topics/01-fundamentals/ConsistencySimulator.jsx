// 一致性模型對比模擬器 — ACID vs BASE
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './ConsistencySimulator.css'

const MODES = [
  { id: 'acid', label: 'ACID（強一致性）' },
  { id: 'base', label: 'BASE（最終一致性）' },
]

/**
 * ACID vs BASE 一致性模型模擬器
 * 模擬銀行轉帳場景：觀察強一致性與最終一致性的行為差異
 */
export default function ConsistencySimulator({ onInteract }) {
  const [mode, setMode] = useState('acid')
  const [accountA, setAccountA] = useState(1000)
  const [accountB, setAccountB] = useState(1000)
  const [pendingA, setPendingA] = useState(null) // BASE 模式下的暫態值
  const [pendingB, setPendingB] = useState(null)
  const [logs, setLogs] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [txCount, setTxCount] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [inconsistentSnapshots, setInconsistentSnapshots] = useState(0)
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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }, [])

  // 轉帳操作
  const handleTransfer = useCallback((amount) => {
    triggerInteract()
    setTxCount(prev => prev + 1)

    if (mode === 'acid') {
      // ACID：原子性操作，要麼全部成功，要麼全部回滾
      setIsProcessing(true)
      addLog('info', `🔒 開始交易：A → B 轉帳 $${amount}（ACID 模式）`)

      // 模擬 BEGIN TRANSACTION
      setTimeout(() => {
        addLog('info', '  ├─ BEGIN TRANSACTION')

        setTimeout(() => {
          // 檢查餘額是否足夠
          if (accountA < amount) {
            addLog('error', `  ├─ ❌ 餘額不足（A: $${accountA}，需要 $${amount}）`)
            addLog('error', '  └─ ROLLBACK — 交易取消')
            setFailCount(prev => prev + 1)
            setIsProcessing(false)
            return
          }

          addLog('info', `  ├─ UPDATE accounts SET balance = balance - ${amount} WHERE id = 'A'`)

          setTimeout(() => {
            addLog('info', `  ├─ UPDATE accounts SET balance = balance + ${amount} WHERE id = 'B'`)

            // 模擬隨機失敗（10% 機率）
            const willFail = Math.random() < 0.1
            setTimeout(() => {
              if (willFail) {
                addLog('error', '  ├─ ⚠️ 發生錯誤（死鎖 / 約束違反）')
                addLog('error', '  └─ ROLLBACK — 所有變更已回滾，餘額不變')
                setFailCount(prev => prev + 1)
              } else {
                setAccountA(prev => prev - amount)
                setAccountB(prev => prev + amount)
                addLog('success', '  └─ COMMIT ✓ — 交易完成，兩帳戶同步更新')
                setSuccessCount(prev => prev + 1)
              }
              setIsProcessing(false)
            }, 300)
          }, 300)
        }, 300)
      }, 200)
    } else {
      // BASE：最終一致性，先寫入日誌，非同步同步
      setIsProcessing(true)
      addLog('info', `📨 提交轉帳事件：A → B $${amount}（BASE 模式）`)

      // 第一階段：先扣 A（可能暫時不一致）
      setTimeout(() => {
        const newA = accountA - amount
        if (newA < 0) {
          addLog('error', `❌ 餘額不足，事件被拒絕`)
          setFailCount(prev => prev + 1)
          setIsProcessing(false)
          return
        }

        setPendingA(newA)
        setAccountA(newA)
        addLog('warning', `  ├─ A 已扣款 → $${newA}（B 尚未收到）`)
        addLog('warning', `  ├─ ⚠️ 此刻 A+B ≠ $2000 — 暫時不一致（Soft State）`)
        setInconsistentSnapshots(prev => prev + 1)

        // 第二階段：延遲加 B（模擬非同步同步）
        const delay = 800 + Math.random() * 1200
        setTimeout(() => {
          const newB = accountB + amount
          setPendingB(newB)
          setAccountB(newB)
          addLog('success', `  ├─ B 已收款 → $${newB}（非同步同步完成）`)
          addLog('success', `  └─ Eventually Consistent ✓ — A+B = $${newA + newB}`)
          setPendingA(null)
          setPendingB(null)
          setSuccessCount(prev => prev + 1)
          setIsProcessing(false)
        }, delay)
      }, 300)
    }
  }, [mode, accountA, accountB, triggerInteract, addLog])

  // 模擬讀取快照（在 BASE 模式下可能讀到不一致資料）
  const handleSnapshot = useCallback(() => {
    triggerInteract()
    const total = accountA + accountB
    const isConsistent = total === 2000
    if (isConsistent) {
      addLog('success', `📸 快照查詢：A=$${accountA}, B=$${accountB}, 總和=$${total} ✓ 一致`)
    } else {
      addLog('error', `📸 快照查詢：A=$${accountA}, B=$${accountB}, 總和=$${total} ❌ 不一致！`)
      setInconsistentSnapshots(prev => prev + 1)
    }
  }, [accountA, accountB, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setAccountA(1000)
    setAccountB(1000)
    setPendingA(null)
    setPendingB(null)
    setLogs([])
    setIsProcessing(false)
    setTxCount(0)
    setSuccessCount(0)
    setFailCount(0)
    setInconsistentSnapshots(0)
  }, [])

  const total = accountA + accountB

  return (
    <div className="simulator-container consistency-sim" id="consistency-simulator">
      <div className="simulator-title">
        <span className="icon">⚖️</span>
        ACID vs BASE 一致性模型模擬器
      </div>

      <TabGroup tabs={MODES} defaultTab="acid" onChange={(m) => { setMode(m); handleReset() }} />

      <div className="consistency-desc">
        {mode === 'acid'
          ? '🔒 ACID（Atomicity, Consistency, Isolation, Durability）：交易具備原子性，要麼全部成功要麼全部回滾。適用於金融、銀行等強一致性場景。代表：PostgreSQL、MySQL InnoDB'
          : '🌐 BASE（Basically Available, Soft State, Eventually Consistent）：系統允許暫時不一致，但最終會達到一致。適用於高可用的分散式場景。代表：Cassandra、DynamoDB、MongoDB'
        }
      </div>

      {/* 帳戶視覺化 */}
      <div className="consistency-accounts">
        <div className={`consistency-account ${pendingA !== null ? 'pending' : ''}`}>
          <div className="account-label">帳戶 A</div>
          <div className="account-balance">${accountA}</div>
          {pendingA !== null && (
            <div className="account-pending">同步中...</div>
          )}
        </div>

        <div className="consistency-arrow">
          {isProcessing ? '⏳' : '→'}
        </div>

        <div className={`consistency-account ${pendingB !== null ? 'pending' : ''}`}>
          <div className="account-label">帳戶 B</div>
          <div className="account-balance">${accountB}</div>
          {pendingB !== null && (
            <div className="account-pending">等待接收...</div>
          )}
        </div>

        <div className={`consistency-total ${total !== 2000 ? 'inconsistent' : ''}`}>
          <div className="total-label">總和</div>
          <div className="total-value">${total}</div>
          <div className="total-status">{total === 2000 ? '✓ 一致' : '⚠️ 暫時不一致'}</div>
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="consistency-controls">
        <button className="btn btn-primary" onClick={() => handleTransfer(100)} disabled={isProcessing} id="transfer-100">
          轉帳 $100
        </button>
        <button className="btn btn-ghost" onClick={() => handleTransfer(200)} disabled={isProcessing} id="transfer-200">
          轉帳 $200
        </button>
        <button className="btn btn-ghost" onClick={() => handleTransfer(500)} disabled={isProcessing} id="transfer-500">
          轉帳 $500
        </button>
        {mode === 'base' && (
          <button className="btn btn-ghost" onClick={handleSnapshot} id="snapshot">
            📸 快照查詢
          </button>
        )}
        <button className="btn btn-ghost" onClick={handleReset} id="consistency-reset">
          重置
        </button>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{txCount}</div>
          <div className="sim-stat-label">總交易數</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{successCount}</div>
          <div className="sim-stat-label">成功</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{failCount}</div>
          <div className="sim-stat-label">失敗/回滾</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: inconsistentSnapshots > 0 ? 'var(--clr-warning)' : undefined }}>{inconsistentSnapshots}</div>
          <div className="sim-stat-label">不一致快照</div>
        </div>
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="consistency-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>
              <span className="log-time">[{log.time}]</span> {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
