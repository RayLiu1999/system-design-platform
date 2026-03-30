// 高可用設計模擬器 — Failover / Health Check / Redundancy
import { useState, useCallback, useRef, useEffect } from 'react'
import TabGroup from '../../components/TabGroup'
import './HighAvailabilitySimulator.css'

const TABS = [
  { id: 'failover', label: 'Failover（容錯移轉）' },
  { id: 'health-check', label: 'Health Check' },
]

/**
 * 高可用設計模擬器
 * 模擬多節點 Active-Standby / Active-Active 容錯切換
 * 以及 Health Check 機制（Liveness + Readiness Probe）
 */
export default function HighAvailabilitySimulator({ onInteract }) {
  const [tab, setTab] = useState('failover')

  // Failover 狀態
  const [mode, setMode] = useState('active-standby') // active-standby | active-active
  const [nodes, setNodes] = useState([
    { id: 0, name: 'Node-A', role: 'Primary', status: 'healthy', requests: 0 },
    { id: 1, name: 'Node-B', role: 'Standby', status: 'healthy', requests: 0 },
    { id: 2, name: 'Node-C', role: 'Standby', status: 'healthy', requests: 0 },
  ])
  const [failoverCount, setFailoverCount] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)

  // Health Check 狀態
  const [services, setServices] = useState([
    { id: 0, name: 'api-gateway', liveness: true, readiness: true, uptime: 99.99, lastCheck: '2s ago' },
    { id: 1, name: 'order-service', liveness: true, readiness: true, uptime: 99.95, lastCheck: '3s ago' },
    { id: 2, name: 'payment-service', liveness: true, readiness: true, uptime: 99.90, lastCheck: '1s ago' },
    { id: 3, name: 'inventory-service', liveness: true, readiness: false, uptime: 98.50, lastCheck: '5s ago' },
  ])
  const [healthInterval, setHealthInterval] = useState(null)

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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 20))
  }, [])

  // 清理定時器
  useEffect(() => {
    return () => {
      if (healthInterval) clearInterval(healthInterval)
    }
  }, [healthInterval])

  // ===== Failover =====
  // 模擬發送流量
  const sendTraffic = useCallback(() => {
    triggerInteract()
    setTotalRequests(r => r + 10)

    if (mode === 'active-standby') {
      // 只有 Primary 接收流量
      setNodes(prev => prev.map(n =>
        n.role === 'Primary' && n.status === 'healthy'
          ? { ...n, requests: n.requests + 10 }
          : n
      ))
      const primary = nodes.find(n => n.role === 'Primary')
      addLog('info', `📨 10 requests → ${primary?.name} (Primary)`)
    } else {
      // Active-Active：均分流量
      setNodes(prev => {
        const active = prev.filter(n => n.status === 'healthy')
        const perNode = Math.floor(10 / active.length)
        return prev.map(n =>
          n.status === 'healthy' ? { ...n, requests: n.requests + perNode } : n
        )
      })
      const active = nodes.filter(n => n.status === 'healthy')
      addLog('info', `📨 10 requests 均分 → ${active.map(n => n.name).join(', ')}`)
    }
  }, [mode, nodes, triggerInteract, addLog])

  // 模擬節點故障
  const killNode = useCallback((nodeId) => {
    triggerInteract()
    setNodes(prev => {
      const updated = prev.map(n => n.id === nodeId ? { ...n, status: 'down' } : n)
      const killedNode = updated.find(n => n.id === nodeId)

      if (mode === 'active-standby' && killedNode.role === 'Primary') {
        // 需要 Failover：提升 Standby 為 Primary
        const standby = updated.find(n => n.status === 'healthy' && n.role === 'Standby')
        if (standby) {
          addLog('error', `🔴 ${killedNode.name} (Primary) 宕機！`)
          addLog('warning', `⚡ 自動 Failover → ${standby.name} 升級為 Primary`)
          setFailoverCount(c => c + 1)
          return updated.map(n =>
            n.id === standby.id ? { ...n, role: 'Primary' } : n
          )
        } else {
          addLog('error', `🔴 ${killedNode.name} (Primary) 宕機！無可用 Standby！`)
          return updated
        }
      } else {
        addLog('warning', `⚠️ ${killedNode.name} (${killedNode.role}) 宕機`)
        return updated
      }
    })
  }, [mode, triggerInteract, addLog])

  // 恢復節點
  const recoverNode = useCallback((nodeId) => {
    triggerInteract()
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, status: 'healthy', role: mode === 'active-standby' ? 'Standby' : 'Active' } : n
    ))
    const node = nodes.find(n => n.id === nodeId)
    addLog('success', `✓ ${node?.name} 已恢復（加入為 ${mode === 'active-standby' ? 'Standby' : 'Active'}）`)
  }, [mode, nodes, triggerInteract, addLog])

  // 切換模式
  const switchMode = useCallback((newMode) => {
    setMode(newMode)
    if (newMode === 'active-standby') {
      setNodes([
        { id: 0, name: 'Node-A', role: 'Primary', status: 'healthy', requests: 0 },
        { id: 1, name: 'Node-B', role: 'Standby', status: 'healthy', requests: 0 },
        { id: 2, name: 'Node-C', role: 'Standby', status: 'healthy', requests: 0 },
      ])
    } else {
      setNodes([
        { id: 0, name: 'Node-A', role: 'Active', status: 'healthy', requests: 0 },
        { id: 1, name: 'Node-B', role: 'Active', status: 'healthy', requests: 0 },
        { id: 2, name: 'Node-C', role: 'Active', status: 'healthy', requests: 0 },
      ])
    }
    setFailoverCount(0)
    setTotalRequests(0)
    setLogs([])
  }, [])

  // ===== Health Check =====
  const startHealthCheck = useCallback(() => {
    triggerInteract()
    if (healthInterval) {
      clearInterval(healthInterval)
      setHealthInterval(null)
      addLog('info', '⏹️ Health Check 已停止')
      return
    }

    addLog('info', '▶️ 開始 Health Check (每 2 秒)')
    const interval = setInterval(() => {
      setServices(prev => prev.map(svc => {
        // 隨機模擬健康狀態波動
        const livenessOk = Math.random() > 0.05
        const readinessOk = Math.random() > 0.15
        const newUptime = livenessOk ? Math.min(svc.uptime + 0.01, 100) : Math.max(svc.uptime - 0.5, 0)
        return {
          ...svc,
          liveness: livenessOk,
          readiness: readinessOk,
          uptime: parseFloat(newUptime.toFixed(2)),
          lastCheck: 'just now',
        }
      }))
    }, 2000)
    setHealthInterval(interval)
  }, [healthInterval, triggerInteract, addLog])

  // 模擬 Service 重啟
  const restartService = useCallback((svcId) => {
    triggerInteract()
    setServices(prev => prev.map(s =>
      s.id === svcId ? { ...s, liveness: true, readiness: true, lastCheck: 'restarted' } : s
    ))
    const svc = services.find(s => s.id === svcId)
    addLog('success', `🔄 ${svc?.name} 已重啟`)
  }, [services, triggerInteract, addLog])

  const handleReset = useCallback(() => {
    switchMode('active-standby')
    setServices([
      { id: 0, name: 'api-gateway', liveness: true, readiness: true, uptime: 99.99, lastCheck: '2s ago' },
      { id: 1, name: 'order-service', liveness: true, readiness: true, uptime: 99.95, lastCheck: '3s ago' },
      { id: 2, name: 'payment-service', liveness: true, readiness: true, uptime: 99.90, lastCheck: '1s ago' },
      { id: 3, name: 'inventory-service', liveness: true, readiness: false, uptime: 98.50, lastCheck: '5s ago' },
    ])
    if (healthInterval) {
      clearInterval(healthInterval)
      setHealthInterval(null)
    }
    setLogs([])
  }, [switchMode, healthInterval])

  // SLA 計算
  const calculateDowntime = (uptime) => {
    const downtimeMinutes = ((100 - uptime) / 100) * 525600
    if (downtimeMinutes < 60) return `${downtimeMinutes.toFixed(1)} min/yr`
    return `${(downtimeMinutes / 60).toFixed(1)} hr/yr`
  }

  return (
    <div className="simulator-container ha-sim" id="high-availability-simulator">
      <div className="simulator-title">
        <span className="icon">🛡️</span>
        高可用設計模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="failover" onChange={(t) => { setTab(t); handleReset() }} />

      {tab === 'failover' ? (
        <>
          <div className="ha-desc">
            <strong>Failover（容錯移轉）</strong>：當 Primary 節點故障時，自動將流量切換到 Standby 節點。
            Active-Standby：一主多備；Active-Active：所有節點同時處理流量。
          </div>

          {/* 模式切換 */}
          <div className="ha-mode-switch">
            <button className={`ha-mode-btn ${mode === 'active-standby' ? 'active' : ''}`} onClick={() => switchMode('active-standby')}>
              🔄 Active-Standby
            </button>
            <button className={`ha-mode-btn ${mode === 'active-active' ? 'active' : ''}`} onClick={() => switchMode('active-active')}>
              ⚡ Active-Active
            </button>
          </div>

          {/* 節點狀態 */}
          <div className="ha-nodes">
            {nodes.map(node => (
              <div key={node.id} className={`ha-node ${node.status} ${node.role.toLowerCase()}`}>
                <div className="ha-node-header">
                  <span className="ha-node-status-dot"></span>
                  <span className="ha-node-name">{node.name}</span>
                </div>
                <div className="ha-node-role">{node.role}</div>
                <div className="ha-node-requests">{node.requests} reqs</div>
                <div className="ha-node-actions">
                  {node.status === 'healthy' ? (
                    <button className="btn-xs danger" onClick={() => killNode(node.id)}>💥 宕機</button>
                  ) : (
                    <button className="btn-xs success" onClick={() => recoverNode(node.id)}>🔧 恢復</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="ha-controls">
            <button className="btn btn-primary" onClick={sendTraffic}>📨 發送 10 筆流量</button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{totalRequests}</div>
              <div className="sim-stat-label">總請求</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-warning)' }}>{failoverCount}</div>
              <div className="sim-stat-label">Failover 次數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{nodes.filter(n => n.status === 'healthy').length}/{nodes.length}</div>
              <div className="sim-stat-label">可用節點</div>
            </div>
          </div>

          {/* SLA 表 */}
          <div className="ha-sla-table">
            <div className="ha-sla-title">📋 SLA 可用性等級參考</div>
            <div className="ha-sla-grid">
              {[
                { level: '99%', downtime: '3.65 天/年' },
                { level: '99.9%', downtime: '8.76 小時/年' },
                { level: '99.99%', downtime: '52.6 分鐘/年' },
                { level: '99.999%', downtime: '5.26 分鐘/年' },
              ].map(s => (
                <div key={s.level} className="ha-sla-item">
                  <span className="ha-sla-level">{s.level}</span>
                  <span className="ha-sla-dt">{s.downtime}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ha-desc">
            <strong>Health Check</strong>：在 Kubernetes 等環境中，透過 Liveness Probe 和 Readiness Probe 監控服務健康。
            Liveness 失敗 → 容器重啟；Readiness 失敗 → 從 Service 摘除（不接收流量）。
          </div>

          <div className="ha-services">
            {services.map(svc => (
              <div key={svc.id} className={`ha-service ${!svc.liveness ? 'dead' : !svc.readiness ? 'not-ready' : 'ready'}`}>
                <div className="ha-svc-header">
                  <span className="ha-svc-name">{svc.name}</span>
                  <span className="ha-svc-check">{svc.lastCheck}</span>
                </div>
                <div className="ha-svc-probes">
                  <span className={`ha-probe ${svc.liveness ? 'pass' : 'fail'}`}>
                    ❤️ Liveness: {svc.liveness ? 'PASS' : 'FAIL'}
                  </span>
                  <span className={`ha-probe ${svc.readiness ? 'pass' : 'fail'}`}>
                    🚦 Readiness: {svc.readiness ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="ha-svc-uptime">
                  Uptime: <strong>{svc.uptime}%</strong>
                  <span className="ha-svc-downtime">({calculateDowntime(svc.uptime)})</span>
                </div>
                <button className="btn-xs" onClick={() => restartService(svc.id)}>🔄 Restart</button>
              </div>
            ))}
          </div>

          <div className="ha-controls">
            <button className="btn btn-primary" onClick={startHealthCheck}>
              {healthInterval ? '⏹️ 停止 Health Check' : '▶️ 啟動 Health Check'}
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="ha-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
