// DevOps 模擬器 — CI/CD Pipeline + Deployment Strategy
import { useState, useCallback, useRef, useEffect } from 'react'
import TabGroup from '../../components/TabGroup'
import './DevOpsSimulator.css'

const TABS = [
  { id: 'cicd', label: 'CI/CD Pipeline' },
  { id: 'deploy', label: 'Deployment Strategy' },
]

// Pipeline 階段定義
const PIPELINE_STAGES = [
  { id: 'checkout', name: 'Checkout', icon: '📥', duration: 800 },
  { id: 'build', name: 'Build', icon: '🔨', duration: 1500 },
  { id: 'lint', name: 'Lint', icon: '🔍', duration: 600 },
  { id: 'test', name: 'Test', icon: '🧪', duration: 2000 },
  { id: 'security', name: 'Security Scan', icon: '🛡️', duration: 1000 },
  { id: 'deploy', name: 'Deploy', icon: '🚀', duration: 1200 },
]

/**
 * DevOps 模擬器
 * Tab 1：CI/CD Pipeline 視覺化（Build → Test → Deploy 各階段）
 * Tab 2：Deployment Strategy（Blue-Green / Canary / Rolling）
 */
export default function DevOpsSimulator({ onInteract }) {
  const [tab, setTab] = useState('cicd')

  // ===== CI/CD Pipeline 狀態 =====
  const [stages, setStages] = useState(
    PIPELINE_STAGES.map(s => ({ ...s, status: 'pending', elapsed: 0 }))
  )
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineResult, setPipelineResult] = useState(null) // 'success' | 'failed' | null
  const [failOnTest, setFailOnTest] = useState(false)
  const [skipSecurity, setSkipSecurity] = useState(false)
  const [runCount, setRunCount] = useState(0)

  // ===== Deployment 狀態 =====
  const [strategy, setStrategy] = useState('blue-green') // blue-green | canary | rolling
  const [deployPhase, setDeployPhase] = useState('idle') // idle | deploying | done
  const [v1Traffic, setV1Traffic] = useState(100)
  const [v2Traffic, setV2Traffic] = useState(0)
  const [instances, setInstances] = useState([1, 1, 1, 1]) // 0=v1, 1=v1, etc. 值代表版本
  const [, setDeployStep] = useState(0)

  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)
  const timerRef = useRef(null)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const addLog = useCallback((type, msg) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 25))
  }, [])

  // 清除計時器
  useEffect(() => {
    const ref = timerRef
    return () => {
      if (ref.current) clearTimeout(ref.current)
    }
  }, [])

  // ===== CI/CD Pipeline 邏輯 =====
  const runPipeline = useCallback(() => {
    triggerInteract()
    setPipelineRunning(true)
    setPipelineResult(null)
    setRunCount(c => c + 1)
    setLogs([])

    // 決定哪些階段要執行
    const activeStages = PIPELINE_STAGES.filter(s => {
      if (s.id === 'security' && skipSecurity) return false
      return true
    })

    // 重置所有階段
    setStages(PIPELINE_STAGES.map(s => ({
      ...s,
      status: (s.id === 'security' && skipSecurity) ? 'skipped' : 'pending',
      elapsed: 0,
    })))

    addLog('info', `▶ Pipeline #${runCount + 1} 開始執行...`)

    // 依序執行每個階段
    let delay = 300
    activeStages.forEach((stage, index) => {
      // 開始此階段
      const startDelay = delay
      setTimeout(() => {
        setStages(prev => prev.map(s =>
          s.id === stage.id ? { ...s, status: 'running' } : s
        ))
        addLog('info', `⏳ ${stage.icon} ${stage.name} 執行中...`)
      }, startDelay)

      delay += stage.duration

      // 完成此階段
      const endDelay = delay
      const isLastStage = index === activeStages.length - 1
      const shouldFail = failOnTest && stage.id === 'test'

      setTimeout(() => {
        if (shouldFail) {
          setStages(prev => prev.map(s =>
            s.id === stage.id
              ? { ...s, status: 'failed', elapsed: stage.duration }
              : s
          ))
          addLog('error', `❌ ${stage.icon} ${stage.name} 失敗！發現 3 個測試未通過`)
          addLog('error', '🛑 Pipeline 終止')
          setPipelineRunning(false)
          setPipelineResult('failed')
        } else {
          setStages(prev => prev.map(s =>
            s.id === stage.id
              ? { ...s, status: 'success', elapsed: stage.duration }
              : s
          ))
          addLog('success', `✓ ${stage.icon} ${stage.name} 完成 (${(stage.duration / 1000).toFixed(1)}s)`)

          if (isLastStage) {
            addLog('success', '🎉 Pipeline 全部通過！')
            setPipelineRunning(false)
            setPipelineResult('success')
          }
        }
      }, endDelay)
    })
  }, [triggerInteract, failOnTest, skipSecurity, runCount, addLog])

  const resetPipeline = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStages(PIPELINE_STAGES.map(s => ({ ...s, status: 'pending', elapsed: 0 })))
    setPipelineRunning(false)
    setPipelineResult(null)
    setLogs([])
  }, [])

  // ===== Deployment 邏輯 =====
  const startDeploy = useCallback(() => {
    triggerInteract()
    setDeployPhase('deploying')
    setDeployStep(0)
    setLogs([])

    if (strategy === 'blue-green') {
      addLog('info', '🔵🟢 Blue-Green Deployment 開始')
      addLog('info', '① 在 Green 環境部署 v2...')
      setInstances([1, 1, 1, 1])
      setV1Traffic(100)
      setV2Traffic(0)

      setTimeout(() => {
        addLog('success', '✓ Green 環境 v2 部署完成')
        addLog('info', '② Health Check 驗證中...')
        setDeployStep(1)
      }, 1500)

      setTimeout(() => {
        addLog('success', '✓ Health Check 通過')
        addLog('info', '③ 切換流量 Blue → Green')
        setV1Traffic(0)
        setV2Traffic(100)
        setInstances([2, 2, 2, 2])
        setDeployStep(2)
      }, 3000)

      setTimeout(() => {
        addLog('success', '🎉 Blue-Green Deployment 完成！流量已全部切換至 v2')
        addLog('info', '💡 Blue 環境保留作為快速 Rollback 備用')
        setDeployPhase('done')
      }, 4000)

    } else if (strategy === 'canary') {
      addLog('info', '🐦 Canary Deployment 開始')
      addLog('info', '① 部署 1 個 Canary 實例 (v2)...')
      setInstances([1, 1, 1, 1])
      setV1Traffic(100)
      setV2Traffic(0)

      setTimeout(() => {
        setInstances([1, 1, 1, 2])
        setV1Traffic(75)
        setV2Traffic(25)
        addLog('success', '✓ Canary 實例就緒，導流 25%')
        setDeployStep(1)
      }, 1500)

      setTimeout(() => {
        addLog('info', '② 監控 Canary 指標... 錯誤率 0.1%，延遲 P99 正常')
        addLog('success', '✓ Canary 指標健康，擴大至 50%')
        setInstances([1, 1, 2, 2])
        setV1Traffic(50)
        setV2Traffic(50)
        setDeployStep(2)
      }, 3000)

      setTimeout(() => {
        addLog('success', '✓ 全量發布 → 100% v2')
        setInstances([2, 2, 2, 2])
        setV1Traffic(0)
        setV2Traffic(100)
        setDeployStep(3)
      }, 4500)

      setTimeout(() => {
        addLog('success', '🎉 Canary Deployment 完成！漸進式驗證通過')
        setDeployPhase('done')
      }, 5500)

    } else {
      // Rolling Update
      addLog('info', '🔄 Rolling Update 開始')
      addLog('info', '① 逐步替換實例...')
      setInstances([1, 1, 1, 1])
      setV1Traffic(100)
      setV2Traffic(0)

      const steps = [
        { delay: 1200, inst: [2, 1, 1, 1], v1: 75, v2: 25, msg: '✓ Pod 1/4 已更新為 v2' },
        { delay: 2400, inst: [2, 2, 1, 1], v1: 50, v2: 50, msg: '✓ Pod 2/4 已更新為 v2' },
        { delay: 3600, inst: [2, 2, 2, 1], v1: 25, v2: 75, msg: '✓ Pod 3/4 已更新為 v2' },
        { delay: 4800, inst: [2, 2, 2, 2], v1: 0, v2: 100, msg: '✓ Pod 4/4 已更新為 v2' },
      ]

      steps.forEach((step, i) => {
        setTimeout(() => {
          setInstances(step.inst)
          setV1Traffic(step.v1)
          setV2Traffic(step.v2)
          addLog('success', step.msg)
          setDeployStep(i + 1)
        }, step.delay)
      })

      setTimeout(() => {
        addLog('success', '🎉 Rolling Update 完成！所有 Pod 已更新至 v2')
        setDeployPhase('done')
      }, 5500)
    }
  }, [strategy, triggerInteract, addLog])

  const rollback = useCallback(() => {
    triggerInteract()
    addLog('warning', '⚠️ 觸發 Rollback → 回滾至 v1')
    setInstances([1, 1, 1, 1])
    setV1Traffic(100)
    setV2Traffic(0)
    setDeployStep(0)

    setTimeout(() => {
      addLog('success', '✓ Rollback 完成，所有流量已切回 v1')
      setDeployPhase('idle')
    }, 1000)
  }, [triggerInteract, addLog])

  const resetDeploy = useCallback(() => {
    setInstances([1, 1, 1, 1])
    setV1Traffic(100)
    setV2Traffic(0)
    setDeployPhase('idle')
    setDeployStep(0)
    setLogs([])
  }, [])

  return (
    <div className="simulator-container devops-sim" id="devops-simulator">
      <div className="simulator-title">
        <span className="icon">⚙️</span>
        DevOps 模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="cicd" onChange={(t) => { setTab(t); resetPipeline(); resetDeploy() }} />

      {tab === 'cicd' ? (
        <>
          <div className="ha-desc">
            <strong>CI/CD Pipeline</strong>：每次 commit 觸發自動化流程 — Checkout → Build → Lint → Test → Security Scan → Deploy。
            任何階段失敗即中止 Pipeline，確保只有通過完整驗證的程式碼才會部署。
          </div>

          {/* Pipeline 視覺化 */}
          <div className="devops-pipeline">
            {stages.map((stage, index) => (
              <div key={stage.id}>
                {index > 0 && (
                  <span className={`devops-arrow ${stages[index - 1].status === 'success' ? 'active' : ''}`}>→</span>
                )}
                <div className={`devops-stage ${stage.status}`}>
                  <div className="devops-stage-icon">{stage.icon}</div>
                  <div className="devops-stage-name">{stage.name}</div>
                  <div className="devops-stage-status">
                    {stage.status === 'pending' && '等待中'}
                    {stage.status === 'running' && '執行中...'}
                    {stage.status === 'success' && '✓ 通過'}
                    {stage.status === 'failed' && '✗ 失敗'}
                    {stage.status === 'skipped' && '— 跳過'}
                  </div>
                  {stage.elapsed > 0 && (
                    <div className="devops-stage-time">{(stage.elapsed / 1000).toFixed(1)}s</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 設定 */}
          <div className="devops-config">
            <label>
              <input type="checkbox" checked={failOnTest} onChange={e => setFailOnTest(e.target.checked)} />
              模擬測試失敗
            </label>
            <label>
              <input type="checkbox" checked={skipSecurity} onChange={e => setSkipSecurity(e.target.checked)} />
              跳過 Security Scan
            </label>
          </div>

          {/* 控制按鈕 */}
          <div className="devops-controls">
            <button
              className="btn btn-primary"
              onClick={runPipeline}
              disabled={pipelineRunning}
            >
              {pipelineRunning ? '⏳ 執行中...' : '▶ 觸發 Pipeline'}
            </button>
            <button className="btn btn-ghost" onClick={resetPipeline}>重置</button>
            {pipelineResult && (
              <span style={{
                color: pipelineResult === 'success' ? 'var(--clr-success)' : 'var(--clr-error)',
                fontWeight: 600,
              }}>
                {pipelineResult === 'success' ? '✅ Pipeline 通過' : '❌ Pipeline 失敗'}
              </span>
            )}
          </div>

          {/* 統計 */}
          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{runCount}</div>
              <div className="sim-stat-label">執行次數</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>
                {stages.filter(s => s.status === 'success').length}
              </div>
              <div className="sim-stat-label">通過階段</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">
                {(stages.reduce((sum, s) => sum + s.elapsed, 0) / 1000).toFixed(1)}s
              </div>
              <div className="sim-stat-label">總耗時</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ha-desc">
            <strong>Deployment Strategy</strong>：選擇不同的部署策略，觀察 v1 → v2 的流量切換過程。
            Blue-Green 一次性切換；Canary 漸進式驗證；Rolling Update 逐步替換。
          </div>

          {/* 策略切換 */}
          <div className="deploy-strategy-switch">
            {[
              { id: 'blue-green', label: '🔵🟢 Blue-Green' },
              { id: 'canary', label: '🐦 Canary' },
              { id: 'rolling', label: '🔄 Rolling Update' },
            ].map(s => (
              <button
                key={s.id}
                className={`deploy-strategy-btn ${strategy === s.id ? 'active' : ''}`}
                onClick={() => { setStrategy(s.id); resetDeploy() }}
                disabled={deployPhase === 'deploying'}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 流量比例條 */}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-secondary)', marginBottom: 'var(--space-1)' }}>
            流量分配：<span style={{ color: 'var(--clr-info)' }}>v1 {v1Traffic}%</span> / <span style={{ color: 'var(--clr-success)' }}>v2 {v2Traffic}%</span>
          </div>
          <div className="deploy-traffic-bar">
            <div className="deploy-traffic-fill v1" style={{ width: `${v1Traffic}%` }} />
            <div className="deploy-traffic-fill v2" style={{ width: `${v2Traffic}%` }} />
          </div>

          {/* 實例視覺化 */}
          <div style={{ margin: 'var(--space-3) 0' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-2)' }}>
              Pod 實例狀態
            </div>
            <div className="deploy-instances">
              {instances.map((ver, i) => (
                <div key={i} className={`deploy-instance ${ver === 1 ? 'v1' : 'v2'}`}>
                  v{ver}
                </div>
              ))}
            </div>
          </div>

          {/* 控制按鈕 */}
          <div className="devops-controls">
            {deployPhase === 'idle' && (
              <button className="btn btn-primary" onClick={startDeploy}>🚀 開始部署 v2</button>
            )}
            {deployPhase === 'deploying' && (
              <button className="btn btn-primary" disabled>⏳ 部署中...</button>
            )}
            {deployPhase === 'done' && (
              <button className="btn btn-primary" onClick={rollback}>⏪ Rollback</button>
            )}
            <button className="btn btn-ghost" onClick={resetDeploy}>重置</button>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="devops-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
