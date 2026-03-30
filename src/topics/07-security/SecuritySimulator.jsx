// 安全漏洞模擬器 — OWASP Top 10 互動演示
import { useState, useCallback, useRef } from 'react'
import './SecuritySimulator.css'

const VULNERABILITIES = [
  {
    id: 'sqli',
    name: 'SQL Injection',
    rank: 'A03:2021',
    desc: '攻擊者在輸入中注入 SQL 語法，繞過驗證或竊取資料。',
    safeInput: 'alice',
    dangerousInput: "' OR 1=1 --",
    safeQuery: "SELECT * FROM users WHERE username = 'alice'",
    dangerousQuery: "SELECT * FROM users WHERE username = '' OR 1=1 --'",
    safeResult: '✓ 回傳 alice 的資料（1 筆）',
    dangerousResult: '❌ 回傳所有使用者資料！攻擊成功',
    fix: '使用 Parameterized Query / Prepared Statement',
    fixCode: "db.query('SELECT * FROM users WHERE username = $1', [input])",
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    rank: 'A03:2021',
    desc: '攻擊者注入惡意 script，在其他使用者的瀏覽器中執行。',
    safeInput: '正常留言內容',
    dangerousInput: '<script>document.cookie</script>',
    safeQuery: '渲染: "正常留言內容"',
    dangerousQuery: '渲染: <script>document.cookie</script>',
    safeResult: '✓ 正常顯示文字',
    dangerousResult: '❌ Script 被執行！Cookie 被竊取',
    fix: '輸出時進行 HTML Escape / 使用 CSP',
    fixCode: "const safe = DOMPurify.sanitize(userInput)",
  },
  {
    id: 'broken-auth',
    name: 'Broken Authentication',
    rank: 'A07:2021',
    desc: '身份驗證機制有缺陷，允許暴力破解或 Session 劫持。',
    safeInput: 'password123（嘗試 1/5）',
    dangerousInput: '自動嘗試 10000 組密碼',
    safeQuery: 'POST /login { username: "admin", password: "password123" }',
    dangerousQuery: 'for i in range(10000): POST /login { password: wordlist[i] }',
    safeResult: '✓ 嘗試 5 次後帳號鎖定',
    dangerousResult: '❌ 無限制嘗試 → 第 847 次密碼正確！',
    fix: 'Rate Limiting + 帳號鎖定 + MFA',
    fixCode: "if (failedAttempts >= 5) lockAccount(userId, duration='30m')",
  },
  {
    id: 'idor',
    name: 'Insecure Direct Object Reference',
    rank: 'A01:2021',
    desc: '使用者透過修改 URL 參數存取其他使用者的資源。',
    safeInput: 'GET /api/orders/123（自己的訂單）',
    dangerousInput: 'GET /api/orders/456（別人的訂單）',
    safeQuery: 'SELECT * FROM orders WHERE id = 123 AND user_id = current_user',
    dangerousQuery: 'SELECT * FROM orders WHERE id = 456',
    safeResult: '✓ 驗證擁有權後回傳',
    dangerousResult: '❌ 未驗證擁有權 → 看到別人的訂單！',
    fix: '始終驗證資源擁有權（Authorization Check）',
    fixCode: "if (order.userId !== req.user.id) return 403 Forbidden",
  },
]

/**
 * 安全漏洞模擬器
 * 互動式展示常見安全漏洞與對應修復方式
 */
export default function SecuritySimulator({ onInteract }) {
  const [selectedVuln, setSelectedVuln] = useState(VULNERABILITIES[0])
  const [attackMode, setAttackMode] = useState(false)
  const [showFix, setShowFix] = useState(false)
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
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 15))
  }, [])

  const simulateAttack = useCallback((isAttack) => {
    triggerInteract()
    setAttackMode(isAttack)
    setShowFix(false)
    if (isAttack) {
      addLog('error', `🔴 攻擊模式：${selectedVuln.name}`)
      addLog('info', `  輸入: ${selectedVuln.dangerousInput}`)
      addLog('warning', `  Query: ${selectedVuln.dangerousQuery}`)
      addLog('error', `  結果: ${selectedVuln.dangerousResult}`)
    } else {
      addLog('success', `🟢 正常模式：${selectedVuln.name}`)
      addLog('info', `  輸入: ${selectedVuln.safeInput}`)
      addLog('info', `  Query: ${selectedVuln.safeQuery}`)
      addLog('success', `  結果: ${selectedVuln.safeResult}`)
    }
  }, [selectedVuln, triggerInteract, addLog])

  return (
    <div className="simulator-container sec-sim" id="security-simulator">
      <div className="simulator-title">
        <span className="icon">🛡️</span>
        安全漏洞模擬器
      </div>

      <div className="sec-desc">
        互動演示 OWASP Top 10 常見安全漏洞。選擇漏洞類型，比較正常請求與攻擊請求的差異，學習對應的防禦策略。
      </div>

      {/* 漏洞選擇 */}
      <div className="sec-vuln-list">
        {VULNERABILITIES.map(vuln => (
          <button
            key={vuln.id}
            className={`sec-vuln-btn ${selectedVuln.id === vuln.id ? 'active' : ''}`}
            onClick={() => { setSelectedVuln(vuln); setAttackMode(false); setShowFix(false); setLogs([]) }}
          >
            <span className="sec-vuln-rank">{vuln.rank}</span>
            <span className="sec-vuln-name">{vuln.name}</span>
          </button>
        ))}
      </div>

      {/* 漏洞詳情 */}
      <div className="sec-detail">
        <h4 className="sec-detail-title">{selectedVuln.name}</h4>
        <p className="sec-detail-desc">{selectedVuln.desc}</p>

        {/* 正常 vs 攻擊 對比 */}
        <div className="sec-comparison">
          <div className={`sec-scenario safe ${!attackMode ? 'active' : ''}`} onClick={() => simulateAttack(false)}>
            <div className="sec-scenario-header">🟢 正常請求</div>
            <div className="sec-scenario-input">{selectedVuln.safeInput}</div>
            <code className="sec-scenario-query">{selectedVuln.safeQuery}</code>
            <div className="sec-scenario-result">{selectedVuln.safeResult}</div>
          </div>

          <div className={`sec-scenario danger ${attackMode ? 'active' : ''}`} onClick={() => simulateAttack(true)}>
            <div className="sec-scenario-header">🔴 攻擊請求</div>
            <div className="sec-scenario-input">{selectedVuln.dangerousInput}</div>
            <code className="sec-scenario-query">{selectedVuln.dangerousQuery}</code>
            <div className="sec-scenario-result">{selectedVuln.dangerousResult}</div>
          </div>
        </div>

        {/* 修復方式 */}
        <button className="btn btn-primary" onClick={() => { setShowFix(!showFix); triggerInteract() }} style={{ marginTop: 'var(--space-4)' }}>
          {showFix ? '隱藏修復方式' : '🔧 查看修復方式'}
        </button>

        {showFix && (
          <div className="sec-fix">
            <div className="sec-fix-title">✅ {selectedVuln.fix}</div>
            <code className="sec-fix-code">{selectedVuln.fixCode}</code>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="sim-log" id="security-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
