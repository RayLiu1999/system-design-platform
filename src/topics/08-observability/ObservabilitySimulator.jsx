// 可觀測性三支柱模擬器 — Metrics / Logs / Traces
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './ObservabilitySimulator.css'

const PILLARS = [
  { id: 'metrics', label: 'Metrics（指標）' },
  { id: 'logs', label: 'Logs（日誌）' },
  { id: 'traces', label: 'Traces（鏈路追蹤）' },
]

/**
 * 可觀測性三支柱模擬器
 * 模擬服務監控：即時指標儀表板、結構化日誌、分散式鏈路追蹤
 */
export default function ObservabilitySimulator({ onInteract }) {
  const [pillar, setPillar] = useState('metrics')

  // Metrics 狀態
  const [metricsHistory, setMetricsHistory] = useState([])
  const [currentMetrics, setCurrentMetrics] = useState({
    requestRate: 120,
    errorRate: 2.3,
    p50: 45,
    p95: 180,
    p99: 420,
    cpuUsage: 35,
    memoryUsage: 62,
  })

  // Logs 狀態
  const [logEntries, setLogEntries] = useState([])

  // Traces 狀態
  const [traces, setTraces] = useState([])

  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  // 模擬請求（產生 Metrics 數據）
  const simulateTraffic = useCallback(() => {
    triggerInteract()
    const reqRate = Math.floor(80 + Math.random() * 200)
    const errRate = Math.random() < 0.2 ? +(5 + Math.random() * 15).toFixed(1) : +(Math.random() * 3).toFixed(1)
    const p50 = Math.floor(20 + Math.random() * 60)
    const p95 = Math.floor(p50 * 2 + Math.random() * 200)
    const p99 = Math.floor(p95 * 1.5 + Math.random() * 300)
    const cpu = Math.floor(20 + Math.random() * 60)
    const mem = Math.floor(40 + Math.random() * 40)

    const newMetrics = { requestRate: reqRate, errorRate: errRate, p50, p95, p99, cpuUsage: cpu, memoryUsage: mem }
    setCurrentMetrics(newMetrics)
    setMetricsHistory(prev => [...prev, { ...newMetrics, ts: new Date().toLocaleTimeString() }].slice(-12))
  }, [triggerInteract])

  // 產生結構化日誌
  const generateLog = useCallback(() => {
    triggerInteract()
    logIdRef.current++
    const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR']
    const services = ['api-gateway', 'user-service', 'order-service', 'payment-service']
    const level = levels[Math.floor(Math.random() * levels.length)]
    const service = services[Math.floor(Math.random() * services.length)]

    const messages = {
      INFO: [`Request processed in ${Math.floor(20 + Math.random() * 100)}ms`, `User authenticated successfully`, `Cache hit for key user:${Math.floor(Math.random() * 1000)}`],
      WARN: [`Slow query detected: ${Math.floor(200 + Math.random() * 800)}ms`, `Connection pool near capacity: ${Math.floor(70 + Math.random() * 25)}%`, `Retry attempt 2/3 for external service`],
      ERROR: [`Failed to connect to database: timeout after 5000ms`, `Payment gateway returned 502`, `Unhandled exception in handler: NullPointerException`],
    }

    const msgList = messages[level] || messages.INFO
    const msg = msgList[Math.floor(Math.random() * msgList.length)]
    const traceId = Math.random().toString(36).slice(2, 10)

    setLogEntries(prev => [{
      id: logIdRef.current,
      timestamp: new Date().toISOString(),
      level,
      service,
      message: msg,
      traceId,
    }, ...prev].slice(0, 15))
  }, [triggerInteract])

  // 產生分散式鏈路追蹤
  const generateTrace = useCallback(() => {
    triggerInteract()
    const traceId = Math.random().toString(36).slice(2, 10)
    const totalDuration = Math.floor(100 + Math.random() * 400)

    // 模擬一條鏈路：API Gateway → User Service → Order Service → DB
    const spans = [
      { service: 'api-gateway', operation: 'POST /api/orders', start: 0, duration: totalDuration, status: 'ok' },
      { service: 'auth-middleware', operation: 'JWT Verify', start: 5, duration: Math.floor(10 + Math.random() * 20), status: 'ok' },
      { service: 'order-service', operation: 'CreateOrder', start: 30, duration: Math.floor(totalDuration * 0.6), status: 'ok' },
      { service: 'user-service', operation: 'GetUser', start: 35, duration: Math.floor(20 + Math.random() * 40), status: 'ok' },
      { service: 'order-db', operation: 'INSERT orders', start: Math.floor(totalDuration * 0.3), duration: Math.floor(20 + Math.random() * 60), status: Math.random() < 0.1 ? 'error' : 'ok' },
      { service: 'payment-service', operation: 'ChargeCard', start: Math.floor(totalDuration * 0.5), duration: Math.floor(40 + Math.random() * 100), status: Math.random() < 0.15 ? 'error' : 'ok' },
      { service: 'notification', operation: 'SendEmail', start: Math.floor(totalDuration * 0.8), duration: Math.floor(10 + Math.random() * 30), status: 'ok' },
    ]

    setTraces(prev => [{
      traceId,
      totalDuration,
      spans,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 5))
  }, [triggerInteract])

  // 重置
  const handleReset = useCallback(() => {
    setMetricsHistory([])
    setCurrentMetrics({ requestRate: 120, errorRate: 2.3, p50: 45, p95: 180, p99: 420, cpuUsage: 35, memoryUsage: 62 })
    setLogEntries([])
    setTraces([])
  }, [])

  return (
    <div className="simulator-container obs-sim" id="observability-simulator">
      <div className="simulator-title">
        <span className="icon">📊</span>
        可觀測性三支柱模擬器
      </div>

      <TabGroup tabs={PILLARS} defaultTab="metrics" onChange={(p) => { setPillar(p); handleReset() }} />

      {pillar === 'metrics' && (
        <>
          <div className="obs-desc">
            <strong>Metrics</strong>：量化系統行為的時間序列資料。包含 Request Rate、Error Rate、Latency Percentiles、
            系統資源使用率等。常用工具：Prometheus + Grafana。
          </div>

          {/* 即時指標卡片 */}
          <div className="obs-metrics-grid">
            <div className="obs-metric-card">
              <div className="obs-metric-label">Request Rate</div>
              <div className="obs-metric-value">{currentMetrics.requestRate} <small>req/s</small></div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">Error Rate</div>
              <div className="obs-metric-value" style={{ color: currentMetrics.errorRate > 5 ? 'var(--clr-error)' : 'var(--clr-success)' }}>
                {currentMetrics.errorRate}%
              </div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">P50 Latency</div>
              <div className="obs-metric-value">{currentMetrics.p50}ms</div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">P95 Latency</div>
              <div className="obs-metric-value" style={{ color: currentMetrics.p95 > 300 ? 'var(--clr-warning)' : undefined }}>
                {currentMetrics.p95}ms
              </div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">P99 Latency</div>
              <div className="obs-metric-value" style={{ color: currentMetrics.p99 > 500 ? 'var(--clr-error)' : undefined }}>
                {currentMetrics.p99}ms
              </div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">CPU</div>
              <div className="obs-metric-value">{currentMetrics.cpuUsage}%</div>
              <div className="obs-bar"><div className="obs-bar-fill" style={{ width: `${currentMetrics.cpuUsage}%`, background: currentMetrics.cpuUsage > 80 ? 'var(--clr-error)' : 'var(--clr-info)' }} /></div>
            </div>
            <div className="obs-metric-card">
              <div className="obs-metric-label">Memory</div>
              <div className="obs-metric-value">{currentMetrics.memoryUsage}%</div>
              <div className="obs-bar"><div className="obs-bar-fill" style={{ width: `${currentMetrics.memoryUsage}%`, background: currentMetrics.memoryUsage > 85 ? 'var(--clr-error)' : 'var(--clr-success)' }} /></div>
            </div>
          </div>

          {/* 歷史趨勢（簡易文字圖表） */}
          {metricsHistory.length > 0 && (
            <div className="obs-history">
              <div className="obs-history-label">Request Rate 歷史</div>
              <div className="obs-sparkline">
                {metricsHistory.map((m, i) => (
                  <div key={i} className="obs-spark-bar" style={{ height: `${Math.min(m.requestRate / 3, 100)}%` }} title={`${m.requestRate} req/s @ ${m.ts}`} />
                ))}
              </div>
            </div>
          )}

          <div className="obs-controls">
            <button className="btn btn-primary" onClick={simulateTraffic} id="obs-traffic">
              📈 模擬流量
            </button>
            <button className="btn btn-ghost" onClick={() => { for (let i = 0; i < 5; i++) setTimeout(simulateTraffic, i * 200) }}>
              批次模擬（×5）
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}

      {pillar === 'logs' && (
        <>
          <div className="obs-desc">
            <strong>Structured Logging</strong>：結構化日誌包含 timestamp、log level、service name、trace ID 等欄位，
            方便搜尋和聚合。常用工具：ELK Stack（Elasticsearch + Logstash + Kibana）、Loki。
          </div>

          <div className="obs-log-entries">
            {logEntries.length === 0 ? (
              <div className="obs-empty">點擊「產生日誌」開始模擬</div>
            ) : (
              logEntries.map(entry => (
                <div key={entry.id} className={`obs-log-entry level-${entry.level.toLowerCase()}`}>
                  <span className="obs-log-ts">{entry.timestamp.split('T')[1]?.slice(0, 12)}</span>
                  <span className={`obs-log-level ${entry.level.toLowerCase()}`}>{entry.level}</span>
                  <span className="obs-log-svc">{entry.service}</span>
                  <span className="obs-log-msg">{entry.message}</span>
                  <span className="obs-log-trace">trace:{entry.traceId}</span>
                </div>
              ))
            )}
          </div>

          <div className="obs-controls">
            <button className="btn btn-primary" onClick={generateLog} id="obs-log">
              📝 產生日誌
            </button>
            <button className="btn btn-ghost" onClick={() => { for (let i = 0; i < 8; i++) setTimeout(generateLog, i * 100) }}>
              批次產生（×8）
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}

      {pillar === 'traces' && (
        <>
          <div className="obs-desc">
            <strong>Distributed Tracing</strong>：追蹤一個請求在多個微服務之間的完整鏈路。每個 Span 代表一個工作單元，
            Span 之間有父子關係。常用工具：Jaeger、Zipkin、OpenTelemetry。
          </div>

          {traces.length === 0 ? (
            <div className="obs-empty">點擊「產生鏈路」開始模擬</div>
          ) : (
            traces.map(trace => (
              <div key={trace.traceId} className="obs-trace">
                <div className="obs-trace-header">
                  <span>Trace ID: <code>{trace.traceId}</code></span>
                  <span>總耗時: <strong>{trace.totalDuration}ms</strong></span>
                  <span className="obs-trace-time">{trace.timestamp}</span>
                </div>
                <div className="obs-trace-spans">
                  {trace.spans.map((span, i) => (
                    <div key={i} className={`obs-span ${span.status}`}>
                      <div className="obs-span-label">
                        <span className="obs-span-svc">{span.service}</span>
                        <span className="obs-span-op">{span.operation}</span>
                      </div>
                      <div className="obs-span-bar-container">
                        <div
                          className={`obs-span-bar ${span.status}`}
                          style={{
                            marginLeft: `${(span.start / trace.totalDuration) * 100}%`,
                            width: `${Math.max((span.duration / trace.totalDuration) * 100, 2)}%`,
                          }}
                        >
                          {span.duration}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="obs-controls">
            <button className="btn btn-primary" onClick={generateTrace} id="obs-trace">
              🔍 產生鏈路
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}
    </div>
  )
}
