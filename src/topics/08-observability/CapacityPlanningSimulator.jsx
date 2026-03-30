// 容量規劃模擬器 — Throughput / Storage / Back-of-Envelope 計算
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './CapacityPlanningSimulator.css'

const TABS = [
  { id: 'estimation', label: 'Back-of-Envelope' },
  { id: 'scaling', label: '水平擴展計算' },
]

/**
 * 容量規劃模擬器
 * 面試中最常見的 Back-of-Envelope Estimation
 */
export default function CapacityPlanningSimulator({ onInteract }) {
  const [tab, setTab] = useState('estimation')

  // Back-of-Envelope 參數
  const [dau, setDau] = useState(10) // 百萬 DAU
  const [avgRequestsPerUser, setAvgRequestsPerUser] = useState(10)
  const [avgPayloadKB, setAvgPayloadKB] = useState(5)
  const [readWriteRatio, setReadWriteRatio] = useState(10)
  const [retentionYears, setRetentionYears] = useState(5)

  // 擴展計算
  const [targetQPS, setTargetQPS] = useState(50000)
  const [singleServerQPS, setSingleServerQPS] = useState(1000)
  const [replicationFactor, setReplicationFactor] = useState(3)

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

  // 計算 Back-of-Envelope
  const totalDailyRequests = dau * 1e6 * avgRequestsPerUser
  const avgQPS = Math.floor(totalDailyRequests / 86400)
  const peakQPS = avgQPS * 3
  const dailyStorageGB = (totalDailyRequests * avgPayloadKB) / (1024 * 1024)
  const yearlyStorageTB = (dailyStorageGB * 365) / 1024
  const totalStorageTB = yearlyStorageTB * retentionYears
  const writeQPS = Math.floor(avgQPS / (readWriteRatio + 1))
  const readQPS = avgQPS - writeQPS
  const dailyBandwidthGBps = (avgQPS * avgPayloadKB) / (1024 * 1024)

  // 擴展計算
  const requiredServers = Math.ceil(targetQPS / singleServerQPS)
  const withReplication = requiredServers * replicationFactor
  const utilizationTarget = 0.7
  const withHeadroom = Math.ceil(withReplication / utilizationTarget)

  const runEstimation = useCallback(() => {
    triggerInteract()
    setLogs([])
    addLog('info', `📊 Back-of-Envelope Estimation 結果：`)
    addLog('info', `  DAU: ${dau}M users × ${avgRequestsPerUser} req/user = ${(totalDailyRequests / 1e6).toFixed(0)}M req/day`)
    addLog('info', `  Avg QPS: ${avgQPS.toLocaleString()} | Peak QPS: ${peakQPS.toLocaleString()} (×3)`)
    addLog('info', `  Read QPS: ${readQPS.toLocaleString()} | Write QPS: ${writeQPS.toLocaleString()} (${readWriteRatio}:1)`)
    addLog('info', `  Daily Storage: ${dailyStorageGB.toFixed(1)} GB`)
    addLog('info', `  ${retentionYears}yr Storage: ${totalStorageTB.toFixed(1)} TB`)
    addLog('info', `  Bandwidth: ${dailyBandwidthGBps.toFixed(2)} GB/s`)
  }, [dau, avgRequestsPerUser, totalDailyRequests, avgQPS, peakQPS, readQPS, writeQPS, readWriteRatio, dailyStorageGB, retentionYears, totalStorageTB, dailyBandwidthGBps, triggerInteract, addLog])

  return (
    <div className="simulator-container cap-plan-sim" id="capacity-planning-simulator">
      <div className="simulator-title">
        <span className="icon">📐</span>
        容量規劃模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="estimation" onChange={(t) => { setTab(t); setLogs([]) }} />

      {tab === 'estimation' ? (
        <>
          <div className="cap-desc">
            <strong>Back-of-Envelope Estimation</strong>：系統設計面試的必考技能。
            快速估算 QPS、儲存量、頻寬需求，用以判斷架構是否可行。
          </div>

          {/* 輸入參數 */}
          <div className="cap-inputs">
            <div className="cap-input-group">
              <label>DAU（百萬）</label>
              <input type="range" min="1" max="500" value={dau} onChange={(e) => setDau(Number(e.target.value))} />
              <span className="cap-input-val">{dau}M</span>
            </div>
            <div className="cap-input-group">
              <label>每用戶日均請求</label>
              <input type="range" min="1" max="100" value={avgRequestsPerUser} onChange={(e) => setAvgRequestsPerUser(Number(e.target.value))} />
              <span className="cap-input-val">{avgRequestsPerUser}</span>
            </div>
            <div className="cap-input-group">
              <label>平均 Payload (KB)</label>
              <input type="range" min="1" max="100" value={avgPayloadKB} onChange={(e) => setAvgPayloadKB(Number(e.target.value))} />
              <span className="cap-input-val">{avgPayloadKB}KB</span>
            </div>
            <div className="cap-input-group">
              <label>讀寫比</label>
              <input type="range" min="1" max="100" value={readWriteRatio} onChange={(e) => setReadWriteRatio(Number(e.target.value))} />
              <span className="cap-input-val">{readWriteRatio}:1</span>
            </div>
            <div className="cap-input-group">
              <label>資料保留（年）</label>
              <input type="range" min="1" max="10" value={retentionYears} onChange={(e) => setRetentionYears(Number(e.target.value))} />
              <span className="cap-input-val">{retentionYears}yr</span>
            </div>
          </div>

          {/* 結果面板 */}
          <div className="sim-stats" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{avgQPS.toLocaleString()}</div>
              <div className="sim-stat-label">Avg QPS</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-warning)' }}>{peakQPS.toLocaleString()}</div>
              <div className="sim-stat-label">Peak QPS (×3)</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{dailyStorageGB.toFixed(0)}GB</div>
              <div className="sim-stat-label">日儲存量</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{totalStorageTB.toFixed(1)}TB</div>
              <div className="sim-stat-label">{retentionYears}年總儲存</div>
            </div>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-success)' }}>{readQPS.toLocaleString()}</div>
              <div className="sim-stat-label">Read QPS</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-info)' }}>{writeQPS.toLocaleString()}</div>
              <div className="sim-stat-label">Write QPS</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{dailyBandwidthGBps.toFixed(2)}</div>
              <div className="sim-stat-label">GB/s 頻寬</div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn btn-primary" onClick={runEstimation}>📊 輸出估算報告</button>
          </div>
        </>
      ) : (
        <>
          <div className="cap-desc">
            <strong>水平擴展計算</strong>：根據目標 QPS，計算需要多少台伺服器。
            考慮 Replication Factor 和預留容量（建議 70% 利用率上限）。
          </div>

          <div className="cap-inputs">
            <div className="cap-input-group">
              <label>目標 QPS</label>
              <input type="range" min="1000" max="500000" step="1000" value={targetQPS} onChange={(e) => setTargetQPS(Number(e.target.value))} />
              <span className="cap-input-val">{targetQPS.toLocaleString()}</span>
            </div>
            <div className="cap-input-group">
              <label>單機 QPS</label>
              <input type="range" min="100" max="10000" step="100" value={singleServerQPS} onChange={(e) => setSingleServerQPS(Number(e.target.value))} />
              <span className="cap-input-val">{singleServerQPS.toLocaleString()}</span>
            </div>
            <div className="cap-input-group">
              <label>Replication Factor</label>
              <input type="range" min="1" max="5" value={replicationFactor} onChange={(e) => setReplicationFactor(Number(e.target.value))} />
              <span className="cap-input-val">{replicationFactor}</span>
            </div>
          </div>

          <div className="cap-scale-result">
            <div className="cap-scale-step">
              <span className="cap-step-num">1</span>
              <span>基礎伺服器: {targetQPS.toLocaleString()} ÷ {singleServerQPS.toLocaleString()} = <strong>{requiredServers}</strong> 台</span>
            </div>
            <div className="cap-scale-step">
              <span className="cap-step-num">2</span>
              <span>含副本: {requiredServers} × {replicationFactor} = <strong>{withReplication}</strong> 台</span>
            </div>
            <div className="cap-scale-step">
              <span className="cap-step-num">3</span>
              <span>含預留 (70% 利用率): {withReplication} ÷ 0.7 ≈ <strong>{withHeadroom}</strong> 台</span>
            </div>
          </div>

          <div className="sim-stats">
            <div className="sim-stat-card">
              <div className="sim-stat-value">{requiredServers}</div>
              <div className="sim-stat-label">基礎伺服器</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value">{withReplication}</div>
              <div className="sim-stat-label">含副本</div>
            </div>
            <div className="sim-stat-card">
              <div className="sim-stat-value" style={{ color: 'var(--clr-info)' }}>{withHeadroom}</div>
              <div className="sim-stat-label">建議部署</div>
            </div>
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="cap-planning-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
