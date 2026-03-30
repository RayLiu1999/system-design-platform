export const security = {
  auth: {
    concepts: [
      {
        title: "JWT（JSON Web Token）與權限撤銷困境",
        text: "JWT 無狀態設計減少了 DB 壓力。資深視角：JWT 的最大痛點是『不可撤銷性』。如果 Token 洩露，在過期前它永遠有效。解決方案：(1) 短效 Access Token (15m) + 長效 Refresh Token (7d)；(2) Redis 黑名單（記錄被撤銷的 jti）；(3) 搭配版本號或資料庫 `last_password_change` 欄位進行校驗。",
      },
      {
        title: "OAuth 2.0 與 OIDC（OpenID Connect）",
        text: "OAuth 2.0 是授權協議（拿 Token），OIDC 是身份層（確認你是誰）。資深視角：OIDC 引入了 ID Token（JWT 格式），解決了 OAuth 2.0 無法標準化獲取用戶資訊的問題。在 SPA 中應強制使用『Authorization Code + PKCE』模式，徹底棄用不安全的 Implicit Flow。",
      },
      {
        title: "微服務鑑權架構：中心化 vs 去中心化",
        text: "中心化：所有請求穿過 Auth-Service 驗證，延遲高。去中心化：API Gateway 驗證 JWT，隨後將 User-Info 放入 Header 傳給下游。資深視角：生產環境通常採用『混合模式』。Gateway 處理 Token 有效性，下游服務透過 AOP 攔截器處理業務層級的『數據權限（ABAC）』。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計一個支援百萬用戶的企業級單一登入 (SSO) 系統",
        text: "架構：選用 OIDC 標準. 流程：(1) Client 導向 SSO Domain；(2) SSO 驗證身份後發 Code；(3) Client 換取 Token。關鍵：(1) Session 共享於 SSO 下多網域（Cookie Domain 設定）；(2) 支援第三方登入 (Google/GitHub) 的權限映射；(3) 提供 Token Introspection 端點供內部服務校驗。",
      },
      {
        type: "practice",
        title: "實作 JWT Token Rotation（滾動更新）防止竊取",
        text: "方案：當 Refresh Token 被使用來換取新 Access Token 時，同時替換掉舊的 Refresh Token。DB 紀錄 `(user_id, refresh_token_family_id, current_token)`。如果舊的 Refresh Token 被再次使用，代表發生了 Token 竊取，立即失效該用戶的所有 Session。這是一種主動的安全防禦機制。",
      },
    ],
    interview: [
      {
        question: "JWT 被盜了怎麼辦？有哪些應對手段？",
        answer:
          "(1) 設定極短的過期時間（10-15 分鐘）；(2) 使用 HTTPS 防止中間人攻擊；(3) 在 Redis 維護一組黑名單，記錄異常的 Token ID；(4) 方案升級：使用 Refresh Token Rotation。如果安全等級極高，就不該使用純無狀態 JWT，應回歸到有狀態的 Session 或加密的 Cookie。",
        keywords: ["Token Blacklist", "Short TTL", "Refresh Token Rotation"],
      },
      {
        question: "OAuth 2.0 的 PKCE 擴充解決了什麼問題？",
        answer:
          "PKCE（Proof Key for Code Exchange）解決了公有客戶端（如手機 App、SPA）無法安全儲存 Client Secret 的問題。它透過產生一個動態的 Code Verifier 和 Challenge，確保即使授權碼 (Code) 被截獲，攻擊者也因為沒有原始 Verifier 而無法換取 Token。現在 PKCE 已成為所有 OAuth2 流程的推薦標準。",
        keywords: ["Authorization Code Interception", "Code Challenge", "SPA Security"],
      },
    ],
  },
  "security-vulnerabilities": {
    concepts: [
      {
        title: "IDOR（不安全的直接物件引用）",
        text: "攻擊者修改 URL 參數（如 `/api/user/100` 改為 `/101`）獲取他人數據。資深視角：這是邏輯漏洞。防禦不能只靠混淆 ID（UUID），必須在 Service 層驗證請求者是否有權訪問該對象：`if (order.userId != currentUser.id) throw Forbidden`。這就是縱深防禦（Defense in Depth）。",
      },
      {
        title: "SSRF（伺服器端請求偽造）",
        text: "攻擊者誘導伺服器訪問內部 IP（如 `http://169.254.169.254` 獲取 AWS Metadata）。防禦：(1) 限制協議只能是 HTTP/HTTPS；(2) 設置 IP 白名單，禁止訪問私有網段和 localhost；(3) 嚴格過濾 URL 重定向。在圖片代理、Webhook 系統中特別危險。",
      },
      {
        title: "供應鏈攻擊與依賴檢查",
        text: "資深視角：代碼安全不只在於你寫的，更在於你引入的。防禦：(1) 使用 `npm audit` 或 Snyk 定期掃描漏洞；(2) 使用 Lock file 鎖定版本；(3) 限制內部 Maven/NPM 倉庫。Log4j 漏洞（Log4Shell）就是典型的第三方依賴安全事故。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "修復一個因 SSRF 造成的雲端憑證洩露漏洞",
        text: "背景：某服務支援用戶輸入圖片 URL 進行縮圖處理。攻擊者輸入 `http://localhost:8080/admin` 探測內網。修復：(1) 建立 DNS 檢查機制（不要只看 IP，要防止 DNS Rebinding）；(2) 在網路層設定 Egress 規則，限制伺服器只能向外網發送請求；(3) 使用隔離的 Sandbox Proxy 處理外部請求。",
      },
    ],
    interview: [
      {
        question: "如何防禦 XSS 攻擊？",
        answer:
          "(1) 輸出轉義：將 `<` 轉為 `&lt;`，永遠不要信任 InnerHTML；(2) 使用現代框架：React/Vue 預設會轉義數據；(3) 設定 CSP（Content Security Policy）Header，限制腳本載入來源；(4) 為敏感 Cookie 加上 HttpOnly 屬性，防止 JS 讀取。防禦核心是：輸入過濾 + 輸出轉義 + 瀏覽器安全鎖。",
        keywords: ["Escaping", "CSP", "HttpOnly", "Sanitization"],
      },
      {
        question: "什麼是 IDOR？如何系統性地預防？",
        answer:
          "IDOR 是權限校驗缺失導致的橫向越權。預防：(1) 在每條查詢 SQL 或 Repository 調用時，強制帶上權限條件（如 `WHERE user_id = ?`）；(2) 使用不可預測的 ID（UUID 或 HashID）；(3) 導入 AOP 或權限框架（如 Spring Security）對 Resource 進行 ACL 校驗。核心是『默認拒絕』與『基於主體的訪問控制』。",
        keywords: ["橫向越權", "UUID", "ACL", "數據隔離"],
      },
    ],
  },
  "rate-limiting": {
    concepts: [
      {
        title: "自適應限流（Adaptive Throttling）",
        text: "傳統限流設定固定閾值，難以適應波動。資深視角：Google SRE 推薦根據服務健康度動態計算限流比例。公式：`P = max(0, (Requests - K * Accepts) / (Requests + 1))`。當後端成功率下降，限流比例自動上升。這比固定閾值更能保護冷啟動中的服務。",
      },
      {
        title: "漏桶（Leaky Bucket）為噴泉平滑延遲",
        text: "Leaky Bucket 強制以恆定速率流出，適合需要『絕對平滑』請求間隔的場景（如銀行結算）。資深視角：它不允許突發流量。與 Token Bucket 相比，它更注重對下游服務的保護，缺點是可能會導致請求在 Queue 中等待過久而超時。",
      },
      {
        title: "DDoS 縱深防禦架構",
        text: "(1) 第 7 層：WAF 指紋分析 + 人機檢驗；(2) 第 4 層：BGP 流量清洗 + Anycast 路由分離；(3) 邊緣層：CDN 負載分餾。資深設計：必須結合自定義業務規則（如單個用戶每秒交易數）與通用網路過濾，才能應對從 CC 攻擊到 SYN Flood 的全方位威脅。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "在大規模多租戶平台實作『分級限流』",
        text: "需求：免費帳戶 100 QPS，付費帳戶 1000 QPS。方案：(1) 請求帶 API-Key；(2) Redis Lua 腳本：`key = \"limit:\" .. tier .. \":\" .. apiKey`; `count = INCR(key)`... 若超限則回傳 429。關鍵：使用 Redis Pipeline 或 Redis Cluster 避免單點性能瓶頸，並設計超限後的 Retry-After Header。",
      },
    ],
    interview: [
      {
        question: "Token Bucket 和 Leaky Bucket 的主要差異是什麼？",
        answer:
          "Token Bucket 允許一定程度的『突發流量』（Burst），只要桶裡有 Token 就能執行。Leaky Bucket 則是強制平滑輸出速度，不論流入多快，流出速率恆定。API Gateway 多用 Token Bucket 以因應網路波動，後台處理敏感業務（如匯款）多用 Leaky Bucket。",
        keywords: ["Burstiness", "Smoothing", "Bucket Capacity"],
      },
      {
        question: "分散式限流中，Redis 掛了怎麼辦？",
        answer:
          "這涉及到限流的『可用性』。方案：(1) 降級回本地限流（Local Rate Limiting），雖然不精確但能保護節點；(2) 故障直接放行（Fail-Open）並告警，保護業務連續性；(3) 使用 Sentinel 等高可用架構。資深做法是：限流不應成為系統的單點故障（SPF），應具備 Fail-Safe 機制。",
        keywords: ["Fail-Open", "Local Fallback", "High Availability"],
      },
    ],
  },
};
