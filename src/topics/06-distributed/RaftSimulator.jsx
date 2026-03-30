// Raft 共識算法模擬器 — 分散式一致性
import { useState, useCallback, useRef } from 'react'
import './RaftSimulator.css'

const NODE_COUNT = 5

/**
 * Raft 共識算法模擬器
 * 5 節點叢集：Leader 選舉 + Log Replication 視覺化
 */
export default function RaftSimulator({ onInteract }) {
  const [nodes, setNodes] = useState(() =>
    Array.from({ length: NODE_COUNT }, (_, i) => ({
      id: i,
      state: i === 0 ? 'leader' : 'follower', // leader / follower / candidate / crashed
      term: 1,
      log: ['init'],
      votedFor: 0,
    }))
  )
  const [currentTerm, setCurrentTerm] = useState(1)
  const [logs, setLogs] = useState([])
  const [electionCount, setElectionCount] = useState(0)
  const [logReplicateCount, setLogReplicateCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 30))
  }, [])

  // 取得當前 Leader 節點
  const getLeader = useCallback(() => {
    return nodes.find(n => n.state === 'leader')
  }, [nodes])

  // 模擬寫入（Log Replication）
  const handleWrite = useCallback(() => {
    triggerInteract()
    const leader = getLeader()
    if (!leader) {
      addLog('error', '❌ 目前沒有 Leader，無法寫入。請等待選舉完成。')
      return
    }

    setIsAnimating(true)
    const entry = `cmd_${Date.now().toString(36).slice(-4)}`
    addLog('info', `📝 Client → Leader (Node ${leader.id})：寫入 "${entry}"`)

    // 第一步：Leader 先寫入自己的 Log
    setTimeout(() => {
      setNodes(prev => prev.map(n => {
        if (n.id === leader.id) return { ...n, log: [...n.log, entry] }
        return n
      }))
      addLog('info', `  ├─ Leader (Node ${leader.id}) 已寫入本地 Log`)

      // 第二步：複製到其他存活的 Follower
      setTimeout(() => {
        const alive = nodes.filter(n => n.state !== 'crashed' && n.id !== leader.id)
        let replicated = 1 // Leader 自己算一票

        setNodes(prev => prev.map(n => {
          if (n.state === 'crashed' || n.id === leader.id) return n
          replicated++
          return { ...n, log: [...n.log, entry] }
        }))

        addLog('info', `  ├─ 已複製到 ${alive.length} 個 Follower（共 ${replicated}/${NODE_COUNT} 節點）`)

        // 第三步：過半則 Commit
        const majority = Math.floor(NODE_COUNT / 2) + 1
        if (replicated >= majority) {
          addLog('success', `  └─ ✓ 已過半（${replicated} ≥ ${majority}），Commit 成功！`)
          setLogReplicateCount(prev => prev + 1)
        } else {
          addLog('error', `  └─ ❌ 未達多數（${replicated} < ${majority}），寫入失敗`)
        }
        setIsAnimating(false)
      }, 600)
    }, 400)
  }, [nodes, getLeader, triggerInteract, addLog])

  // 模擬節點當機
  const crashNode = useCallback((nodeId) => {
    triggerInteract()
    setNodes(prev => {
      const node = prev[nodeId]
      if (node.state === 'crashed') return prev
      const isLeader = node.state === 'leader'
      const updated = prev.map(n => n.id === nodeId ? { ...n, state: 'crashed' } : n)
      if (isLeader) {
        addLog('error', `💥 Leader (Node ${nodeId}) 當機！需要重新選舉...`)
      } else {
        addLog('warning', `💥 Node ${nodeId} 當機（${node.state}）`)
      }
      return updated
    })
  }, [triggerInteract, addLog])

  // 恢復節點
  const reviveNode = useCallback((nodeId) => {
    triggerInteract()
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, state: 'follower' } : n))
    addLog('info', `🔄 Node ${nodeId} 已恢復為 Follower`)
  }, [triggerInteract, addLog])

  // 觸發 Leader 選舉
  const triggerElection = useCallback(() => {
    triggerInteract()
    setIsAnimating(true)
    const newTerm = currentTerm + 1
    setCurrentTerm(newTerm)

    // 選出一個存活的候選人
    const alive = nodes.filter(n => n.state !== 'crashed')
    if (alive.length === 0) {
      addLog('error', '❌ 所有節點都已當機，無法進行選舉')
      setIsAnimating(false)
      return
    }

    // 隨機選一個候選人
    const candidate = alive[Math.floor(Math.random() * alive.length)]
    addLog('info', `🗳️ Term ${newTerm}：Node ${candidate.id} 發起選舉`)

    // 設為候選人
    setNodes(prev => prev.map(n => {
      if (n.id === candidate.id) return { ...n, state: 'candidate', term: newTerm }
      return n
    }))

    // 投票過程
    setTimeout(() => {
      const voters = alive.filter(n => n.id !== candidate.id)
      const votes = voters.length + 1 // 候選人投自己一票
      const majority = Math.floor(NODE_COUNT / 2) + 1

      addLog('info', `  ├─ 收到 ${votes} 票（存活 ${alive.length} 節點，多數要求 ${majority}）`)

      if (votes >= majority) {
        // 當選為 Leader
        setNodes(prev => prev.map(n => {
          if (n.state === 'crashed') return n
          if (n.id === candidate.id) return { ...n, state: 'leader', term: newTerm }
          return { ...n, state: 'follower', term: newTerm, votedFor: candidate.id }
        }))
        addLog('success', `  └─ ✓ Node ${candidate.id} 當選為新 Leader（Term ${newTerm}）`)
        setElectionCount(prev => prev + 1)
      } else {
        addLog('error', `  └─ ❌ 票數不足，選舉失敗`)
        setNodes(prev => prev.map(n => {
          if (n.id === candidate.id) return { ...n, state: 'follower' }
          return n
        }))
      }
      setIsAnimating(false)
    }, 800)
  }, [currentTerm, nodes, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setNodes(Array.from({ length: NODE_COUNT }, (_, i) => ({
      id: i,
      state: i === 0 ? 'leader' : 'follower',
      term: 1,
      log: ['init'],
      votedFor: 0,
    })))
    setCurrentTerm(1)
    setLogs([])
    setElectionCount(0)
    setLogReplicateCount(0)
    setIsAnimating(false)
  }, [])

  const leader = getLeader()
  const aliveCount = nodes.filter(n => n.state !== 'crashed').length
  const majority = Math.floor(NODE_COUNT / 2) + 1

  return (
    <div className="simulator-container raft-sim" id="raft-simulator">
      <div className="simulator-title">
        <span className="icon">🏛️</span>
        Raft 共識算法模擬器
      </div>

      <div className="raft-desc">
        Raft 是一種易於理解的分散式共識算法。核心機制：<strong>Leader 選舉</strong>（隨機超時觸發候選人）+
        <strong>Log Replication</strong>（寫入必須過半數確認）+ <strong>Safety</strong>（每個 Term 最多一個 Leader）。
        只要多數（{majority}/{NODE_COUNT}）節點存活，叢集就能正常運作。
      </div>

      {/* 叢集狀態 */}
      <div className="raft-cluster-status">
        <span>Term: <strong>{currentTerm}</strong></span>
        <span>Leader: <strong>{leader ? `Node ${leader.id}` : '❌ 無'}</strong></span>
        <span>存活: <strong className={aliveCount < majority ? 'danger' : ''}>{aliveCount}/{NODE_COUNT}</strong></span>
        <span>多數門檻: <strong>{majority}</strong></span>
      </div>

      {/* 節點視覺化 */}
      <div className="raft-nodes">
        {nodes.map(node => (
          <div
            key={node.id}
            className={`raft-node ${node.state} ${isAnimating && node.state === 'candidate' ? 'electing' : ''}`}
            id={`raft-node-${node.id}`}
          >
            <div className="raft-node-header">
              <span className="raft-node-id">Node {node.id}</span>
              <span className={`raft-node-badge ${node.state}`}>
                {node.state === 'leader' ? '👑' : node.state === 'candidate' ? '🗳️' : node.state === 'crashed' ? '💀' : ''}
                {node.state}
              </span>
            </div>
            <div className="raft-node-term">Term: {node.term}</div>
            <div className="raft-node-log">
              Log: [{node.log.length}]
              <span className="raft-log-preview">{node.log.slice(-3).join(', ')}</span>
            </div>
            <div className="raft-node-actions">
              {node.state !== 'crashed' ? (
                <button className="btn-sm" onClick={() => crashNode(node.id)}>💥 當機</button>
              ) : (
                <button className="btn-sm revive" onClick={() => reviveNode(node.id)}>🔄 恢復</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 控制按鈕 */}
      <div className="raft-controls">
        <button className="btn btn-primary" onClick={handleWrite} disabled={isAnimating} id="raft-write">
          📝 寫入資料
        </button>
        <button className="btn btn-ghost" onClick={triggerElection} disabled={isAnimating} id="raft-election">
          🗳️ 觸發選舉
        </button>
        <button className="btn btn-ghost" onClick={handleReset} id="raft-reset">
          重置
        </button>
      </div>

      {/* 統計 */}
      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{electionCount}</div>
          <div className="sim-stat-label">選舉次數</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{logReplicateCount}</div>
          <div className="sim-stat-label">成功寫入</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{aliveCount}/{NODE_COUNT}</div>
          <div className="sim-stat-label">存活節點</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{currentTerm}</div>
          <div className="sim-stat-label">當前 Term</div>
        </div>
      </div>

      {/* 日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="raft-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
