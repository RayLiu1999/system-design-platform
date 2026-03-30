// 微服務架構模擬器 — Service Mesh / Circuit Breaker / Service Discovery
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './MicroservicesSimulator.css'

const TABS = [
  { id: 'circuit-breaker', label: 'Circuit Breaker' },
  { id: 'service-discovery', label: 'Service Discovery' },
]

// Circuit Breaker 狀態機
const CB_STATES = {
  CLOSED: { label: 'CLOSED', color: 'var(--clr-success)', desc: '正常狀態，請求直接通過。' },
  OPEN: { label: 'OPEN', color: 'var(--clr-error)', desc: '熔斷中！所有請求被拒絕，避免雪崩效應。' },
  HALF_OPEN: { label: 'HALF-OPEN', color: 'var(--clr-warning)', desc: '嘗試恢復中，放行少量請求探測。' },
}

/**
 * 微服務架構模擬器
 * Circuit Breaker 熔斷器模式 + Service Discovery 服務發現
 */
export default function MicroservicesSimulator({ onInteract }) {
  const [tab, setTab] = useState('circuit-breaker')

  // Circuit Breaker 狀態
  const [cbState, setCbState] = useState('CLOSED')
  const [failCount, setFailCount] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [threshold] = useState(5)
  const [halfOpenRetries, setHalfOpenRetries] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const [serviceHealth, setServiceHealth] = useState(100) // 下游服務健康度 0-100

  // Service Discovery 狀態
  const [registry, setRegistry] = useState([
    { id: 'user-svc-1', service: 'user-service', host: '10.0.1.10:8080', status: 'healthy', weight: 1 },
    { id: 'user-svc-2', service: 'user-service', host: '10.0.1.11:8080', status: 'healthy', weight: 1 },
    { id: 'order-svc-1', service: 'order-service', host: '10.0.2.10:8080', status: 'healthy', weight: 1 },
    { id: 'order-svc-2', service: 'order-service', host: '10.0.2.11:8080', status: 'healthy', weight: 1 },
    { id: 'payment-svc-1', service: 'payment-service', host: '10.0.3.10:8080', status: 'healthy', weight: 1 },
  ])

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

  // ===== Circuit Breaker =====
  const sendRequest = useCallback(() => {
    triggerInteract()
    setTotalRequests(t => t + 1)

    if (cbState === 'OPEN') {
      addLog('error', `🚫 Circuit OPEN → 請求被拒絕（Fast Fail）`)
      return
    }

    // 根據服務健康度決定成功或失敗
    const isSuccess = Math.random() * 100 < serviceHealth

    if (cbState === 'CLOSED') {
      if (isSuccess) {
        setSuccessCount(s => s + 1)
        setFailCount(0)
        addLog('success', `✓ 請求成功（下游健康度 ${serviceHealth}%）`)
      } else {
        setFailCount(prev => {
          const newCount = prev + 1
          if (newCount >= threshold) {
            setCbState('OPEN')
            addLog('error', `❌ 請求失敗（連續 ${newCount} 次）→ Circuit 熔斷！`)
            // 5 秒後進入 HALF-OPEN
            setTimeout(() => {
              setCbState('HALF_OPEN')
              setHalfOpenRetries(0)
              addLog('warning', `⏰ 冷卻時間到 → 進入 HALF-OPEN 狀態`)
            }, 3000)
          } else {
            addLog('warning', `⚠️ 請求失敗（${newCount}/${threshold}）`)
          }
          return newCount
        })
      }
    } else if (cbState === 'HALF_OPEN') {
      if (isSuccess) {
        setHalfOpenRetries(r => r + 1)
        if (halfOpenRetries + 1 >= 3) {
          setCbState('CLOSED')
          setFailCount(0)
          setSuccessCount(s => s + 1)
          addLog('success', `✓ HALF-OPEN 探測成功 3 次 → Circuit 恢復為 CLOSED`)
        } else {
          addLog('info', `🔍 HALF-OPEN 探測成功（${halfOpenRetries + 1}/3）`)
        }
      } else {
        setCbState('OPEN')
        addLog('error', `❌ HALF-OPEN 探測失敗 → 重新熔斷`)
        setTimeout(() => {
          setCbState('HALF_OPEN')
          setHalfOpenRetries(0)
          addLog('warning', `⏰ 重新進入 HALF-OPEN`)
        }, 3000)
      }
    }
  }, [cbState, serviceHealth, threshold, halfOpenRetries, triggerInteract, addLog])

  // ===== Service Discovery =====
  const registerService = useCallback(() => {
    triggerInteract()
    const services = ['user-service', 'order-service', 'payment-service']
    const svc = services[Math.floor(Math.random() * services.length)]
    const id = `${svc.split('-')[0]}-svc-${Math.floor(Math.random() * 100)}`
    const host = `10.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}:8080`

    setRegistry(prev => [...prev, { id, service: svc, host, status: 'healthy', weight: 1 }])
    addLog('success', `📥 註冊: ${id} (${svc}) @ ${host}`)
  }, [triggerInteract, addLog])

  const deregisterService = useCallback((instanceId) => {
    triggerInteract()
    setRegistry(prev => prev.filter(s => s.id !== instanceId))
    addLog('warning', `📤 註銷: ${instanceId}`)
  }, [triggerInteract, addLog])

  const toggleHealth = useCallback((instanceId) => {
    triggerInteract()
    setRegistry(prev => prev.map(s =>
      s.id === instanceId
        ? { ...s, status: s.status === 'healthy' ? 'unhealthy' : 'healthy' }
        : s
    ))
  }, [triggerInteract])

  const discoverService = useCallback((serviceName) => {
    triggerInteract()
    const instances = registry.filter(s => s.service === serviceName && s.status === 'healthy')
    if (instances.length > 0) {
      const selected = instances[Math.floor(Math.random() * instances.length)]
      addLog('info', `🔍 Discover "${serviceName}" → ${selected.host} (${instances.length} instances)`)
    } else {
      addLog('error', `🔍 Discover "${serviceName}" → 無可用實例！`)
    }
  }, [registry, triggerInteract, addLog])

  const handleReset = useCallback(() => {
    setCbState('CLOSED')
    setFailCount(0)
    setSuccessCount(0)
    setHalfOpenRetries(0)
    setTotalRequests(0)
    setServiceHealth(100)
    setRegistry([
      { id: 'user-svc-1', service: 'user-service', host: '10.0.1.10:8080', status: 'healthy', weight: 1 },
      { id: 'user-svc-2', service: 'user-service', host: '10.0.1.11:8080', status: 'healthy', weight: 1 },
      { id: 'order-svc-1', service: 'order-service', host: '10.0.2.10:8080', status: 'healthy', weight: 1 },
      { id: 'order-svc-2', service: 'order-service', host: '10.0.2.11:8080', status: 'healthy', weight: 1 },
      { id: 'payment-svc-1', service: 'payment-service', host: '10.0.3.10:8080', status: 'healthy', weight: 1 },
    ])
    setLogs([])
  }, [])

  const cbInfo = CB_STATES[cbState]

  return (
    <div className="simulator-container ms-sim" id="microservices-simulator">
      <div className="simulator-title">
        <span className="icon">🔗</span>
        微服務架構模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="circuit-breaker" onChange={(t) => { setTab(t); handleReset() }} />

      {tab === 'circuit-breaker' ? (
        <>
          <div className="ms-desc">
            <strong>Circuit Breaker（熔斷器）</strong>：防止下游服務故障擴散。
            CLOSED → 失敗累計達閾值 → OPEN（拒絕所有請求）→ 冷卻後 → HALF-OPEN（探測）→ 成功恢復 CLOSED。
          </div>

          {/* 狀態機視覺化 */}
          <div className="cb-state-machine">
            {Object.entries(CB_STATES).map(([key, val]) => (
              <div key={key} className={`cb-state ${cbState === key ? 'active' : ''}`} style={{ '--state-color': val.color }}>
                <div className="cb-state-label">{val.label}</div>
                <div className="cb-state-desc">{val.desc}</div>
              </div>
            ))}
          </div>

          {/* 當前狀態顯示 */}
          <div className="cb-current" style={{ borderColor: cbInfo.color }}>
            <span className="cb-current-dot" style={{ background: cbInfo.color }}></span>
            <span className="cb-current-text">目前狀態：<strong style={{ color: cbInfo.color }}>{cbInfo.label}</strong></span>
            {cbState === 'CLOSED' && <span>（失敗次數 {failCount}/{threshold}）</span>}
            {cbState === 'HALF_OPEN' && <span>（探測成功 {halfOpenRetries}/3）</span>}
          </div>

          {/* 服務健康度滑桿 */}
          <div className="cb-health-slider">
            <label>下游服務健康度</label>
            <input
              type="range"
              min="0"
              max="100"
              value={serviceHealth}
              onChange={(e) => setServiceHealth(Number(e.target.value))}
            />
            <span className={`cb-health-val ${serviceHealth < 30 ? 'danger' : serviceHealth < 70 ? 'warning' : 'safe'}`}>
              {serviceHealth}%
            </span>
          </div>

          <div className="ha-controls">
            <button className="btn btn-primary" onClick={sendRequest}>📡 發送請求</button>
            <button className="btn btn-ghost" onClick={() => { for (let i = 0; i < 5; i++) setTimeout(sendRequest, i * 200) }}>
              ⚡ 快速發 5 筆
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{totalRequests}</div>
              <div className="sim-stat-label">總請求</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{successCount}</div>
              <div className="sim-stat-label">成功</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{failCount}</div>
              <div className="sim-stat-label">連續失敗</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ms-desc">
            <strong>Service Discovery（服務發現）</strong>：微服務動態註冊到 Registry（如 Consul、Eureka），
            呼叫方透過 Registry 查詢可用實例清單，搭配客戶端負載均衡選擇目標。
          </div>

          {/* Registry 實例列表 */}
          <div className="sd-registry">
            <div className="sd-registry-title">📋 服務註冊表</div>
            <div className="sd-instances">
              {registry.map(inst => (
                <div key={inst.id} className={`sd-instance ${inst.status}`}>
                  <div className="sd-inst-name">{inst.id}</div>
                  <div className="sd-inst-svc">{inst.service}</div>
                  <div className="sd-inst-host">{inst.host}</div>
                  <div className="sd-inst-actions">
                    <span className={`sd-dot ${inst.status}`}></span>
                    <button className="btn-xs" onClick={() => toggleHealth(inst.id)}>
                      {inst.status === 'healthy' ? '💔' : '💚'}
                    </button>
                    <button className="btn-xs danger" onClick={() => deregisterService(inst.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ha-controls">
            <button className="btn btn-primary" onClick={registerService}>📥 註冊新實例</button>
            <button className="btn btn-ghost" onClick={() => discoverService('user-service')}>🔍 Discover user-service</button>
            <button className="btn btn-ghost" onClick={() => discoverService('order-service')}>🔍 Discover order-service</button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          {/* 統計 */}
          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{registry.length}</div>
              <div className="sim-stat-label">總實例</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{registry.filter(s => s.status === 'healthy').length}</div>
              <div className="sim-stat-label">健康實例</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{new Set(registry.map(s => s.service)).size}</div>
              <div className="sim-stat-label">服務數</div>
            </div>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="microservices-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
