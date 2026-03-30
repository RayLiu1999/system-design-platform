// 分散式協調模擬器 — Distributed Lock (Redlock) + 分散式 ID 生成
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './DistributedCoordSimulator.css'

const FEATURES = [
  { id: 'lock', label: '分散式鎖 (Redlock)' },
  { id: 'snowflake', label: '分散式 ID (Snowflake)' },
]

const REDIS_NODES = 5

/**
 * 分散式協調模擬器
 * Redlock：5 個 Redis 節點的分散式鎖獲取流程
 * Snowflake：分散式 ID 生成原理視覺化
 */
export default function DistributedCoordSimulator({ onInteract }) {
  const [feature, setFeature] = useState('lock')

  // Redlock 狀態
  const [redisNodes, setRedisNodes] = useState(
    Array.from({ length: REDIS_NODES }, (_, i) => ({ id: i, alive: true, locked: false, holder: null }))
  )
  const [lockHolder, setLockHolder] = useState(null)
  const [lockAttempts, setLockAttempts] = useState(0)
  const [lockSuccesses, setLockSuccesses] = useState(0)
  const [lockFailures, setLockFailures] = useState(0)

  // Snowflake 狀態
  const [generatedIds, setGeneratedIds] = useState([])
  const [machineId] = useState(Math.floor(Math.random() * 31))
  const [sequence, setSequence] = useState(0)

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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 25))
  }, [])

  // ===== Redlock：嘗試獲取鎖 =====
  const tryLock = useCallback((client) => {
    triggerInteract()
    setLockAttempts(prev => prev + 1)

    if (lockHolder) {
      addLog('error', `🔒 Client ${client} 嘗試獲取鎖 — ❌ 鎖已被 Client ${lockHolder} 持有`)
      setLockFailures(prev => prev + 1)
      return
    }

    // 嘗試在多數節點上設置鎖
    let acquired = 0
    const results = []

    redisNodes.forEach(node => {
      if (!node.alive) {
        results.push({ id: node.id, success: false, reason: '節點已當機' })
        return
      }
      // 模擬獲取鎖（少概率失敗）
      const success = Math.random() > 0.05
      if (success) acquired++
      results.push({ id: node.id, success, reason: success ? '✓' : '超時' })
    })

    const majority = Math.floor(REDIS_NODES / 2) + 1
    const succeeded = acquired >= majority

    addLog('info', `🔒 Client ${client} 嘗試 Redlock（需 ${majority}/${REDIS_NODES} 節點）`)
    results.forEach(r => {
      addLog(r.success ? 'success' : 'error', `  ├─ Redis-${r.id}: ${r.reason}`)
    })

    if (succeeded) {
      setLockHolder(client)
      setLockSuccesses(prev => prev + 1)
      setRedisNodes(prev => prev.map(n => n.alive ? { ...n, locked: true, holder: client } : n))
      addLog('success', `  └─ ✓ 獲取成功！${acquired}/${REDIS_NODES} 節點確認（≥ ${majority}）`)
    } else {
      setLockFailures(prev => prev + 1)
      addLog('error', `  └─ ❌ 獲取失敗！僅 ${acquired}/${REDIS_NODES} 節點確認（< ${majority}）`)
    }
  }, [lockHolder, redisNodes, triggerInteract, addLog])

  // 釋放鎖
  const releaseLock = useCallback(() => {
    triggerInteract()
    if (!lockHolder) {
      addLog('info', '🔓 當前沒有持有鎖')
      return
    }
    addLog('success', `🔓 Client ${lockHolder} 釋放鎖 — 所有 Redis 節點已清除`)
    setLockHolder(null)
    setRedisNodes(prev => prev.map(n => ({ ...n, locked: false, holder: null })))
  }, [lockHolder, triggerInteract, addLog])

  // 當機 / 恢復 Redis 節點
  const toggleRedisNode = useCallback((nodeId) => {
    triggerInteract()
    setRedisNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n
      const newAlive = !n.alive
      if (newAlive) {
        addLog('info', `🔄 Redis-${nodeId} 已恢復`)
      } else {
        addLog('warning', `💥 Redis-${nodeId} 已當機`)
      }
      return { ...n, alive: newAlive, locked: false, holder: null }
    }))
  }, [triggerInteract, addLog])

  // ===== Snowflake ID 生成 =====
  const generateId = useCallback(() => {
    triggerInteract()
    const timestamp = Date.now()
    const newSeq = sequence + 1
    setSequence(newSeq)

    // Snowflake 結構：1 bit sign + 41 bit timestamp + 5 bit datacenter + 5 bit machine + 12 bit sequence
    const tsStr = (timestamp % (2 ** 41)).toString(2).padStart(41, '0')
    const dcStr = '00001' // datacenter 固定
    const machineStr = machineId.toString(2).padStart(5, '0')
    const seqStr = (newSeq % 4096).toString(2).padStart(12, '0')
    const binaryId = `0${tsStr}${dcStr}${machineStr}${seqStr}`
    const decimalId = BigInt(`0b${binaryId}`).toString()

    const idObj = {
      decimal: decimalId,
      binary: binaryId,
      parts: {
        sign: '0',
        timestamp: tsStr,
        datacenter: dcStr,
        machine: machineStr,
        sequence: seqStr,
      }
    }

    setGeneratedIds(prev => [idObj, ...prev].slice(0, 8))
    addLog('success', `🆔 生成 ID: ${decimalId.slice(0, 12)}...（Machine: ${machineId}, Seq: ${newSeq % 4096}）`)
  }, [machineId, sequence, triggerInteract, addLog])

  const generateBatch = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateId(), i * 50)
    }
  }, [generateId])

  // 重置
  const handleReset = useCallback(() => {
    setRedisNodes(Array.from({ length: REDIS_NODES }, (_, i) => ({ id: i, alive: true, locked: false, holder: null })))
    setLockHolder(null)
    setLockAttempts(0)
    setLockSuccesses(0)
    setLockFailures(0)
    setGeneratedIds([])
    setSequence(0)
    setLogs([])
  }, [])

  const aliveRedis = redisNodes.filter(n => n.alive).length
  const majority = Math.floor(REDIS_NODES / 2) + 1

  return (
    <div className="simulator-container dist-coord-sim" id="dist-coord-simulator">
      <div className="simulator-title">
        <span className="icon">🔗</span>
        分散式協調模擬器
      </div>

      <TabGroup tabs={FEATURES} defaultTab="lock" onChange={(f) => { setFeature(f); handleReset() }} />

      {feature === 'lock' ? (
        <>
          <div className="dc-desc">
            <strong>Redlock 算法</strong>：在 {REDIS_NODES} 個獨立的 Redis 實例上同時嘗試獲取鎖，
            若多數（≥ {majority}）節點獲取成功，則認為鎖獲取成功。即使部分節點當機，仍可正常運作。
          </div>

          {/* Redis 節點視覺化 */}
          <div className="dc-redis-nodes">
            {redisNodes.map(node => (
              <div
                key={node.id}
                className={`dc-redis-node ${!node.alive ? 'crashed' : ''} ${node.locked ? 'locked' : ''}`}
                onClick={() => toggleRedisNode(node.id)}
                id={`redis-node-${node.id}`}
              >
                <div className="dc-redis-icon">{!node.alive ? '💀' : node.locked ? '🔒' : '🟢'}</div>
                <div className="dc-redis-label">Redis-{node.id}</div>
                {node.holder && <div className="dc-redis-holder">by {node.holder}</div>}
                <div className="dc-redis-hint">{node.alive ? '點擊當機' : '點擊恢復'}</div>
              </div>
            ))}
          </div>

          <div className="dc-status">
            存活: <strong className={aliveRedis < majority ? 'danger' : ''}>{aliveRedis}/{REDIS_NODES}</strong>
            {' | '}多數門檻: <strong>{majority}</strong>
            {' | '}鎖狀態: <strong>{lockHolder ? `🔒 Client ${lockHolder}` : '🔓 無'}</strong>
          </div>

          <div className="dc-controls">
            <button className="btn btn-primary" onClick={() => tryLock('A')} id="lock-a">
              🔒 Client A 獲取鎖
            </button>
            <button className="btn btn-ghost" onClick={() => tryLock('B')} id="lock-b">
              🔒 Client B 獲取鎖
            </button>
            <button className="btn btn-ghost" onClick={releaseLock} id="release-lock">
              🔓 釋放鎖
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{lockAttempts}</div>
              <div className="sim-stat-label">嘗試次數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{lockSuccesses}</div>
              <div className="sim-stat-label">獲取成功</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{lockFailures}</div>
              <div className="sim-stat-label">獲取失敗</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dc-desc">
            <strong>Snowflake ID</strong>：Twitter 提出的分散式 ID 生成算法。64 位元結構：
            1 bit 符號位 + 41 bit 時間戳（可用 69 年）+ 5 bit 資料中心 + 5 bit 機器 + 12 bit 序列號（4096/ms）。
            保證全域唯一、趨勢遞增、不依賴 DB。
          </div>

          {/* Snowflake 位元結構 */}
          <div className="sf-structure">
            <div className="sf-bit sign">0</div>
            <div className="sf-bit-group timestamp">
              <div className="sf-bit-label">Timestamp (41 bit)</div>
            </div>
            <div className="sf-bit-group datacenter">
              <div className="sf-bit-label">DC (5)</div>
            </div>
            <div className="sf-bit-group machine">
              <div className="sf-bit-label">Machine (5)</div>
            </div>
            <div className="sf-bit-group seq">
              <div className="sf-bit-label">Seq (12)</div>
            </div>
          </div>

          <div className="sf-info">
            當前機器 ID: <strong>{machineId}</strong> | 序列號: <strong>{sequence % 4096}</strong>
          </div>

          {/* 生成的 ID 清單 */}
          {generatedIds.length > 0 && (
            <div className="sf-ids">
              {generatedIds.map((idObj, i) => (
                <div key={i} className="sf-id-row">
                  <span className="sf-id-decimal">{idObj.decimal}</span>
                  <span className="sf-id-parts">
                    <span className="sf-part sign">{idObj.parts.sign}</span>
                    <span className="sf-part ts">{idObj.parts.timestamp.slice(-12)}...</span>
                    <span className="sf-part dc">{idObj.parts.datacenter}</span>
                    <span className="sf-part mc">{idObj.parts.machine}</span>
                    <span className="sf-part sq">{idObj.parts.sequence}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="dc-controls">
            <button className="btn btn-primary" onClick={generateId} id="gen-id">
              🆔 生成 ID
            </button>
            <button className="btn btn-ghost" onClick={generateBatch} id="gen-batch">
              批次生成（×5）
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="dist-coord-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
