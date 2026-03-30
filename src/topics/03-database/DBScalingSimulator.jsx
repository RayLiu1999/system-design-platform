// 資料庫擴展策略模擬器 — Replication / Sharding 視覺化
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './DBScalingSimulator.css'

const STRATEGIES = [
  { id: 'replication', label: 'Replication（主從複製）' },
  { id: 'sharding', label: 'Sharding（分片）' },
]

const SHARD_ALGOS = [
  { id: 'range', label: 'Range' },
  { id: 'hash', label: 'Hash' },
  { id: 'consistent', label: 'Consistent Hash' },
]

/**
 * 資料庫擴展策略模擬器
 * Replication：主從架構，讀寫分離，複製延遲
 * Sharding：Range / Hash / Consistent Hash 三種分片策略對比
 */
export default function DBScalingSimulator({ onInteract }) {
  const [strategy, setStrategy] = useState('replication')
  const [shardAlgo, setShardAlgo] = useState('range')

  // Replication 狀態
  const [primaryData, setPrimaryData] = useState([])
  const [replica1Data, setReplica1Data] = useState([])
  const [replica2Data, setReplica2Data] = useState([])
  const [replicaLag, setReplicaLag] = useState(0)
  const [writes, setWrites] = useState(0)
  const [reads, setReads] = useState(0)

  // Sharding 狀態
  const [shards, setShards] = useState([[], [], [], []])
  const [shardStats, setShardStats] = useState([0, 0, 0, 0])

  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)
  const dataIdRef = useRef(0)

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

  // ===== Replication =====
  const handleReplicationWrite = useCallback(() => {
    triggerInteract()
    dataIdRef.current++
    const record = { id: dataIdRef.current, value: `user_${dataIdRef.current}`, ts: Date.now() }

    // 寫入 Primary
    setPrimaryData(prev => [...prev, record].slice(-8))
    setWrites(prev => prev + 1)
    addLog('success', `✍️ 寫入 Primary：#${record.id} "${record.value}"`)

    // 非同步複製到 Replica（模擬延遲）
    const lag = Math.floor(Math.random() * 500) + 100
    setReplicaLag(lag)

    setTimeout(() => {
      setReplica1Data(prev => [...prev, record].slice(-8))
      addLog('info', `  ├─ Replica-1 同步完成（延遲 ${lag}ms）`)
    }, lag)

    setTimeout(() => {
      setReplica2Data(prev => [...prev, record].slice(-8))
      const lag2 = lag + Math.floor(Math.random() * 200)
      addLog('info', `  └─ Replica-2 同步完成（延遲 ${lag2}ms）`)
      setReplicaLag(0)
    }, lag + Math.floor(Math.random() * 200))
  }, [triggerInteract, addLog])

  const handleReplicationRead = useCallback(() => {
    triggerInteract()
    setReads(prev => prev + 1)
    // 隨機從 Replica 讀取
    const replicaIdx = Math.random() < 0.5 ? 1 : 2
    const replicaData = replicaIdx === 1 ? replica1Data : replica2Data
    const latest = replicaData[replicaData.length - 1]
    const primaryLatest = primaryData[primaryData.length - 1]

    if (!latest) {
      addLog('info', `📖 從 Replica-${replicaIdx} 讀取 → 空（尚無資料）`)
      return
    }

    const isStale = primaryLatest && latest.id !== primaryLatest.id
    if (isStale) {
      addLog('warning', `📖 從 Replica-${replicaIdx} 讀取 → #${latest.id}（⚠️ 主庫最新是 #${primaryLatest.id}，讀到舊資料）`)
    } else {
      addLog('success', `📖 從 Replica-${replicaIdx} 讀取 → #${latest.id}（✓ 資料一致）`)
    }
  }, [primaryData, replica1Data, replica2Data, triggerInteract, addLog])

  // ===== Sharding =====
  const getShardIndex = useCallback((key, algo) => {
    const numericKey = typeof key === 'number' ? key : parseInt(key, 10) || 0
    if (algo === 'range') {
      // Range Sharding：按 ID 範圍分片
      if (numericKey <= 250) return 0
      if (numericKey <= 500) return 1
      if (numericKey <= 750) return 2
      return 3
    } else if (algo === 'hash') {
      // Hash Sharding：取模分片
      return numericKey % 4
    } else {
      // Consistent Hash：模擬虛擬節點
      const hash = (numericKey * 2654435761) >>> 0
      return hash % 4
    }
  }, [])

  const handleShardWrite = useCallback(() => {
    triggerInteract()
    dataIdRef.current++
    const id = dataIdRef.current
    const shardIdx = getShardIndex(id, shardAlgo)

    setShards(prev => {
      const next = prev.map(s => [...s])
      next[shardIdx] = [...next[shardIdx], { id, value: `item_${id}` }].slice(-6)
      return next
    })
    setShardStats(prev => {
      const next = [...prev]
      next[shardIdx]++
      return next
    })

    addLog('success', `✍️ 寫入 #${id} → Shard ${shardIdx}（${shardAlgo === 'range' ? `Range: ${shardIdx * 250 + 1}-${(shardIdx + 1) * 250}` : shardAlgo === 'hash' ? `${id} % 4 = ${id % 4}` : 'Consistent Hash'}）`)
  }, [shardAlgo, getShardIndex, triggerInteract, addLog])

  const handleShardBurst = useCallback(() => {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => handleShardWrite(), i * 50)
    }
  }, [handleShardWrite])

  // 重置
  const handleReset = useCallback(() => {
    setPrimaryData([])
    setReplica1Data([])
    setReplica2Data([])
    setReplicaLag(0)
    setWrites(0)
    setReads(0)
    setShards([[], [], [], []])
    setShardStats([0, 0, 0, 0])
    setLogs([])
    dataIdRef.current = 0
  }, [])

  const handleStrategyChange = useCallback((s) => {
    setStrategy(s)
    handleReset()
  }, [handleReset])

  // 計算分片偏斜度
  const totalShardWrites = shardStats.reduce((a, b) => a + b, 0)
  const maxShard = Math.max(...shardStats)
  const minShard = Math.min(...shardStats)
  const skewness = totalShardWrites > 0 ? ((maxShard - minShard) / totalShardWrites * 100).toFixed(0) : 0

  return (
    <div className="simulator-container db-scaling-sim" id="db-scaling-simulator">
      <div className="simulator-title">
        <span className="icon">🗄️</span>
        資料庫擴展策略模擬器
      </div>

      <TabGroup tabs={STRATEGIES} defaultTab="replication" onChange={handleStrategyChange} />

      {strategy === 'replication' ? (
        <>
          <div className="db-desc">
            <strong>主從複製 (Primary-Replica)</strong>：所有寫入都經過 Primary 節點，非同步複製到 Replica 節點。
            讀取可以分散到多個 Replica 以提升吞吐量，但可能讀到尚未同步的舊資料（Replication Lag）。
          </div>

          {/* Replication 架構圖 */}
          <div className="db-replication-vis">
            <div className="db-node primary">
              <div className="db-node-badge">Primary (RW)</div>
              <div className="db-node-count">{primaryData.length} 筆</div>
              <div className="db-node-items">
                {primaryData.slice(-4).map(d => (
                  <span key={d.id} className="db-record">#{d.id}</span>
                ))}
              </div>
            </div>

            <div className="db-replication-arrows">
              <div className={`db-arrow ${replicaLag > 0 ? 'syncing' : ''}`}>
                → {replicaLag > 0 && <span className="db-lag">{replicaLag}ms</span>}
              </div>
              <div className={`db-arrow ${replicaLag > 0 ? 'syncing' : ''}`}>→</div>
            </div>

            <div className="db-replicas">
              <div className="db-node replica">
                <div className="db-node-badge">Replica-1 (R)</div>
                <div className="db-node-count">{replica1Data.length} 筆</div>
                <div className="db-node-items">
                  {replica1Data.slice(-4).map(d => (
                    <span key={d.id} className="db-record">#{d.id}</span>
                  ))}
                </div>
              </div>
              <div className="db-node replica">
                <div className="db-node-badge">Replica-2 (R)</div>
                <div className="db-node-count">{replica2Data.length} 筆</div>
                <div className="db-node-items">
                  {replica2Data.slice(-4).map(d => (
                    <span key={d.id} className="db-record">#{d.id}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="db-controls">
            <button className="btn btn-primary" onClick={handleReplicationWrite} id="db-write">
              ✍️ 寫入 Primary
            </button>
            <button className="btn btn-ghost" onClick={handleReplicationRead} id="db-read">
              📖 讀取 Replica
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{writes}</div>
              <div className="sim-stat-label">寫入次數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{reads}</div>
              <div className="sim-stat-label">讀取次數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: replicaLag > 0 ? 'var(--clr-warning)' : 'var(--clr-success)' }}>
                {replicaLag > 0 ? `${replicaLag}ms` : '0ms'}
              </div>
              <div className="sim-stat-label">複製延遲</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="db-desc">
            <strong>Sharding（分片）</strong>：將資料按照分片鍵（Shard Key）分散到多個獨立的資料庫實例。
            每個 Shard 承擔部分資料和流量。分片策略的選擇直接影響資料分布的均勻性。
          </div>

          {/* Sharding 算法切換 */}
          <div className="db-shard-algos">
            {SHARD_ALGOS.map(a => (
              <button
                key={a.id}
                className={`btn-sm ${shardAlgo === a.id ? 'active' : ''}`}
                onClick={() => { setShardAlgo(a.id); handleReset() }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Shard 分佈視覺化 */}
          <div className="db-shards-vis">
            {shards.map((shard, i) => (
              <div key={i} className="db-shard">
                <div className="db-shard-header">
                  <span>Shard {i}</span>
                  <span className="db-shard-count">{shardStats[i]} 筆</span>
                </div>
                <div className="db-shard-bar">
                  <div
                    className="db-shard-fill"
                    style={{
                      width: `${totalShardWrites > 0 ? (shardStats[i] / totalShardWrites) * 100 : 0}%`,
                      background: shardStats[i] === maxShard && totalShardWrites > 4 ? 'var(--clr-warning)' : 'var(--clr-info)',
                    }}
                  />
                </div>
                <div className="db-shard-items">
                  {shard.slice(-4).map(d => (
                    <span key={d.id} className="db-record">#{d.id}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="db-controls">
            <button className="btn btn-primary" onClick={handleShardWrite} id="shard-write">
              ✍️ 寫入資料
            </button>
            <button className="btn btn-ghost" onClick={handleShardBurst} id="shard-burst">
              批次寫入（×20）
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{totalShardWrites}</div>
              <div className="sim-stat-label">總寫入</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{maxShard}</div>
              <div className="sim-stat-label">最大 Shard</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{minShard}</div>
              <div className="sim-stat-label">最小 Shard</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: skewness > 30 ? 'var(--clr-warning)' : 'var(--clr-success)' }}>
                {skewness}%
              </div>
              <div className="sim-stat-label">偏斜度</div>
            </div>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="db-scaling-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
