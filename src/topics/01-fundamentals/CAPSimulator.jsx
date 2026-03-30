// CAP Theorem 互動模擬器 — 三節點叢集 + 網路分割模擬
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './CAPSimulator.css'

const MODES = [
  { id: 'cp', label: 'CP 模式（一致性優先）' },
  { id: 'ap', label: 'AP 模式（可用性優先）' },
]

/**
 * CAP Theorem 模擬器
 * 三節點叢集視覺化：使用者可切斷網路連線、發送讀寫請求，觀察 CP / AP 模式的差異
 */
export default function CAPSimulator({ onInteract }) {
  const [mode, setMode] = useState('cp')
  const [nodes, setNodes] = useState([
    { id: 'A', data: 42, status: 'healthy', role: 'leader' },
    { id: 'B', data: 42, status: 'healthy', role: 'follower' },
    { id: 'C', data: 42, status: 'healthy', role: 'follower' },
  ])
  // 三條網路連線：A-B, A-C, B-C
  const [links, setLinks] = useState([true, true, true])
  const [logs, setLogs] = useState([])
  const [metrics, setMetrics] = useState({
    totalReads: 0,
    totalWrites: 0,
    successReads: 0,
    successWrites: 0,
    inconsistencies: 0,
    rejections: 0,
  })
  const [animatingNode, setAnimatingNode] = useState(null)
  const [animatingLink, setAnimatingLink] = useState(null)
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  // 添加日誌
  const addLog = useCallback((type, message) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }, [])

  // 判斷兩個節點之間是否連通
  const isConnected = useCallback((n1, n2) => {
    const pairs = [['A', 'B'], ['A', 'C'], ['B', 'C']]
    const idx = pairs.findIndex(([a, b]) => (a === n1 && b === n2) || (a === n2 && b === n1))
    return idx >= 0 ? links[idx] : false
  }, [links])

  // 檢查是否存在網路分割（Partition）
  const hasPartition = useCallback(() => {
    return !links[0] || !links[1] || !links[2]
  }, [links])

  // 切斷/恢復網路連線
  const toggleLink = useCallback((linkIndex) => {
    triggerInteract()
    setLinks(prev => {
      const next = [...prev]
      next[linkIndex] = !next[linkIndex]
      return next
    })
    const linkNames = ['A↔B', 'A↔C', 'B↔C']
    setAnimatingLink(linkIndex)
    setTimeout(() => setAnimatingLink(null), 400)

    setLinks(prev => {
      // 只在回呼裡讀，不改
      const willBe = !prev[linkIndex]
      if (willBe) {
        addLog('info', `🔗 網路連線 ${linkNames[linkIndex]} 已恢復`)
      } else {
        addLog('warning', `⚡ 網路連線 ${linkNames[linkIndex]} 已斷開 — 發生 Network Partition`)
      }
      return prev
    })

    // 真正執行切換
    setLinks(prev => {
      const next = [...prev]
      next[linkIndex] = !next[linkIndex]
      return next
    })
  }, [triggerInteract, addLog])

  // 寫入操作
  const handleWrite = useCallback(() => {
    triggerInteract()
    const newValue = Math.floor(Math.random() * 100) + 1
    const partition = hasPartition()

    setMetrics(prev => ({ ...prev, totalWrites: prev.totalWrites + 1 }))

    if (!partition) {
      // 無分割：所有節點同步更新
      setNodes(prev => prev.map(n => ({ ...n, data: newValue })))
      setAnimatingNode('A')
      setTimeout(() => {
        setAnimatingNode('B')
        setTimeout(() => {
          setAnimatingNode('C')
          setTimeout(() => setAnimatingNode(null), 300)
        }, 200)
      }, 200)
      setMetrics(prev => ({ ...prev, successWrites: prev.successWrites + 1 }))
      addLog('success', `✍️ 寫入 ${newValue} — 所有節點已同步完成`)
    } else if (mode === 'cp') {
      // CP 模式 + 有分割：拒絕寫入以保一致性
      setMetrics(prev => ({ ...prev, rejections: prev.rejections + 1 }))
      addLog('error', `✍️ 寫入 ${newValue} — ❌ 拒絕！CP 模式下，無法確保所有節點一致，拒絕寫入`)
      setAnimatingNode('reject')
      setTimeout(() => setAnimatingNode(null), 500)
    } else {
      // AP 模式 + 有分割：允許寫入但產生不一致
      // 只更新可達的節點
      setNodes(prev => {
        const leaderNode = prev.find(n => n.role === 'leader')
        const leaderId = leaderNode?.id || 'A'
        return prev.map(n => {
          if (n.id === leaderId) return { ...n, data: newValue }
          if (isConnected(leaderId, n.id)) return { ...n, data: newValue }
          return n // 不可達的節點保持舊值
        })
      })
      setMetrics(prev => ({
        ...prev,
        successWrites: prev.successWrites + 1,
        inconsistencies: prev.inconsistencies + 1,
      }))
      addLog('warning', `✍️ 寫入 ${newValue} — ⚠️ AP 模式允許寫入，但部分節點未同步（資料不一致）`)
      setAnimatingNode('A')
      setTimeout(() => setAnimatingNode(null), 400)
    }
  }, [mode, hasPartition, isConnected, triggerInteract, addLog])

  // 讀取操作
  const handleRead = useCallback(() => {
    triggerInteract()
    const partition = hasPartition()
    // 隨機從一個節點讀取
    const targetIdx = Math.floor(Math.random() * 3)
    const targetNode = nodes[targetIdx]

    setMetrics(prev => ({ ...prev, totalReads: prev.totalReads + 1 }))

    if (!partition) {
      setMetrics(prev => ({ ...prev, successReads: prev.successReads + 1 }))
      addLog('success', `📖 從 Node ${targetNode.id} 讀取 → ${targetNode.data}（所有節點一致）`)
      setAnimatingNode(targetNode.id)
      setTimeout(() => setAnimatingNode(null), 400)
    } else if (mode === 'cp') {
      // CP 模式：不確定一致性時拒絕讀取
      const leaderConnected = targetNode.role === 'leader' || isConnected(targetNode.id, 'A')
      if (leaderConnected) {
        setMetrics(prev => ({ ...prev, successReads: prev.successReads + 1 }))
        addLog('success', `📖 從 Node ${targetNode.id} 讀取 → ${targetNode.data}（可連到 Leader，資料可信）`)
      } else {
        setMetrics(prev => ({ ...prev, rejections: prev.rejections + 1 }))
        addLog('error', `📖 從 Node ${targetNode.id} 讀取 → ❌ 拒絕！CP 模式下，該節點無法連到 Leader，無法保證一致性`)
      }
      setAnimatingNode(targetNode.id)
      setTimeout(() => setAnimatingNode(null), 400)
    } else {
      // AP 模式：總是回應，但可能回傳過期資料
      const leaderNode = nodes.find(n => n.role === 'leader')
      const isStale = targetNode.data !== leaderNode.data
      setMetrics(prev => ({ ...prev, successReads: prev.successReads + 1 }))
      if (isStale) {
        addLog('warning', `📖 從 Node ${targetNode.id} 讀取 → ${targetNode.data}（⚠️ 資料過期！Leader 值為 ${leaderNode.data}）`)
      } else {
        addLog('success', `📖 從 Node ${targetNode.id} 讀取 → ${targetNode.data}（資料正確）`)
      }
      setAnimatingNode(targetNode.id)
      setTimeout(() => setAnimatingNode(null), 400)
    }
  }, [mode, nodes, hasPartition, isConnected, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setNodes([
      { id: 'A', data: 42, status: 'healthy', role: 'leader' },
      { id: 'B', data: 42, status: 'healthy', role: 'follower' },
      { id: 'C', data: 42, status: 'healthy', role: 'follower' },
    ])
    setLinks([true, true, true])
    setLogs([])
    setMetrics({ totalReads: 0, totalWrites: 0, successReads: 0, successWrites: 0, inconsistencies: 0, rejections: 0 })
    setAnimatingNode(null)
  }, [])

  // 節點資料是否一致
  const isConsistent = nodes.every(n => n.data === nodes[0].data)

  return (
    <div className="simulator-container cap-simulator" id="cap-simulator">
      <div className="simulator-title">
        <span className="icon">🔺</span>
        CAP Theorem Simulator
      </div>

      {/* 模式切換 */}
      <TabGroup tabs={MODES} defaultTab="cp" onChange={setMode} />

      {/* 模式說明 */}
      <div className="cap-mode-desc">
        {mode === 'cp'
          ? '🔒 CP 模式（Consistency + Partition Tolerance）：發生 Network Partition 時，拒絕不確定的讀寫操作以保證資料一致性。犧牲可用性。例：ZooKeeper、etcd、HBase'
          : '🌐 AP 模式（Availability + Partition Tolerance）：發生 Network Partition 時，仍然回應請求以保證可用性，但可能回傳過期資料。犧牲一致性。例：Cassandra、DynamoDB、CouchDB'
        }
      </div>

      {/* 節點和連線視覺化 */}
      <div className="cap-cluster">
        <svg className="cap-links-svg" viewBox="0 0 400 280">
          {/* A-B 連線 */}
          <line
            x1="200" y1="50" x2="80" y2="230"
            className={`cap-link ${!links[0] ? 'broken' : ''} ${animatingLink === 0 ? 'animating' : ''}`}
            onClick={() => toggleLink(0)}
          />
          {!links[0] && <text x="120" y="130" className="cap-link-break-label">✕</text>}

          {/* A-C 連線 */}
          <line
            x1="200" y1="50" x2="320" y2="230"
            className={`cap-link ${!links[1] ? 'broken' : ''} ${animatingLink === 1 ? 'animating' : ''}`}
            onClick={() => toggleLink(1)}
          />
          {!links[1] && <text x="270" y="130" className="cap-link-break-label">✕</text>}

          {/* B-C 連線 */}
          <line
            x1="80" y1="230" x2="320" y2="230"
            className={`cap-link ${!links[2] ? 'broken' : ''} ${animatingLink === 2 ? 'animating' : ''}`}
            onClick={() => toggleLink(2)}
          />
          {!links[2] && <text x="200" y="255" className="cap-link-break-label">✕</text>}
        </svg>

        {/* 節點 */}
        <div className="cap-nodes">
          {nodes.map(node => (
            <div
              key={node.id}
              className={`cap-node ${animatingNode === node.id ? 'pulse' : ''} ${animatingNode === 'reject' ? 'reject-flash' : ''}`}
              data-role={node.role}
              id={`cap-node-${node.id}`}
            >
              <div className="cap-node-role">{node.role === 'leader' ? '👑 Leader' : 'Follower'}</div>
              <div className="cap-node-id">Node {node.id}</div>
              <div className="cap-node-data">data: {node.data}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作提示 */}
      <div className="sim-hint">
        💡 點擊節點之間的連線可以 <strong>切斷/恢復網路</strong>（模擬 Network Partition），然後嘗試寫入或讀取來觀察 CP / AP 模式的差異
      </div>

      {/* 狀態指示器 */}
      <div className="cap-indicators">
        <div className={`cap-indicator ${isConsistent ? 'good' : 'bad'}`}>
          <span className="cap-indicator-icon">{isConsistent ? '✓' : '✕'}</span>
          <span>一致性 (Consistency)</span>
        </div>
        <div className={`cap-indicator ${metrics.rejections === 0 ? 'good' : 'bad'}`}>
          <span className="cap-indicator-icon">{metrics.rejections === 0 ? '✓' : '✕'}</span>
          <span>可用性 (Availability)</span>
        </div>
        <div className={`cap-indicator ${hasPartition() ? 'bad' : 'good'}`}>
          <span className="cap-indicator-icon">{hasPartition() ? '⚡' : '✓'}</span>
          <span>分區容錯 (Partition Tolerance)</span>
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="cap-controls">
        <button className="btn btn-primary" onClick={handleWrite} id="cap-write">
          ✍️ 寫入隨機值
        </button>
        <button className="btn btn-ghost" onClick={handleRead} id="cap-read">
          📖 讀取資料
        </button>
        <button className="btn btn-ghost" onClick={handleReset} id="cap-reset">
          重置
        </button>
      </div>

      {/* 統計面板 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{metrics.successWrites}/{metrics.totalWrites}</div>
          <div className="sim-stat-label">寫入成功</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{metrics.successReads}/{metrics.totalReads}</div>
          <div className="sim-stat-label">讀取成功</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: metrics.inconsistencies > 0 ? 'var(--clr-warning)' : undefined }}>
            {metrics.inconsistencies}
          </div>
          <div className="sim-stat-label">不一致次數</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: metrics.rejections > 0 ? 'var(--clr-error)' : undefined }}>
            {metrics.rejections}
          </div>
          <div className="sim-stat-label">拒絕次數</div>
        </div>
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="cap-log">
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
