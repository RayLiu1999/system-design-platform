// API 設計模擬器 — REST / gRPC / GraphQL 選型對比
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './APIDesignSimulator.css'

const PROTOCOLS = [
  { id: 'rest', label: 'REST' },
  { id: 'grpc', label: 'gRPC' },
  { id: 'graphql', label: 'GraphQL' },
]

const ENDPOINTS = [
  { name: '取得使用者', path: '/users/1' },
  { name: '使用者+訂單', path: '/users/1?include=orders' },
  { name: '批次取得', path: '/users?ids=1,2,3' },
]

/**
 * API 設計模擬器
 * 對比 REST / gRPC / GraphQL 在同一場景下的差異
 */
export default function APIDesignSimulator({ onInteract }) {
  const [protocol, setProtocol] = useState('rest')
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ totalRequests: 0, totalBytes: 0, avgLatency: 0 })
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

  // 模擬 API 呼叫
  const simulateRequest = useCallback((endpoint) => {
    triggerInteract()

    const protocolData = {
      rest: {
        format: 'JSON',
        serialization: 'Text (JSON)',
        transport: 'HTTP/1.1',
        latencyBase: 50,
        sizeBase: 800,
        code: {
          '取得使用者': 'GET /api/v1/users/1\nAccept: application/json\n\n→ 200 { "id": 1, "name": "Alice", "email": "alice@example.com", ... }',
          '使用者+訂單': 'GET /api/v1/users/1\n→ { user... }\nGET /api/v1/users/1/orders\n→ { orders... }\n\n⚠️ Over-fetching: 兩次請求、多餘欄位',
          '批次取得': 'GET /api/v1/users/1\nGET /api/v1/users/2\nGET /api/v1/users/3\n\n⚠️ N+1 問題：3 次獨立請求',
        },
      },
      grpc: {
        format: 'Protobuf',
        serialization: 'Binary (Protobuf)',
        transport: 'HTTP/2',
        latencyBase: 15,
        sizeBase: 200,
        code: {
          '取得使用者': 'rpc GetUser(GetUserRequest) returns (User)\n\nmessage GetUserRequest { int32 id = 1; }\nmessage User { int32 id = 1; string name = 2; }',
          '使用者+訂單': 'rpc GetUserWithOrders(GetUserRequest) returns (UserWithOrders)\n\n✓ 單一呼叫取得所有資料\n✓ Protobuf 二進位序列化，體積小',
          '批次取得': 'rpc BatchGetUsers(BatchRequest) returns (stream User)\n\n✓ Server Streaming: 串流回傳\n✓ HTTP/2 多路複用',
        },
      },
      graphql: {
        format: 'JSON (selective)',
        serialization: 'Text (JSON + Query)',
        transport: 'HTTP/1.1 (POST)',
        latencyBase: 35,
        sizeBase: 400,
        code: {
          '取得使用者': 'query {\n  user(id: 1) {\n    id\n    name\n    email\n  }\n}\n\n✓ 只取需要的欄位，無 Over-fetching',
          '使用者+訂單': 'query {\n  user(id: 1) {\n    name\n    orders {\n      id\n      total\n    }\n  }\n}\n\n✓ 一次請求解決關聯查詢',
          '批次取得': 'query {\n  users(ids: [1, 2, 3]) {\n    id\n    name\n  }\n}\n\n✓ 一次查詢批次取得',
        },
      },
    }

    const data = protocolData[protocol]
    const latency = data.latencyBase + Math.floor(Math.random() * 30)
    const size = data.sizeBase + Math.floor(Math.random() * 200)
    const code = data.code[endpoint.name] || ''

    const req = {
      protocol,
      endpoint: endpoint.name,
      latency,
      size,
      format: data.format,
      transport: data.transport,
      code,
      timestamp: new Date().toLocaleTimeString(),
    }

    setRequests(prev => [req, ...prev].slice(0, 8))
    setStats(prev => {
      const total = prev.totalRequests + 1
      return {
        totalRequests: total,
        totalBytes: prev.totalBytes + size,
        avgLatency: Math.floor((prev.avgLatency * prev.totalRequests + latency) / total),
      }
    })

    addLog('success', `${protocol.toUpperCase()} ${endpoint.name} → ${latency}ms, ${size}B (${data.transport})`)
  }, [protocol, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setRequests([])
    setStats({ totalRequests: 0, totalBytes: 0, avgLatency: 0 })
    setLogs([])
  }, [])

  return (
    <div className="simulator-container api-sim" id="api-design-simulator">
      <div className="simulator-title">
        <span className="icon">🔌</span>
        API 設計模擬器
      </div>

      <TabGroup tabs={PROTOCOLS} defaultTab="rest" onChange={(p) => { setProtocol(p); handleReset() }} />

      {/* 協議特性 */}
      <div className="api-features">
        <div className="api-feat">
          <span className="api-feat-label">序列化</span>
          <span className="api-feat-value">{protocol === 'rest' ? 'JSON (Text)' : protocol === 'grpc' ? 'Protobuf (Binary)' : 'JSON (Selective)'}</span>
        </div>
        <div className="api-feat">
          <span className="api-feat-label">傳輸</span>
          <span className="api-feat-value">{protocol === 'grpc' ? 'HTTP/2' : 'HTTP/1.1'}</span>
        </div>
        <div className="api-feat">
          <span className="api-feat-label">Schema</span>
          <span className="api-feat-value">{protocol === 'rest' ? 'OpenAPI (可選)' : protocol === 'grpc' ? '.proto (強制)' : 'Schema (強制)'}</span>
        </div>
        <div className="api-feat">
          <span className="api-feat-label">即時性</span>
          <span className="api-feat-value">{protocol === 'rest' ? 'Polling/SSE' : protocol === 'grpc' ? 'Bi-directional Stream' : 'Subscription (WebSocket)'}</span>
        </div>
      </div>

      {/* 呼叫按鈕 */}
      <div className="api-actions">
        {ENDPOINTS.map(ep => (
          <button key={ep.name} className="btn btn-primary" onClick={() => simulateRequest(ep)} id={`api-${ep.name}`}>
            📡 {ep.name}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={handleReset}>重置</button>
      </div>

      {/* 最近請求 + Code 展示 */}
      {requests.length > 0 && (
        <div className="api-recent">
          {requests.slice(0, 3).map((req, i) => (
            <div key={i} className="api-req-card">
              <div className="api-req-header">
                <span className="api-req-proto">{req.protocol.toUpperCase()}</span>
                <span className="api-req-ep">{req.endpoint}</span>
                <span className="api-req-timing">{req.latency}ms / {req.size}B</span>
              </div>
              <pre className="api-req-code">{req.code}</pre>
            </div>
          ))}
        </div>
      )}

      <div className="sim-stats">
        <div className="sim-stat-card">
          <div className="sim-stat-value">{stats.totalRequests}</div>
          <div className="sim-stat-label">總請求</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{stats.avgLatency}ms</div>
          <div className="sim-stat-label">平均延遲</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-value">{(stats.totalBytes / 1024).toFixed(1)}KB</div>
          <div className="sim-stat-label">總傳輸量</div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="api-design-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
