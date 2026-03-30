export const api = {
  "api-design": {
    concepts: [
      {
        title: "REST vs gRPC vs GraphQL 的真實選型",
        text: "大型平台通常混用三者：對外 Public API 用 REST（生態成熟、Browser 友好），BFF 用 GraphQL（前端彈性查詢、減少 Round Trip），內部微服務間用 gRPC（Protobuf 比 JSON 快 5-10 倍、強類型、雙向 Streaming）。踩坑：gRPC 不能被瀏覽器直接呼叫（需 gRPC-Web）；GraphQL 的 N+1 需要 DataLoader；REST 的 Endpoint 爆炸需要 API Gateway 治理。",
      },
      {
        title: "API Gateway 的職責邊界",
        text: "API Gateway 做什麼：認證（JWT 驗證）、限流、路由、協議轉換（REST → gRPC）、日誌監控。不該做什麼：業務邏輯、資料轉換、Join 多個服務的資料（這是 BFF 的職責）。常見架構：Kong / AWS API Gateway → BFF → 微服務。踩坑：API Gateway 本身成為單點瓶頸 — 需水平擴展 + 健康檢查。",
      },
      {
        title: "冪等性的生產實踐",
        text: "Stripe 的做法：(1) 客戶端 Header 帶 Idempotency-Key（UUID）；(2) 服務端第一次正常處理，Key + Response 存 Redis（TTL 24h）；(3) 重複請求直接回傳快取 Response。進階問題：第一次請求處理到一半伺服器掛了怎麼辦？需要 DB Transaction + Status Flag（PENDING → COMPLETED）保證原子性。冪等不只是「去重」，而是保證「重複執行的結果和副作用完全一致」。",
      },
      {
        title: "API 向後相容設計",
        text: "安全的變更：新增欄位（用 optional）、新增 Endpoint。不安全的變更：刪除欄位、改類型、改語義。策略：(1) URL 版本化（/v1 → /v2）+ 舊版本並行支援 6-12 個月；(2) Deprecation Header 提前通知；(3) Protobuf 天然支援向後相容（只新增 Field，不重用 Number）。Google API 原則：Field 標記 deprecated 但永不刪除。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計高併發搶票 API（保證不超賣）",
        text: "架構：(1) 削峰 — 前端驗證碼 + Queue Page，控制進入後端的量；(2) Redis DECR 原子操作做庫存預扣（比 DB 行鎖快 100 倍）；(3) 成功扣減的進入 Kafka 非同步下單（MySQL INSERT）；(4) 失敗則 INCR 歸還庫存；(5) 未付款訂單 TTL 到期自動釋放。超賣防護最後一道牆：DB 的 CHECK(stock >= 0) 約束。",
      },
      {
        type: "practice",
        title: "Protobuf Schema 變更導致下游全部報錯",
        text: "根因：刪除了 Field 或改了 Field Number/Type，破壞了向後相容。防護：(1) CI Pipeline 加 buf lint / buf breaking 自動檢查；(2) Proto 規範 — 只新增 Field，用 reserved 標記廢棄 Number；(3) 灰度發布新版 Server 先不切流，驗證 Proto 相容後再切；(4) Schema Registry 集中管理發布前驗證。",
      },
      {
        type: "practice",
        title: "支付 API 重複扣款問題",
        text: "根因：客戶端超時 Retry，伺服端收到兩次請求。四層防護：(1) API 層 — Idempotency-Key + Redis SETNX 去重；(2) DB 層 — UNIQUE INDEX on (payment_id, merchant_id)；(3) 狀態機 — 只有 INIT 可發起扣款（INIT → PENDING → SUCCESS）；(4) 對帳 — 定時和支付閘道對帳，重複扣款自動退款。",
      },
    ],
    interview: [
      {
        question: "REST、gRPC、GraphQL 如何選型？",
        answer:
          "REST：對外 API、Browser 直接呼叫、需要 HTTP 快取。gRPC：微服務間高頻通訊、雙向 Streaming、延遲敏感。GraphQL：前端需求多變、彈性查詢。大型系統混用：對外 REST/GraphQL，內部 gRPC。踩坑：gRPC 不能被瀏覽器直連（需 gRPC-Web），GraphQL 的 N+1 需 DataLoader 解決。",
        keywords: ["REST", "gRPC", "GraphQL", "BFF"],
      },
      {
        question: "你的支付 API 偶爾出現重複扣款，如何根本解決？",
        answer:
          "四層防護：(1) API 層 — Idempotency-Key + Redis SETNX 去重；(2) DB 層 — UNIQUE INDEX 兜底；(3) 狀態機 — INIT → PENDING → SUCCESS，只有 INIT 可發起扣款；(4) 對帳機制 — 定時 and 支付閘道核帳自動退款。缺一不可。",
        keywords: ["Idempotency-Key", "唯一約束", "狀態機", "對帳"],
      },
      {
        question: "如何設計高併發搶票 API 保證不超賣？",
        answer:
          "Redis DECR 做庫存預扣（10 萬+ QPS），成功的進入 Kafka 非同步建立訂單，失敗 INCR 歸還。前端驗證碼 + Queue Page 削峰。未付款訂單 TTL 到期釋放庫存。最後一道牆：DB CHECK(stock >= 0)。壓力在 Redis 而非 MySQL。",
        keywords: ["Redis DECR", "非同步下單", "庫存預扣", "超時釋放"],
      },
    ],
  },
  "load-balancing": {
    concepts: [
      {
        title: "L4 vs L7 負載均衡",
        text: "L4（傳輸層）基於 IP/Port 轉發，效能高但無法感知應用層內容。L7（應用層）基於 HTTP Header/URL/Cookie 路由，可做 A/B Testing、Canary 灰度、WebSocket 升級。典型架構：Internet → GeoDNS → L4(NLB) → L7(ALB/Nginx) → 應用服務。Nginx 實測單機 5 萬+ RPS（L7），DPDK 方案可達百萬級（L4）。",
      },
      {
        title: "WebSocket 的負載均衡挑戰",
        text: "WebSocket 是長連接，傳統的 Round Robin 會導致連線不均衡（先上線的節點連線數遠超新節點）。解決方案：(1) Least Connections 作為 LB 算法；(2) 連線數上限告警 + Connection Draining；(3) 用 Redis Pub/Sub 做跨節點訊息廣播，解耦「連線在哪個節點」和「訊息發給誰」。",
      },
      {
        title: "Connection Draining 與 Graceful Shutdown",
        text: "滾動部署時直接殺進程 = 斷開所有用戶連線。正確做法：(1) 從 LB 摘除節點（不再接新流量）；(2) 等待現有請求完成（Draining Period，通常 30 秒）；(3) 關閉進程。Kubernetes 的 preStop Hook + terminationGracePeriodSeconds 就是做這件事。WebSocket 場景需要更長的 Draining 時間。",
      },
      {
        title: "Zone-Aware Routing 與 Thundering Herd",
        text: "跨可用區（AZ）的流量產生額外延遲和費用。Zone-Aware Routing 優先路由到同 AZ 的實例。隱藏風險：當一個 AZ 的實例不足時，流量 Spillover 到其他 AZ，瞬間暴增的跨區流量可能觸發 Thundering Herd（雷群效應）。防護：設定 Spillover 上限 + 漸進式 Failover。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計支撐 100 萬 WebSocket 長連接的即時通訊系統",
        text: "架構：L4 LB（NLB）→ WebSocket Gateway（Least Connections）→ Redis Pub/Sub 跨節點廣播。單機 C10K 不可行。每台 Gateway 服務 ~5 萬連線，需 20+ 節點。關鍵設計：(1) 用 Redis Pub/Sub 解耦連線和訊息路由；(2) Connection Draining 30s 做滾動部署；(3) 心跳機制偵測殭屍連線；(4) 水平擴展只需新增 Gateway 節點。",
      },
      {
        type: "practice",
        title: "LB 升級滾動部署導致用戶閃斷",
        text: "根因：直接殺掉舊服務進程，活躍連線被強制斷開。修復 SOP：(1) K8s preStop Hook 先從 Service 中摘除 Pod；(2) SIGTERM handler 停止接收新連線、通知客戶端重連其他節點；(3) terminationGracePeriodSeconds 設 60s 等待現有請求完成；(4) 客戶端實作 Exponential Backoff 重連。",
      },
      {
        type: "practice",
        title: "單一 AZ 故障後全域流量傾斜",
        text: "問題：3 個 AZ 各部署 10 台，Zone-Aware Routing 正常時流量均分。AZ-A 掛了， 30% 流量湧入 AZ-B 和 AZ-C，瞬間負載從 33% 飆到 50%+。防護：(1) 每 AZ 預留 30% 冗餘（利用率上限 70%）；(2) 設定 LB 的 Cross-Zone 漸進式 Spillover；(3) Auto Scaling 以 CPU 為信號快速擴展。",
      },
    ],
    interview: [
      {
        question: "L4 和 L7 負載均衡的差異？如何選擇？",
        answer:
          "L4 工作在 TCP/UDP 層，速度快（DPDK 方案百萬 RPS）但無法感知請求內容。L7 工作在 HTTP 層，能根據 URL/Header/Cookie 做路由、Canary、SSL 終止，但效能較低。通常分層：L4 做前端入口分發（NLB），L7 做應用層路由（ALB/Nginx）。WebSocket 要在 L7 做 Upgrade。",
        keywords: ["L4/L7", "SSL Termination", "Canary Routing", "WebSocket"],
      },
      {
        question: "滾動部署時如何避免用戶閃斷？",
        answer:
          "Connection Draining：(1) 從 LB 摘除節點（不接新流量）；(2) 等待現有請求完成；(3) 關閉進程。K8s 用 preStop Hook + terminationGracePeriodSeconds。WebSocket 場景需通知客戶端重連其他節點 + Exponential Backoff。",
        keywords: ["Connection Draining", "Graceful Shutdown", "preStop", "重連機制"],
      },
      {
        question: "如何處理 Session 一致性問題？",
        answer:
          "方案：(1) Sticky Session（IP Hash）— 簡單但不均衡、擴展差；(2) Session 外部化 Redis — 推薦，伺服器完全無狀態；(3) JWT Token — 無需 Session，但 Token 體積和撤銷問題。最佳實踐：Session 外部化 + Stateless 架構，配合 JWT 短期 Token 處理認證。",
        keywords: ["Sticky Session", "Redis Session", "JWT", "Stateless"],
      },
    ],
  },
  "cdn-proxy": {
    concepts: [
      {
        title: "CDN 架構與 Origin Shield",
        text: "CDN 的三層快取：Browser Cache → Edge Node Cache → Origin Shield Cache → Origin Server。Origin Shield 是 CDN 的中間層（Mid-Tier Cache），全球所有 Edge Node 回源先經過 Shield，大幅減少 Origin 壓力。CloudFront Origin Shield 可減少 80%+ 的回源請求。適合全球化應用，Origin 只需部署在一個 Region。",
      },
      {
        title: "Edge Computing — 超越靜態快取",
        text: "Cloudflare Workers / AWS Lambda@Edge 讓你在 CDN 邊緣執行 JavaScript，實現：(1) A/B Testing — 在邊緣改寫 HTML，不需要回源；(2) 認證驗證 — JWT 驗證在邊緣完成，無效請求不會到 Origin；(3) 個性化內容 — 根據地理位置返回不同貨幣/語言。邊緣計算把延遲從 200ms+ 降到 10ms 級別。",
      },
      {
        title: "Nginx 生產級調優",
        text: "worker_processes auto（跟 CPU Core 對齊），worker_connections 16384（單 Worker 連線上限），keepalive 256（對後端連線池），proxy_buffer_size 16k（避免大 Header 報 502）。常見陷阱：(1) upstream keepalive 沒配 → 每次請求都新建 TCP 連線，QPS 上不去；(2) proxy_read_timeout 太長 → 慢請求佔滿 Worker；(3) access_log 寫 SSD 滿了 → 改 buffer 異步寫入。",
      },
      {
        title: "快取失效策略",
        text: "CDN 快取失效是分散式系統最難的問題之一。(1) URL 版本化（style.v2.css）— 最可靠，URL 變則快取自動失效；(2) CDN API Purge — 適合緊急修復，但全球節點清除需要時間；(3) stale-while-revalidate — 過期時先回傳舊資料再背景更新，避免回源風暴；(4) Cache-Tag — CloudFlare 支援按 Tag 批量 Purge。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計全球化影音平台的內容分發架構",
        text: "需求：影片上傳到 Origin，全球用戶低延遲觀看。架構：(1) 上傳 → S3 Origin → 轉碼 → 產出多碼率 HLS 分片（.m3u8 + .ts）；(2) CDN Push — 熱門影片主動推送到各 Edge；(3) Origin Shield 減少回源；(4) 智慧選路 — 根據用戶網路品質動態切換碼率（ABR）。點播用 CDN Pull，直播用 CDN Push + Low Latency HLS。",
      },
      {
        type: "practice",
        title: "CDN 快取更新後部分用戶仍看到舊版",
        text: "根因：CDN Purge 只清了一個 Edge PoP，其他節點還有舊快取；或者用戶 Browser Cache 沒過期。解法：(1) 部署流程改用 Content Hash 檔名（app.a1b2c3.js），而非 Purge；(2) HTML 設 no-cache + 短 TTL，JS/CSS 設長 max-age；(3) Service Worker 更新時 skipWaiting。核心原則：只對不可變資源（帶 Hash 的靜態檔案）設長快取。",
      },
      {
        type: "practice",
        title: "熱門活動瞬間流量打穿 CDN 回源",
        text: "秒殺活動頁 CDN 快取到期，10 萬個 Edge Node 同時回源拉取同一個頁面 → Origin 炸了。防護：(1) Origin Shield 作中間層吸收回源（10 萬次降為 1 次）；(2) CDN 設 stale-while-revalidate 避免同時失效；(3) Lock 機制 — 第一個回源請求鎖住，其他等待結果（Nginx proxy_cache_lock）。",
      },
    ],
    interview: [
      {
        question: "CDN 的工作原理和 Origin Shield 的價值？",
        answer:
          "CDN 三層快取：Browser → Edge → Origin Shield → Origin。無 Shield 時全球 200+ Edge 各自回源；有 Shield 全部先查中間層，Origin 壓力降 80%+。選型：CloudFlare（安全 + 免費方案）、CloudFront（AWS 生態整合）。",
        keywords: ["Edge Node", "Origin Shield", "Cache HIT/MISS", "CDN Pull/Push"],
      },
      {
        question: "你的前端部署到 CDN 後，部分用戶反映看到舊版本，如何解決？",
        answer:
          "根因：CDN Purge 不完全或 Browser Cache 未失效。根治：用 Content Hash 檔名（app.a1b2c3.js）取代 Purge，HTML 設 no-cache。JS/CSS 帶 Hash 的不可變資源設長 max-age。Service Worker 更新時 skipWaiting。",
        keywords: ["Content Hash", "Cache-Control", "stale-while-revalidate"],
      },
      {
        question: "正向代理和反向代理的差異？",
        answer:
          "正向代理代表客戶端（隱藏客戶端身份），用於 VPN、內容過濾。反向代理代表伺服器（隱藏後端架構），用於負載均衡、SSL 終止、快取。Nginx 不只是反向代理，還能做 L7 LB、靜態檔案伺服、API Gateway。生產調優重點：upstream keepalive、buffer size、access_log 異步。",
        keywords: ["Reverse Proxy", "Nginx", "SSL Termination", "upstream keepalive"],
      },
    ],
  },
};
