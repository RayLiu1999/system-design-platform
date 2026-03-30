// 非同步處理模式模擬器 — Worker Pattern / Task Queue / Saga
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './AsyncProcessingSimulator.css'

const PATTERNS = [
  { id: 'task-queue', label: 'Task Queue' },
  { id: 'saga', label: 'Saga Pattern' },
]

/**
 * 非同步處理模式模擬器
 * Task Queue：Worker 消費任務佇列
 * Saga：分散式事務補償機制
 */
export default function AsyncProcessingSimulator({ onInteract }) {
  const [pattern, setPattern] = useState('task-queue')

  // Task Queue 狀態
  const [queue, setQueue] = useState([])
  const [workers, setWorkers] = useState([
    { id: 0, status: 'idle', currentTask: null },
    { id: 1, status: 'idle', currentTask: null },
    { id: 2, status: 'idle', currentTask: null },
  ])
  const [completed, setCompleted] = useState(0)
  const [failed, setFailed] = useState(0)

  // Saga 狀態
  const [sagaSteps, setSagaSteps] = useState([
    { name: '建立訂單', service: 'Order Service', status: 'pending', compensate: '取消訂單' },
    { name: '扣減庫存', service: 'Inventory', status: 'pending', compensate: '恢復庫存' },
    { name: '扣款', service: 'Payment', status: 'pending', compensate: '退款' },
    { name: '發送通知', service: 'Notification', status: 'pending', compensate: '撤回通知' },
  ])
  const [sagaStatus, setSagaStatus] = useState('idle')

  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const taskIdRef = useRef(0)
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

  // ===== Task Queue =====
  const addTask = useCallback((type = 'normal') => {
    triggerInteract()
    taskIdRef.current++
    const task = {
      id: taskIdRef.current,
      type,
      name: type === 'normal' ? `email_${taskIdRef.current}` : `report_${taskIdRef.current}`,
      duration: type === 'normal' ? Math.floor(500 + Math.random() * 1000) : Math.floor(2000 + Math.random() * 3000),
      status: 'queued',
    }
    setQueue(prev => [...prev, task])
    addLog('info', `📥 Task #${task.id} "${task.name}" 加入佇列（預估 ${task.duration}ms）`)
  }, [triggerInteract, addLog])

  const processQueue = useCallback(() => {
    triggerInteract()
    setQueue(prev => {
      if (prev.length === 0) {
        addLog('info', '📭 佇列已空')
        return prev
      }

      const remaining = [...prev]
      const processing = []

      setWorkers(prevWorkers => {
        return prevWorkers.map(worker => {
          if (worker.status === 'idle' && remaining.length > 0) {
            const task = remaining.shift()
            processing.push({ worker, task })
            return { ...worker, status: 'busy', currentTask: task }
          }
          return worker
        })
      })

      // 模擬處理完成
      processing.forEach(({ worker, task }) => {
        addLog('info', `⚙️ Worker-${worker.id} 開始處理 Task #${task.id}`)
        const willFail = Math.random() < 0.1
        setTimeout(() => {
          if (willFail) {
            setFailed(f => f + 1)
            addLog('error', `  ❌ Worker-${worker.id} 處理 Task #${task.id} 失敗`)
          } else {
            setCompleted(c => c + 1)
            addLog('success', `  ✓ Worker-${worker.id} 完成 Task #${task.id}（${task.duration}ms）`)
          }
          setWorkers(w => w.map(wk => wk.id === worker.id ? { ...wk, status: 'idle', currentTask: null } : wk))
        }, Math.min(task.duration, 1500))
      })

      return remaining
    })
  }, [triggerInteract, addLog])

  // ===== Saga =====
  const executeSaga = useCallback((shouldFail = false) => {
    triggerInteract()
    setSagaStatus('running')
    const steps = [
      { name: '建立訂單', service: 'Order Service', status: 'pending', compensate: '取消訂單' },
      { name: '扣減庫存', service: 'Inventory', status: 'pending', compensate: '恢復庫存' },
      { name: '扣款', service: 'Payment', status: 'pending', compensate: '退款' },
      { name: '發送通知', service: 'Notification', status: 'pending', compensate: '撤回通知' },
    ]
    setSagaSteps(steps)
    setLogs([])

    addLog('info', '🚀 開始 Saga 事務...')

    const failAt = shouldFail ? Math.floor(Math.random() * 3) + 1 : -1
    let i = 0

    const executeStep = () => {
      if (i >= steps.length) {
        setSagaStatus('completed')
        addLog('success', '✅ Saga 所有步驟完成！')
        return
      }

      const stepIndex = i
      addLog('info', `  ${stepIndex + 1}. 執行: ${steps[stepIndex].name} (${steps[stepIndex].service})`)

      setTimeout(() => {
        if (stepIndex === failAt) {
          // 步驟失敗 → 觸發補償
          setSagaSteps(prev => prev.map((s, idx) => 
            idx === stepIndex ? { ...s, status: 'failed' } : s
          ))
          addLog('error', `  ❌ ${steps[stepIndex].name} 失敗！開始補償...`)
          setSagaStatus('compensating')

          // 反向補償已完成的步驟
          let compIdx = stepIndex - 1
          const compensate = () => {
            if (compIdx < 0) {
              setSagaStatus('compensated')
              addLog('warning', '🔄 所有補償完成（Saga 已回滾）')
              return
            }
            const ci = compIdx
            addLog('warning', `  ↩ 補償: ${steps[ci].compensate} (${steps[ci].service})`)
            setSagaSteps(prev => prev.map((s, idx) =>
              idx === ci ? { ...s, status: 'compensated' } : s
            ))
            compIdx--
            setTimeout(compensate, 500)
          }
          setTimeout(compensate, 500)
        } else {
          // 步驟成功
          setSagaSteps(prev => prev.map((s, idx) =>
            idx === stepIndex ? { ...s, status: 'completed' } : s
          ))
          addLog('success', `  ✓ ${steps[stepIndex].name} 完成`)
          i++
          setTimeout(executeStep, 500)
        }
      }, 600)
    }

    setTimeout(executeStep, 300)
  }, [triggerInteract, addLog])

  // 重置
  const handleReset = useCallback(() => {
    setQueue([])
    setWorkers([
      { id: 0, status: 'idle', currentTask: null },
      { id: 1, status: 'idle', currentTask: null },
      { id: 2, status: 'idle', currentTask: null },
    ])
    setCompleted(0)
    setFailed(0)
    setSagaSteps([
      { name: '建立訂單', service: 'Order Service', status: 'pending', compensate: '取消訂單' },
      { name: '扣減庫存', service: 'Inventory', status: 'pending', compensate: '恢復庫存' },
      { name: '扣款', service: 'Payment', status: 'pending', compensate: '退款' },
      { name: '發送通知', service: 'Notification', status: 'pending', compensate: '撤回通知' },
    ])
    setSagaStatus('idle')
    setLogs([])
  }, [])

  return (
    <div className="simulator-container async-sim" id="async-processing-simulator">
      <div className="simulator-title">
        <span className="icon">⏳</span>
        非同步處理模式模擬器
      </div>

      <TabGroup tabs={PATTERNS} defaultTab="task-queue" onChange={(p) => { setPattern(p); handleReset() }} />

      {pattern === 'task-queue' ? (
        <>
          <div className="async-desc">
            <strong>Task Queue + Workers</strong>：Producer 將任務推入佇列，多個 Worker 並行消費。
            適合 Email 發送、報表生成、圖片處理等耗時操作。Worker 可以水平擴展。
          </div>

          {/* Workers 狀態 */}
          <div className="async-workers">
            {workers.map(w => (
              <div key={w.id} className={`async-worker ${w.status}`}>
                <div className="async-worker-icon">{w.status === 'busy' ? '⚙️' : '💤'}</div>
                <div className="async-worker-label">Worker-{w.id}</div>
                <div className="async-worker-status">{w.status === 'busy' ? `處理 #${w.currentTask?.id}` : 'idle'}</div>
              </div>
            ))}
          </div>

          {/* 佇列 */}
          <div className="async-queue">
            <span className="async-queue-label">📥 任務佇列 ({queue.length})</span>
            <div className="async-queue-items">
              {queue.map(task => (
                <span key={task.id} className="async-queue-item">#{task.id}</span>
              ))}
              {queue.length === 0 && <span className="async-queue-empty">空</span>}
            </div>
          </div>

          <div className="async-controls">
            <button className="btn btn-primary" onClick={() => addTask('normal')}>📧 加入一般任務</button>
            <button className="btn btn-ghost" onClick={() => addTask('heavy')}>📊 加入耗時任務</button>
            <button className="btn btn-ghost" onClick={() => { for (let i = 0; i < 5; i++) setTimeout(() => addTask('normal'), i * 50) }}>批次加入（×5）</button>
            <button className="btn btn-primary" onClick={processQueue}>▶️ 處理佇列</button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{queue.length}</div>
              <div className="sim-stat-label">待處理</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{completed}</div>
              <div className="sim-stat-label">已完成</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-error)' }}>{failed}</div>
              <div className="sim-stat-label">失敗</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="async-desc">
            <strong>Saga Pattern</strong>：分散式事務的解決方案。每個步驟都有對應的補償（Compensate）操作。
            若某步驟失敗，自動反向執行已完成步驟的補償操作，確保最終一致性。
          </div>

          {/* Saga 步驟視覺化 */}
          <div className="saga-steps">
            {sagaSteps.map((step, i) => (
              <div key={i} className={`saga-step ${step.status}`}>
                <div className="saga-step-num">{i + 1}</div>
                <div className="saga-step-info">
                  <div className="saga-step-name">{step.name}</div>
                  <div className="saga-step-svc">{step.service}</div>
                </div>
                <div className="saga-step-status">
                  {step.status === 'pending' && '⏸️'}
                  {step.status === 'completed' && '✅'}
                  {step.status === 'failed' && '❌'}
                  {step.status === 'compensated' && '↩️'}
                </div>
                {step.status === 'compensated' && (
                  <div className="saga-compensate">{step.compensate}</div>
                )}
              </div>
            ))}
          </div>

          <div className="saga-status-bar">
            狀態: <strong className={`saga-${sagaStatus}`}>{
              sagaStatus === 'idle' ? '等待執行' :
              sagaStatus === 'running' ? '執行中...' :
              sagaStatus === 'completed' ? '✅ 全部成功' :
              sagaStatus === 'compensating' ? '🔄 補償中...' :
              '↩️ 已回滾'
            }</strong>
          </div>

          <div className="async-controls">
            <button className="btn btn-primary" onClick={() => executeSaga(false)} disabled={sagaStatus === 'running' || sagaStatus === 'compensating'}>
              ▶️ 執行 Saga（成功）
            </button>
            <button className="btn btn-ghost" onClick={() => executeSaga(true)} disabled={sagaStatus === 'running' || sagaStatus === 'compensating'} style={{ borderColor: 'var(--clr-error)', color: 'var(--clr-error)' }}>
              💥 執行 Saga（失敗 + 補償）
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>重置</button>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="async-processing-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
