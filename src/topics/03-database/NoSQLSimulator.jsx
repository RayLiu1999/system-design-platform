// NoSQL 資料庫模擬器 — Document / Key-Value / Column / Graph 對比
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './NoSQLSimulator.css'

const DB_TYPES = [
  { id: 'document', label: 'Document (MongoDB)' },
  { id: 'kv', label: 'Key-Value (Redis)' },
  { id: 'column', label: 'Column (Cassandra)' },
  { id: 'graph', label: 'Graph (Neo4j)' },
]

const DB_INFO = {
  document: {
    desc: '以 JSON Document 儲存，Schema-free。適合半結構化資料、快速開發、聚合查詢。',
    example: '{\n  "_id": "user_001",\n  "name": "Alice",\n  "orders": [\n    { "id": "ord_1", "total": 299 },\n    { "id": "ord_2", "total": 150 }\n  ],\n  "address": {\n    "city": "Taipei",\n    "zip": "100"\n  }\n}',
    pros: ['Schema 彈性', '巢狀文件避免 JOIN', '水平擴展（Sharding）'],
    cons: ['無 JOIN、不適合複雜關聯', '重複資料（Denormalization）', '事務支援有限'],
    useCase: '使用者 Profile、CMS、產品目錄',
  },
  kv: {
    desc: '最簡單的 NoSQL。以 Key 查找 Value，O(1) 讀寫。適合快取、Session、計數器。',
    example: 'SET user:1001 "Alice"        → OK\nGET user:1001                → "Alice"\nINCR page_views:home        → 42\nSETEX session:abc 3600 data → OK (TTL 1hr)',
    pros: ['極低延遲 O(1)', '簡單易用', '適合快取場景'],
    cons: ['無法複雜查詢', '只能用 Key 查找', 'Value 結構有限'],
    useCase: 'Session Store、快取、Rate Limiting 計數器',
  },
  column: {
    desc: 'Wide-Column Store。資料按 Column Family 分組，適合大量寫入和時序資料。',
    example: 'Row Key: user_001\n┌─────────────┬──────────────────┐\n│ Column Fam  │ Columns          │\n├─────────────┼──────────────────┤\n│ info        │ name: Alice      │\n│             │ email: a@b.com   │\n├─────────────┼──────────────────┤\n│ metrics     │ logins: 42       │\n│             │ last_seen: ...   │\n└─────────────┴──────────────────┘',
    pros: ['超高寫入吞吐量', '可按 Column 讀取', '線性可擴展'],
    cons: ['查詢模式需預先設計', '不支援 ad-hoc 查詢', '學習曲線陡峭'],
    useCase: '時序資料、IoT、大規模日誌',
  },
  graph: {
    desc: 'Graph DB 以節點和邊儲存資料，適合高度關聯的資料和圖形遍歷查詢。',
    example: 'CREATE (alice:User {name: "Alice"})\nCREATE (bob:User {name: "Bob"})\nCREATE (alice)-[:FOLLOWS]->(bob)\nCREATE (alice)-[:LIKES]->(post1:Post)\n\nMATCH (u)-[:FOLLOWS*2]->(fof)\nRETURN fof.name  // 朋友的朋友',
    pros: ['自然表達關聯', '遍歷查詢極快', '靈活 Schema'],
    cons: ['不適合大量聚合', '生態系較小', '擴展較難'],
    useCase: '社群網路、推薦系統、知識圖譜',
  },
}

/**
 * NoSQL 資料庫模擬器
 * 四種 NoSQL 類型的特性對比與範例
 */
export default function NoSQLSimulator({ onInteract }) {
  const [dbType, setDbType] = useState('document')
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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 10))
  }, [])

  const info = DB_INFO[dbType]

  const simulateQuery = useCallback(() => {
    triggerInteract()
    const latency = dbType === 'kv' ? Math.floor(1 + Math.random() * 3) : Math.floor(5 + Math.random() * 30)
    addLog('success', `✓ ${dbType.toUpperCase()} Query 完成 → ${latency}ms`)
    if (dbType === 'kv') addLog('info', '  O(1) 直接 Key 查找')
    if (dbType === 'document') addLog('info', '  使用 _id 索引查找 Document')
    if (dbType === 'column') addLog('info', '  按 Row Key + Column Family 定位')
    if (dbType === 'graph') addLog('info', '  圖遍歷：沿 Edge 遍歷 2 hop')
  }, [dbType, triggerInteract, addLog])

  return (
    <div className="simulator-container nosql-sim" id="nosql-simulator">
      <div className="simulator-title">
        <span className="icon">📦</span>
        NoSQL 資料庫模擬器
      </div>

      <TabGroup tabs={DB_TYPES} defaultTab="document" onChange={(t) => { setDbType(t); setLogs([]) }} />

      <div className="nosql-desc">{info.desc}</div>

      {/* 資料範例 */}
      <div className="nosql-example">
        <div className="nosql-example-title">資料模型範例</div>
        <pre className="nosql-code">{info.example}</pre>
      </div>

      {/* 優缺點 */}
      <div className="nosql-comparison">
        <div className="nosql-pros">
          <div className="nosql-list-title">✅ 優勢</div>
          {info.pros.map((p, i) => <div key={i} className="nosql-item pros">{p}</div>)}
        </div>
        <div className="nosql-cons">
          <div className="nosql-list-title">⚠️ 限制</div>
          {info.cons.map((c, i) => <div key={i} className="nosql-item cons">{c}</div>)}
        </div>
      </div>

      <div className="nosql-usecase">
        <strong>適用場景：</strong>{info.useCase}
      </div>

      <div className="nosql-actions">
        <button className="btn btn-primary" onClick={simulateQuery}>📡 模擬查詢</button>
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="nosql-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
