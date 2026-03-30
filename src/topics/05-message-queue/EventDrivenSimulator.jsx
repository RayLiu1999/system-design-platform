// 事件驅動架構模擬器 — Event Sourcing / CQRS / Pub-Sub
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './EventDrivenSimulator.css'

const PATTERNS = [
  { id: 'pubsub', label: 'Pub/Sub' },
  { id: 'event-sourcing', label: 'Event Sourcing' },
]

/**
 * 事件驅動架構模擬器
 * Pub/Sub 訊息分發 + Event Sourcing 事件溯源
 */
export default function EventDrivenSimulator({ onInteract }) {
  const [pattern, setPattern] = useState('pubsub')

  // Pub/Sub 狀態
  const [topics] = useState(['order.created', 'order.paid', 'user.registered'])
  const [subscribers, setSubscribers] = useState({
    'order.created': ['inventory-service', 'notification-service'],
    'order.paid': ['shipping-service', 'analytics-service'],
    'user.registered': ['welcome-email', 'crm-service'],
  })
  const [publishedCount, setPublishedCount] = useState(0)
  const [deliveredCount, setDeliveredCount] = useState(0)

  // Event Sourcing 狀態
  const [events, setEvents] = useState([])
  const [currentState, setCurrentState] = useState({ items: {}, total: 0 })

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

  // ===== Pub/Sub =====
  const publish = useCallback((topic) => {
    triggerInteract()
    setPublishedCount(c => c + 1)
    const subs = subscribers[topic] || []
    addLog('info', `📢 Published: "${topic}"`)

    subs.forEach((sub, i) => {
      setTimeout(() => {
        setDeliveredCount(c => c + 1)
        addLog('success', `  ├─ → ${sub}: 收到 "${topic}" ✓`)
      }, (i + 1) * 200)
    })

    if (subs.length === 0) {
      addLog('warning', `  └─ 沒有訂閱者`)
    }
  }, [subscribers, triggerInteract, addLog])

  // 新增/移除訂閱者
  const toggleSubscriber = useCallback((topic, sub) => {
    triggerInteract()
    setSubscribers(prev => {
      const subs = prev[topic] || []
      if (subs.includes(sub)) {
        addLog('info', `🔕 ${sub} 取消訂閱 "${topic}"`)
        return { ...prev, [topic]: subs.filter(s => s !== sub) }
      } else {
        addLog('info', `🔔 ${sub} 訂閱 "${topic}"`)
        return { ...prev, [topic]: [...subs, sub] }
      }
    })
  }, [triggerInteract, addLog])

  // ===== Event Sourcing =====
  const addToCart = useCallback((item, price) => {
    triggerInteract()
    const event = {
      type: 'ItemAdded',
      data: { item, price },
      timestamp: new Date().toISOString(),
      version: events.length + 1,
    }
    setEvents(prev => [...prev, event])
    setCurrentState(prev => ({
      items: { ...prev.items, [item]: (prev.items[item] || 0) + 1 },
      total: prev.total + price,
    }))
    addLog('success', `📥 Event: ItemAdded { item: "${item}", price: $${price} }`)
  }, [events, triggerInteract, addLog])

  const removeFromCart = useCallback((item, price) => {
    triggerInteract()
    if (!currentState.items[item]) {
      addLog('error', `❌ "${item}" 不在購物車中`)
      return
    }
    const event = {
      type: 'ItemRemoved',
      data: { item, price },
      timestamp: new Date().toISOString(),
      version: events.length + 1,
    }
    setEvents(prev => [...prev, event])
    setCurrentState(prev => {
      const newItems = { ...prev.items }
      if (newItems[item] <= 1) delete newItems[item]
      else newItems[item]--
      return { items: newItems, total: prev.total - price }
    })
    addLog('warning', `📤 Event: ItemRemoved { item: "${item}", price: $${price} }`)
  }, [currentState, events, triggerInteract, addLog])

  const replayEvents = useCallback(() => {
    triggerInteract()
    addLog('info', `⏪ 重播 ${events.length} 個事件...`)

    // 從空白狀態重播
    let state = { items: {}, total: 0 }
    events.forEach((event, i) => {
      if (event.type === 'ItemAdded') {
        state = {
          items: { ...state.items, [event.data.item]: (state.items[event.data.item] || 0) + 1 },
          total: state.total + event.data.price,
        }
      } else if (event.type === 'ItemRemoved') {
        const newItems = { ...state.items }
        if (newItems[event.data.item] <= 1) delete newItems[event.data.item]
        else newItems[event.data.item]--
        state = { items: newItems, total: state.total - event.data.price }
      }
      addLog('info', `  ${i + 1}. ${event.type} → total: $${state.total}`)
    })
    setCurrentState(state)
    addLog('success', `✓ 重播完成 — 最終狀態: $${state.total}`)
  }, [events, triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setSubscribers({
      'order.created': ['inventory-service', 'notification-service'],
      'order.paid': ['shipping-service', 'analytics-service'],
      'user.registered': ['welcome-email', 'crm-service'],
    })
    setPublishedCount(0)
    setDeliveredCount(0)
    setEvents([])
    setCurrentState({ items: {}, total: 0 })
    setLogs([])
  }, [])

  return (
    <div className="simulator-container ed-sim" id="event-driven-simulator">
      <div className="simulator-title">
        <span className="icon">⚡</span>
        事件驅動架構模擬器
      </div>

      <TabGroup tabs={PATTERNS} defaultTab="pubsub" onChange={(p) => { setPattern(p); handleReset() }} />

      {pattern === 'pubsub' ? (
        <>
          <div className="ed-desc">
            <strong>Publish/Subscribe</strong>：鬆耦合的訊息分發模式。Producer 發布事件到 Topic，
            所有訂閱該 Topic 的 Consumer 都會收到訊息。新增/移除 Consumer 不影響 Producer。
          </div>

          {/* Topics 與訂閱者 */}
          <div className="ed-pubsub-grid">
            {topics.map(topic => (
              <div key={topic} className="ed-topic-card">
                <div className="ed-topic-name">{topic}</div>
                <div className="ed-subs">
                  {(subscribers[topic] || []).map(sub => (
                    <div key={sub} className="ed-sub" onClick={() => toggleSubscriber(topic, sub)}>
                      <span className="ed-sub-icon">🔔</span>
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-sm" onClick={() => publish(topic)} style={{ marginTop: 'var(--space-2)' }}>
                  📢 Publish
                </button>
              </div>
            ))}
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{publishedCount}</div>
              <div className="sim-stat-label">已發布</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{deliveredCount}</div>
              <div className="sim-stat-label">已送達</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ed-desc">
            <strong>Event Sourcing</strong>：不儲存當前狀態，而是儲存所有的狀態變更事件。
            當前狀態可以從事件序列中重播（Replay）得出。支援事件回溯、審計追蹤、時間旅行。
          </div>

          {/* 購物車操作 */}
          <div className="ed-es-actions">
            <button className="btn btn-primary" onClick={() => addToCart('iPhone', 999)}>🛒 加入 iPhone ($999)</button>
            <button className="btn btn-ghost" onClick={() => addToCart('AirPods', 249)}>🛒 加入 AirPods ($249)</button>
            <button className="btn btn-ghost" onClick={() => removeFromCart('iPhone', 999)}>❌ 移除 iPhone</button>
            <button className="btn btn-ghost" onClick={replayEvents} disabled={events.length === 0}>⏪ 重播事件</button>
          </div>

          {/* 當前狀態 + 事件記錄 */}
          <div className="ed-es-layout">
            <div className="ed-es-state">
              <div className="ed-es-title">📦 當前狀態（Materialized View）</div>
              {Object.keys(currentState.items).length === 0 ? (
                <div className="cs-empty">購物車空</div>
              ) : (
                Object.entries(currentState.items).map(([item, qty]) => (
                  <div key={item} className="cs-entry">
                    <span className="cs-key">{item}</span>
                    <span className="cs-val">×{qty}</span>
                  </div>
                ))
              )}
              <div className="ed-es-total">Total: <strong>${currentState.total}</strong></div>
            </div>

            <div className="ed-es-events">
              <div className="ed-es-title">📜 Event Store（{events.length} 筆）</div>
              {events.length === 0 ? (
                <div className="cs-empty">尚無事件</div>
              ) : (
                events.slice(-8).map((event, i) => (
                  <div key={i} className={`ed-event ${event.type === 'ItemAdded' ? 'add' : 'remove'}`}>
                    <span className="ed-event-ver">v{event.version}</span>
                    <span className="ed-event-type">{event.type}</span>
                    <span className="ed-event-data">{event.data.item} ${event.data.price}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="ed-controls" style={{ marginTop: 'var(--space-4)' }}>
        <button className="btn btn-ghost" onClick={handleReset}>重置</button>
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="event-driven-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
