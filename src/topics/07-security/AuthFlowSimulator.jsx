// OAuth2 / JWT 認證流程模擬器
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './AuthFlowSimulator.css'

const FLOWS = [
  { id: 'oauth2', label: 'OAuth2 Authorization Code' },
  { id: 'jwt', label: 'JWT Token 流程' },
]

/**
 * OAuth2 / JWT 認證流程模擬器
 * 分步驟視覺化認證流程
 */
export default function AuthFlowSimulator({ onInteract }) {
  const [flow, setFlow] = useState('oauth2')
  const [currentStep, setCurrentStep] = useState(0)
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

  // OAuth2 Authorization Code Flow 步驟
  const oauth2Steps = [
    {
      from: 'User', to: 'Client App', arrow: '→',
      label: '1. 使用者點擊「使用 Google 登入」',
      detail: 'Client 將使用者重導向到 Authorization Server',
      code: 'GET /authorize?response_type=code&client_id=APP_ID&redirect_uri=CALLBACK&scope=profile',
    },
    {
      from: 'Client App', to: 'Auth Server', arrow: '→',
      label: '2. 重導向到授權伺服器',
      detail: '使用者在 Authorization Server 登入並授權',
      code: 'HTTP 302 → https://accounts.google.com/o/oauth2/auth',
    },
    {
      from: 'Auth Server', to: 'User', arrow: '→',
      label: '3. 使用者登入並授權',
      detail: '使用者輸入帳號密碼並同意授權範圍',
      code: 'User grants access to: profile, email',
    },
    {
      from: 'Auth Server', to: 'Client App', arrow: '→',
      label: '4. 回傳 Authorization Code',
      detail: 'Authorization Server 將使用者重導向回 Client，並帶上 code',
      code: 'HTTP 302 → CALLBACK_URL?code=AUTH_CODE_abc123',
    },
    {
      from: 'Client App', to: 'Auth Server', arrow: '→',
      label: '5. 用 Code 換 Token',
      detail: 'Client 在後端用 code + client_secret 向 Authorization Server 換取 Access Token',
      code: 'POST /token { grant_type: "authorization_code", code: "AUTH_CODE_abc123", client_secret: "***" }',
    },
    {
      from: 'Auth Server', to: 'Client App', arrow: '→',
      label: '6. 回傳 Access Token + Refresh Token',
      detail: 'Authorization Server 驗證後回傳 Token（Access Token 短效、Refresh Token 長效）',
      code: '{ access_token: "eyJhbGc...", refresh_token: "dGhpcyB...", expires_in: 3600 }',
    },
    {
      from: 'Client App', to: 'Resource', arrow: '→',
      label: '7. 使用 Access Token 存取資源',
      detail: 'Client 帶 Token 存取受保護的 API',
      code: 'GET /api/user/profile  Authorization: Bearer eyJhbGc...',
    },
  ]

  // JWT Token 流程步驟
  const jwtSteps = [
    {
      from: 'User', to: 'Auth Server', arrow: '→',
      label: '1. 使用者提交帳號密碼',
      detail: 'Client 將登入資訊送到認證端點',
      code: 'POST /auth/login { username: "john", password: "***" }',
    },
    {
      from: 'Auth Server', to: 'Auth Server', arrow: '↻',
      label: '2. 驗證身份並簽發 JWT',
      detail: 'Server 驗證帳號密碼後，用 Private Key 簽署 JWT Token',
      code: 'JWT = base64(Header) + "." + base64(Payload) + "." + HMAC-SHA256(secret, header.payload)',
    },
    {
      from: 'Auth Server', to: 'Client App', arrow: '→',
      label: '3. 回傳 JWT Token',
      detail: 'Token 包含 Header（算法）+ Payload（使用者資料 + 過期時間）+ Signature（簽名）',
      code: '{ token: "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3MDk...}.signature" }',
    },
    {
      from: 'Client App', to: 'Client App', arrow: '↻',
      label: '4. Client 儲存 Token',
      detail: 'Token 儲存在 localStorage / Cookie (httpOnly) / Memory',
      code: 'localStorage.setItem("token", jwt) // ⚠️ 注意 XSS 風險',
    },
    {
      from: 'Client App', to: 'API Server', arrow: '→',
      label: '5. 帶 Token 存取 API',
      detail: '每次 API 請求都在 Header 中帶上 JWT Token',
      code: 'GET /api/orders  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...',
    },
    {
      from: 'API Server', to: 'API Server', arrow: '↻',
      label: '6. Server 驗證 Token',
      detail: 'Server 用 Secret Key 驗證簽名、檢查過期時間，不需查 DB',
      code: 'jwt.verify(token, SECRET_KEY) → { user_id: 1, role: "admin", exp: 1709... }',
    },
  ]

  const steps = flow === 'oauth2' ? oauth2Steps : jwtSteps

  // 下一步
  const nextStep = useCallback(() => {
    triggerInteract()
    if (currentStep < steps.length) {
      addLog('info', `${steps[currentStep].label}`)
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, steps, triggerInteract, addLog])

  // 自動播放全部
  const playAll = useCallback(() => {
    triggerInteract()
    setCurrentStep(0)
    setLogs([])
    let i = 0
    const play = () => {
      if (i < steps.length) {
        const step = steps[i]
        addLog('info', `${step.label}`)
        setCurrentStep(i + 1)
        i++
        setTimeout(play, 800)
      }
    }
    setTimeout(play, 200)
  }, [steps, triggerInteract, addLog])

  // 切換流程
  const handleFlowChange = useCallback((f) => {
    setFlow(f)
    setCurrentStep(0)
    setLogs([])
  }, [])

  return (
    <div className="simulator-container auth-sim" id="auth-simulator">
      <div className="simulator-title">
        <span className="icon">🔐</span>
        OAuth2 / JWT 認證流程模擬器
      </div>

      <TabGroup tabs={FLOWS} defaultTab="oauth2" onChange={handleFlowChange} />

      <div className="auth-desc">
        {flow === 'oauth2'
          ? 'OAuth2 Authorization Code Flow 是最安全的 OAuth2 流程，適用於有後端伺服器的應用。Authorization Code 只在後端通道交換 Token，避免 Token 暴露於瀏覽器。'
          : 'JWT（JSON Web Token）是一個自包含的 Token 格式。Server 不需要查 DB 就能驗證使用者身份，適合 Stateless 的微服務架構。但要注意無法主動撤銷（除非加入黑名單機制）。'
        }
      </div>

      {/* 步驟顯示 */}
      <div className="auth-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`auth-step ${i < currentStep ? 'completed' : ''} ${i === currentStep - 1 ? 'current' : ''}`}
          >
            <div className="auth-step-header">
              <span className="auth-step-num">{i + 1}</span>
              <span className="auth-step-actors">
                <span className="auth-actor">{step.from}</span>
                <span className="auth-step-arrow">{step.arrow}</span>
                <span className="auth-actor">{step.to}</span>
              </span>
            </div>
            <div className="auth-step-label">{step.label}</div>
            {i < currentStep && (
              <>
                <div className="auth-step-detail">{step.detail}</div>
                <code className="auth-step-code">{step.code}</code>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 控制按鈕 */}
      <div className="auth-controls">
        <button className="btn btn-primary" onClick={nextStep} disabled={currentStep >= steps.length} id="auth-next">
          {currentStep === 0 ? '▶️ 開始流程' : currentStep < steps.length ? `下一步 (${currentStep}/${steps.length})` : '✓ 流程結束'}
        </button>
        <button className="btn btn-ghost" onClick={playAll} id="auth-play">
          ⏩ 自動播放
        </button>
        <button className="btn btn-ghost" onClick={() => { setCurrentStep(0); setLogs([]) }} id="auth-reset">
          重置
        </button>
      </div>

      {/* 進度 */}
      <div className="auth-progress">
        <div className="auth-progress-bar">
          <div className="auth-progress-fill" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
        </div>
        <span className="auth-progress-text">{currentStep}/{steps.length}</span>
      </div>

      {/* 操作日誌 */}
      {logs.length > 0 && (
        <div className="sim-log" id="auth-log" style={{ marginTop: 'var(--space-4)' }}>
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
