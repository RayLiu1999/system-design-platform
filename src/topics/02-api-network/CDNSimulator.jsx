// CDN / Proxy 模擬器 — CDN 快取命中與回源
import { useState, useCallback, useRef } from 'react'
import './CDNSimulator.css'

const REGIONS = ['台北', '東京', '新加坡', '美西']
const CONTENT_TYPES = [
  { type: 'image.jpg', size: 2400, cacheable: true, ttl: 86400 },
  { type: 'api/data.json', size: 500, cacheable: false, ttl: 0 },
  { type: 'style.css', size: 180, cacheable: true, ttl: 604800 },
  { type: 'index.html', size: 45, cacheable: true, ttl: 300 },
]

/**
 * CDN / Proxy 模擬器
 * 模擬用戶從不同地區請求資源，展示 CDN 邊緣節點快取命中與回源機制
 */
export default function CDNSimulator({ onInteract }) {
  const [edgeCaches, setEdgeCaches] = useState({})
  const [requests, setRequests] = useState([])
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [originLoads, setOriginLoads] = useState(0)
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

  const simulateRequest = useCallback((region, content) => {
    triggerInteract()
    const cacheKey = `${region}:${content.type}`
    const cached = edgeCaches[cacheKey]

    if (cached && content.cacheable) {
      // CDN HIT
      const latency = Math.floor(5 + Math.random() * 15)
      setHits(h => h + 1)
      addLog('success', `✓ CDN HIT [${region}] ${content.type} → ${latency}ms（從邊緣快取回應）`)
      setRequests(prev => [{ region, content: content.type, status: 'HIT', latency, source: 'Edge' }, ...prev].slice(0, 12))
    } else {
      // CDN MISS → 回源
      const latency = Math.floor(80 + Math.random() * 200)
      setMisses(m => m + 1)
      setOriginLoads(o => o + 1)

      if (content.cacheable) {
        // 快取到邊緣節點
        setEdgeCaches(prev => ({ ...prev, [cacheKey]: { type: content.type, ttl: content.ttl, cachedAt: Date.now() } }))
        addLog('warning', `✗ CDN MISS [${region}] ${content.type} → 回源 ${latency}ms → 已快取（TTL: ${content.ttl}s）`)
      } else {
        addLog('info', `→ BYPASS [${region}] ${content.type} → 直接回源 ${latency}ms（不可快取）`)
      }

      setRequests(prev => [{
        region,
        content: content.type,
        status: content.cacheable ? 'MISS' : 'BYPASS',
        latency,
        source: 'Origin',
      }, ...prev].slice(0, 12))
    }
  }, [edgeCaches, triggerInteract, addLog])

  // 清除指定地區的快取
  const purgeCache = useCallback((region) => {
    triggerInteract()
    setEdgeCaches(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        if (key.startsWith(region + ':')) delete next[key]
      })
      return next
    })
    addLog('warning', `🗑️ 已清除 [${region}] 邊緣節點快取`)
  }, [triggerInteract, addLog])

  const handleReset = useCallback(() => {
    setEdgeCaches({})
    setRequests([])
    setHits(0)
    setMisses(0)
    setOriginLoads(0)
    setLogs([])
  }, [])

  const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(0) : 0

  return (
    <div className="simulator-container cdn-sim" id="cdn-simulator">
      <div className="simulator-title">
        <span className="icon">🌐</span>
        CDN / Proxy 模擬器
      </div>

      <div className="cdn-desc">
        <strong>Content Delivery Network</strong>：在全球部署邊緣節點（Edge Node），快取靜態資源於靠近用戶的位置。
        用戶請求先到最近的 Edge → 若快取命中（HIT）直接回應 → 若未命中（MISS）則回源取得並快取。
      </div>

      {/* 架構示意 */}
      <div className="cdn-architecture">
        <div className="cdn-origin">
          <div className="cdn-origin-icon">🏢</div>
          <div>Origin Server</div>
          <div className="cdn-origin-count">回源 {originLoads} 次</div>
        </div>

        <div className="cdn-edges">
          {REGIONS.map(region => {
            const cachedItems = Object.keys(edgeCaches).filter(k => k.startsWith(region + ':')).length
            return (
              <div key={region} className={`cdn-edge ${cachedItems > 0 ? 'has-cache' : ''}`}>
                <div className="cdn-edge-name">📡 {region}</div>
                <div className="cdn-edge-cache">{cachedItems} 項快取</div>
                <div className="cdn-edge-actions">
                  {CONTENT_TYPES.map(ct => (
                    <button key={ct.type} className="btn-xs" onClick={() => simulateRequest(region, ct)} title={ct.type}>
                      {ct.type.split('/').pop().split('.').pop()}
                    </button>
                  ))}
                </div>
                {cachedItems > 0 && (
                  <button className="cdn-purge" onClick={() => purgeCache(region)} title="清除快取">🗑️</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 資源類型說明 */}
      <div className="cdn-content-types">
        {CONTENT_TYPES.map(ct => (
          <div key={ct.type} className="cdn-ct">
            <span className="cdn-ct-name">{ct.type}</span>
            <span className="cdn-ct-size">{ct.size}KB</span>
            <span className={`cdn-ct-cache ${ct.cacheable ? 'yes' : 'no'}`}>
              {ct.cacheable ? `✓ TTL ${ct.ttl}s` : '✗ 不快取'}
            </span>
          </div>
        ))}
      </div>

      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{hits}</div>
          <div className="sim-stat-label">CDN HIT</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value" style={{ color: 'var(--clr-warning)' }}>{misses}</div>
          <div className="sim-stat-label">CDN MISS</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{hitRate}%</div>
          <div className="sim-stat-label">命中率</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{originLoads}</div>
          <div className="sim-stat-label">回源次數</div>
        </div>
      </div>

      {/* 最近請求歷史 */}
      {requests.length > 0 && (
        <div className="cdn-history">
          {requests.slice(0, 6).map((req, i) => (
            <div key={i} className={`cdn-req cdn-req-${req.status.toLowerCase()}`}>
              <span className="cdn-req-region">[{req.region}]</span>
              <span className="cdn-req-content">{req.content}</span>
              <span className={`cdn-req-status ${req.status.toLowerCase()}`}>{req.status}</span>
              <span className="cdn-req-latency">{req.latency}ms</span>
            </div>
          ))}
        </div>
      )}

      <div className="cdn-controls">
        <button className="btn btn-ghost" onClick={handleReset}>重置</button>
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="cdn-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
