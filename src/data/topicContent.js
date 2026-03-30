// 主題內容資料 — 概念講解 + 面試問答
// 每個主題包含 concepts（段落陣列）和 interview（問答陣列）

const topicContent = {
  'cap-theorem': {
    concepts: [
      { title: 'CAP Theorem 核心', text: 'CAP Theorem 指出分散式系統無法同時滿足一致性（Consistency）、可用性（Availability）和分區容錯（Partition Tolerance）。實務中網路分區不可避免，所以選擇落在 CP 和 AP 之間。但更精確的分析是 PACELC 模型：Partition 時選 A 或 C，Else（正常）時選 Latency 或 Consistency。例如 DynamoDB 正常時也犧牲一致性換低延遲（PA/EL），而 ZooKeeper 正常時也堅持一致性（PC/EC）。' },
      { title: 'CP vs AP 的真實場景取捨', text: '金融帳戶餘額必須 CP — 用戶 A 在台北轉帳，用戶 B 在高雄查餘額不能看到舊值，否則可能超支。但同一間銀行的「通知推播」可以是 AP — 延遲幾秒通知不影響正確性。實務設計是 Per-Feature 選擇，而非整個系統統一策略。Instagram Likes 計數用 AP（延遲一致沒差），但 DM 訊息用 CP（訊息順序不能亂）。' },
      { title: 'ACID vs BASE 的邊界場景', text: '電商下單涉及「扣庫存 + 建訂單 + 扣款」三步，傳統做法用 ACID 分散式事務（2PC），但跨服務 2PC 延遲高且有 Coordinator 單點問題。實務做法是 BASE：先鎖定庫存（預留），訂單建立後非同步扣款，失敗則補償釋放庫存。這就是 Saga Pattern 的核心思想 — 用一系列本地事務 + 補償操作取代分散式 ACID。' },
      { title: 'Eventual Consistency 的陷阱', text: '最終一致性的「最終」是多久？沒有 SLA 的 Eventual Consistency 在生產中很危險。實務做法：(1) Read-Your-Write Consistency — 寫入後從 Primary 讀取，保證用戶看到自己的最新操作；(2) Monotonic Read — 用 Session Token 綁定到同一 Replica，避免時光倒流；(3) Causal Consistency — 用 Lamport Timestamp 保證因果序。DynamoDB 的 Consistent Read 選項就是犧牲一點延遲換強一致。' },
    ],
    interview: [
      { question: '設計一個跨國電商平台，庫存系統該選 CP 還是 AP？', answer: '核心洞察：庫存扣減必須 CP（超賣是財務損失），但庫存展示可以 AP（頁面顯示「剩餘 3 件」延遲幾秒無妨）。架構分離：寫路徑用強一致（MySQL + 行鎖 SELECT FOR UPDATE），讀路徑用 Redis 快取 + 非同步更新（AP）。下單時走 DB 確認真實庫存，頁面瀏覽走 Cache。這就是 Per-Operation 混合策略，避免一刀切。', keywords: ['CP/AP 混合', 'SELECT FOR UPDATE', '讀寫分離', '超賣防護'] },
      { question: '兩個 Data Center 之間如何做資料同步？出現衝突怎麼辦？', answer: '場景：用戶 A 在 DC-East 修改頭像，同時用戶 A 在 DC-West 修改簽名，兩個 DC 各自接受寫入再同步。衝突解決策略：(1) LWW（Last-Write-Wins）— 用 NTP 時間戳，簡單但可能丟失寫入；(2) CRDT（Conflict-free Replicated Data Types）— 資料結構數學保證可合併，如 G-Counter、OR-Set，適合計數器和集合類操作；(3) Application-Level Merge — 像 Google Docs 的 OT 算法，複雜但最精確。大部分場景 LWW + 寫入衝突偵測告警即可。', keywords: ['Multi-DC Sync', 'LWW', 'CRDT', 'Vector Clock', 'OT'] },
      { question: '你的服務使用 Redis Cluster 做 Session Store，某天一個節點掛了，部分用戶被登出。怎麼改善？', answer: '問題根因：Redis Cluster 主從切換期間，未同步的寫入丟失（CP 場景下犧牲了 A）。改善方案：(1) Sentinel/Cluster 搭配 min-slaves-to-write=1 保證至少一個 Slave 有同步，代價是寫入延遲增加；(2) 雙寫到兩個獨立 Redis 實例（犧牲一致性換可用性）；(3) JWT + Refresh Token 架構取代 Server-Side Session — Access Token 無狀態驗證不依賴 Redis，Redis 只存 Refresh Token 和黑名單；(4) Session 加持久化備份（Redis AOF + RDB），縮短恢復時間。最佳實踐是方案 3，從根本上消除 Session Store 的單點依賴。', keywords: ['Redis Failover', 'min-slaves-to-write', 'JWT', 'Session 無狀態化'] },
    ],
  },
  'scalability': {
    concepts: [
      { title: '水平擴展的前提條件', text: '水平擴展不是「加機器就好」。前提：(1) Stateless — Session 必須外部化（Redis），否則加機器沒用；(2) 無共享磁碟 — 檔案上傳不能存本地，要用 S3/MinIO；(3) 無本地快取依賴 — 或改用分散式快取。常見反模式：把上傳圖片存在 /tmp、用全域變數做計數器、用 in-memory queue 做任務佇列。這些都會在第二台機器上線時爆炸。' },
      { title: 'Fan-out 問題：Instagram Feed 的架構取捨', text: '用戶 A 發一張照片，A 有 1000 個粉絲，如何讓粉絲看到？Fan-out on Write（推模型）：發布時寫入每個粉絲的 Feed Cache，讀取快但寫入放大 1000 倍，大 V（千萬粉絲）不可行。Fan-out on Read（拉模型）：讀取時查詢所有關注者的最新貼文再合併排序，寫入快但讀取慢。Instagram/Twitter 實務是混合方案：普通用戶用推模型，大 V 用拉模型（讀取時即時合併）。' },
      { title: 'CQRS + Event Sourcing 實戰', text: '電商訂單系統：寫入端（Command）用正規化 MySQL 存訂單狀態變更事件（OrderCreated、OrderPaid、OrderShipped）。讀取端（Query）透過事件消費建立反正規化 View（Elasticsearch 做全文搜索、Redis 做即時統計）。好處：寫入和讀取獨立擴展，讀取端可以針對不同查詢場景建立不同 Projection。代價：最終一致性延遲、事件 Schema 演進需要版本控制、系統複雜度高。' },
      { title: '效能瓶頸定位方法論', text: '不要猜，要測量。(1) Application Profiling — Go pprof / Java JFR 找出 CPU/Memory 熱點；(2) DB 層 — Slow Query Log + EXPLAIN 找出全表掃描；(3) 網路層 — 分散式 Tracing（Jaeger）找出延遲最高的 Span；(4) 系統層 — top/vmstat/iostat 觀察 CPU/IO 是否飽和。常見發現：80% 的效能問題來自 N+1 查詢和缺少索引，而不是需要加機器。' },
    ],
    interview: [
      { question: '你的 API 在流量成長 10 倍後開始超時，如何系統性排查和解決？', answer: '排查 SOP：(1) 看 Metrics — 是 CPU/Memory 飽和還是 IO Wait 高？(2) 看 DB Slow Query — 是否有新出現的慢查詢？(3) 看 Tracing — 哪個下游服務延遲最高？(4) 看連線池 — DB/Redis 連線是否耗盡？常見根因和解法：N+1 查詢 → Batch Query + DataLoader；DB 熱點行 → 讀寫分離 + Cache；閘道瓶頸 → 水平擴展 + Rate Limiting；大 Payload → 分頁 + 壓縮。先垂直優化（代價低），最後才水平擴展。', keywords: ['效能排查 SOP', 'N+1', 'Slow Query', '連線池耗盡'] },
      { question: '設計一個日活 1000 萬的社交 Feed 系統，如何擴展？', answer: '核心問題是 Fan-out 策略：DAU 1000 萬 × 每次刷新 20 條 = 2 億次 Feed 讀取/天 ≈ 2300 QPS 均值、峰值 ~7K。方案：(1) 預計算 Feed — 用戶發文時 Fan-out on Write 寫入粉絲的 Redis List（推模型）；(2) 大 V 例外 — 粉絲超過 10 萬的用拉模型（讀取時合併）；(3) Feed Cache 用 Redis Sorted Set，Score 為時間戳，ZRANGEBYSCORE 做分頁；(4) 熱門內容走 CDN 快取。重點：推拉混合 + 熱冷分離。', keywords: ['Fan-out', '推拉混合', 'Redis Sorted Set', '大 V 策略'] },
      { question: '什麼場景下 CQRS 是過度設計？', answer: '如果系統是簡單的 CRUD、讀寫比例相近、團隊規模小，CQRS 的複雜度（事件設計、Projection 維護、最終一致性處理）遠超收益。適合 CQRS 的信號：(1) 讀寫比 > 10:1 且讀取模式多變；(2) 需要 Event Sourcing 做審計軌跡（金融、醫療）；(3) 讀取端需要不同資料模型（如 ES 全文搜索 + Redis 排行榜）；(4) 團隊有分散式系統經驗。簡單系統用 Read Replica + Cache 就能解決 90% 的讀擴展問題。', keywords: ['CQRS 適用場景', 'Event Sourcing', '過度設計', 'Read Replica'] },
    ],
  },
  'high-availability': {
    concepts: [
      { title: '從 SLA 反推架構設計', text: '99.99% SLA 意味著年停機 52 分鐘。若部署在單一 AZ（可用區），AZ 故障就直接超標。因此 99.99% 必須 Multi-AZ 部署，資料庫跨 AZ 同步複製，LB 自動切換。99.999%（年停機 5 分鐘）更需要 Multi-Region + Active-Active。每多一個 9，架構複雜度和成本指數級增長。設計時先問清楚 SLA 需求，避免過度設計。' },
      { title: 'Failover 的隱藏延遲', text: 'Active-Standby Failover 看起來簡單，但實際切換有延遲：DNS TTL 過期（分鐘級）、Health Check 偵測間隔（秒級）、新 Primary 啟動預熱（秒~分鐘級）。AWS RDS Multi-AZ Failover 通常 60-120 秒。解決方案：(1) 降低 Health Check 間隔（但過於敏感會誤判）；(2) 用連線池 Retry 遮蔽短暫切換；(3) 應用層 Circuit Breaker 在切換期間返回降級回應而非超時。' },
      { title: 'Chaos Engineering 實踐', text: 'Netflix 的 Chaos Monkey 隨機殺 Production 實例來驗證系統韌性。核心原則：(1) 先建立穩態假設（如 P99 延遲 < 200ms）；(2) 注入故障（殺實例、注入延遲、斷網路）；(3) 觀察穩態是否被打破；(4) 修復發現的弱點。進階工具：Gremlin（商業）、LitmusChaos（K8s 原生）。重點不是證明系統不會壞，而是提前發現怎麼壞。' },
      { title: '優雅降級 vs 快速失敗', text: '當下游服務掛了，有兩種策略：(1) 優雅降級（Graceful Degradation）— 回傳部分資料或預設值。例如推薦服務掛了，改回傳熱門排行榜。(2) 快速失敗（Fail Fast）— 直接回錯誤，不讓請求排隊。適合寫操作（不能給錯誤的成功回應）。Netflix 的 Fallback 策略：Cache、Static Default、Empty Response 按優先級選擇。' },
    ],
    interview: [
      { question: '你負責的支付服務在凌晨 3 點 DB 主庫掛了，自動 Failover 花了 2 分鐘，期間所有支付失敗。如何改善？', answer: '短期：(1) DB 切 Proxy（ProxySQL/PgBouncer）吸收 Failover 期間的連線中斷，自動 Retry；(2) 支付 API 加 Circuit Breaker，Failover 期間回傳「處理中」而非「失敗」，稍後用補償機制確認結果。中長期：(1) 評估 Aurora/TiDB 等原生高可用方案（Failover < 30 秒）；(2) 實作 Outbox Pattern — 支付意圖先寫本地 DB，再由 Worker 非同步提交給支付閘道，解耦即時可用性和最終一致性；(3) 定期 Chaos Testing 模擬 DB Failover 驗證恢復流程。', keywords: ['DB Failover', 'ProxySQL', 'Outbox Pattern', 'Chaos Testing'] },
      { question: '如何在不停機的情況下做資料庫 Schema Migration？', answer: 'Zero-Downtime Migration 三步法：(1) Expand — 新增欄位/表，舊程式碼不受影響（ALTER TABLE ADD COLUMN，MySQL Online DDL）；(2) Migrate — 部署新版程式碼同時讀寫新舊欄位（雙寫），背景跑 Backfill 遷移舊資料；(3) Contract — 確認遷移完成後，移除舊欄位。關鍵：每一步都可以獨立部署和回滾。大表 ALTER TABLE 用 gh-ost 或 pt-online-schema-change 避免鎖表。絕對不要在一個 Deployment 中同時改 Schema 和程式碼。', keywords: ['Zero-Downtime Migration', 'Expand-Migrate-Contract', 'gh-ost', '雙寫'] },
      { question: 'Active-Active 跨區域部署如何處理寫入衝突？', answer: '場景：用戶同時在兩個 DC 修改同一筆資料。策略選擇：(1) 單 Leader 架構 — 所有寫入路由到一個 DC 的 Primary，其他 DC 做 Read Replica。簡單但寫入有跨區延遲。(2) Multi-Leader — 每個 DC 有 Primary，CockroachDB/TiDB 用分散式共識保證一致性，犧牲延遲。(3) Conflict-Free — 用 CRDT 數據結構（如 Counter, Set），數學保證無衝突。實務上大多數場景用方案 1（寫入量通常遠小於讀取），只有真正需要「全球任意節點寫入」才用方案 2 或 3。', keywords: ['Multi-Leader', 'CockroachDB', 'CRDT', '跨 DC 寫入'] },
    ],
  },
  'api-design': {
    concepts: [
      { title: 'REST vs gRPC vs GraphQL 的真實選型', text: '大型平台通常混用三者：對外 Public API 用 REST（生態成熟、Browser 友好），BFF（Backend for Frontend）用 GraphQL（前端彈性查詢、減少多次 Round Trip），內部微服務間用 gRPC（Protobuf 二進制序列化比 JSON 快 5-10 倍、強類型 Contract、雙向 Streaming）。常見踩坑：gRPC 不能直接被瀏覽器呼叫（需 gRPC-Web 或 Envoy 代理）；GraphQL 的 N+1 問題需要 DataLoader 解決；REST 的 Endpoint 爆炸需要 API Gateway 治理。' },
      { title: 'API Gateway 的職責邊界', text: 'API Gateway 做什麼：認證（JWT 驗證）、限流（Rate Limiting）、路由（Path-Based Routing）、協議轉換（REST → gRPC）、日誌和監控。API Gateway 不該做什麼：業務邏輯、資料轉換、Join 多個服務的資料（這是 BFF 的職責）。常見架構：Kong / AWS API Gateway → BFF → 微服務。踩坑：API Gateway 本身成為單點瓶頸 — 需要水平擴展 + 健康檢查。' },
      { title: '冪等性的生產實踐', text: 'Stripe 的做法：(1) 客戶端在 Header 帶 Idempotency-Key（通常是客戶端生成的 UUID）；(2) 服務端第一次請求正常處理，將 Key + Response 存 Redis（TTL 24h）；(3) 重複請求直接回傳快取的 Response。進階問題：如果第一次請求處理到一半伺服器掛了怎麼辦？需要用 DB Transaction + Status Flag（PENDING → COMPLETED）保證原子性。Idempotency 比你想像的複雜 — 不只是「去重」，而是保證「重複執行的結果和副作用完全一致」。' },
      { title: 'API 向後相容設計', text: '不相容變更會破壞所有客戶端。安全的變更：新增欄位（用 optional）、新增 Endpoint。不安全的變更：刪除欄位、改欄位類型、改語義。處理策略：(1) 版本化（/v1 → /v2）+ 舊版本並行支援 6-12 個月；(2) 用 Deprecation Header 提前通知；(3) Protobuf 天然支援 Field Number 向後相容（只新增 Field，不重用 Number）。Google API 的設計原則：Field 標記 deprecated 但永不刪除。' },
    ],
    interview: [
      { question: '你的支付 API 偶爾出現重複扣款，如何根本解決？', answer: '根因分析：客戶端網路超時後 Retry，伺服端收到兩次相同請求。解法分層：(1) API 層 — 強制要求 Idempotency-Key，Redis SETNX 做去重，已處理的直接回傳快取結果；(2) DB 層 — 用唯一約束（UNIQUE INDEX on payment_id + merchant_id）做兜底防護；(3) 狀態機 — 支付狀態用狀態機管理（INIT → PENDING → SUCCESS/FAILED），只有 INIT 狀態可以發起扣款；(4) 對帳機制 — 定時和支付閘道對帳，發現重複扣款自動發起退款。四層防護缺一不可。', keywords: ['Idempotency-Key', '唯一約束', '狀態機', '對帳'] },
      { question: '微服務間用 gRPC 通訊，某天上線時 Protobuf Schema 變更導致下游服務全部報錯。如何避免？', answer: '根因：通常是刪除了 Field 或改了 Field Number/Type，破壞了向後相容。防護機制：(1) CI Pipeline 加 buf lint / buf breaking 自動檢查 Protobuf 的向後相容性；(2) 制定 Proto 規範 — 只新增 Field，用 reserved 標記廢棄的 Number 防止重用；(3) 灰度發布 — 新版 Server 先部署但不切流，驗證 Proto 相容後再切；(4) 長期方案 — 用 Schema Registry（類似 Confluent Schema Registry 的概念）集中管理 Proto Schema，發布前驗證相容性。', keywords: ['Protobuf Breaking Change', 'buf lint', 'Schema Registry', '灰度發布'] },
      { question: '設計一個高併發的搶票 API，要求保證不超賣。', answer: '架構：(1) 流量削峰 — 前端加驗證碼 + Queue Page，只放合理量級進入後端；(2) 庫存預扣 — Redis DECR 原子操作做庫存預扣（比 DB 行鎖快 100 倍），扣成功的進入訂單佇列；(3) 非同步下單 — Kafka 消費者從佇列取出建立訂單（MySQL INSERT），失敗則 Redis INCR 歸還庫存；(4) 超時釋放 — 未完成支付的訂單 TTL 到期後自動釋放庫存。重點：真正的壓力在 Redis 而非 MySQL，單個 Redis Key 做 DECR 可達 10 萬+ QPS。超賣防護的最後一道牆是 DB 的 CHECK(stock >= 0) 約束。', keywords: ['Redis DECR', '非同步下單', '庫存預扣', '超時釋放'] },
    ],
  },
  'load-balancing': {
    concepts: [
      { title: 'L4 vs L7 的架構決策', text: 'L4（TCP 層）做純粹的連線轉發，單機可達百萬 CPS，適合 gRPC Streaming、WebSocket 等長連接。L7（HTTP 層）能解析請求內容，支援 Path-Based Routing（/api → 微服務 A，/static → CDN）、Header-Based Canary（X-Canary: true → 新版本）、Authentication Offloading。生產架構通常多層：DNS → L4 NLB → L7 ALB/Nginx → Backend。每層解決不同問題，避免單層過載。' },
      { title: 'WebSocket 和長連接的 LB 挑戰', text: '傳統 HTTP 是短連接，LB 可以逐請求分配。WebSocket 建立後是持久連接，LB 只在建連時決定一次路由。問題：(1) 某些節點可能累積大量 WebSocket 連線（不均衡）；(2) 節點下線時需要 Connection Draining（等客戶端重連）。解法：Envoy 的 Cluster Drain + WebSocket Reconnect 機制；用 Redis Pub/Sub 做跨實例訊息廣播（某用戶連在實例 A，訊息從實例 B 進來時透過 Pub/Sub 轉發）。' },
      { title: '負載均衡的隱性故障', text: '常見生產事故：(1) Health Check 太寬鬆 — 節點 OOM 但進程還活著，Health Check 通過但請求全部超時。改用 Deep Health Check（/health 會查 DB 和 Redis 連通性）；(2) Thundering Herd — 節點恢復後被 LB 瞬間灌入大量流量，還沒熱好就再次掛。解法：Slow Start（新節點逐步增加權重）；(3) 跨 AZ Latency — LB 把流量轉到遠端 AZ，延遲暴增。解法：Zone-Aware Routing（優先同 AZ）。' },
    ],
    interview: [
      { question: '你的 WebSocket 聊天系統在擴展到 10 台實例後，用戶 A 發訊息用戶 B 收不到。為什麼？', answer: '根因：用戶 A 的 WebSocket 連到實例 1，用戶 B 連到實例 3，實例 1 收到訊息後只能推送給自己持有的連線。解法：(1) Redis Pub/Sub — 實例 1 收到訊息後 PUBLISH 到 Redis Channel，所有實例 SUBSCRIBE 後推送給各自的連線；(2) 維護用戶 → 實例的映射表（Redis Hash），直接轉發到目標實例（更精確但需維護映射）；(3) 用 NATS/Kafka 替代 Redis Pub/Sub 提升吞吐。核心原則：有狀態連線（WebSocket）需要有廣播機制，不能只依賴 LB。', keywords: ['WebSocket', 'Redis Pub/Sub', '跨實例廣播', 'NATS'] },
      { question: '週五下午部署新版本，5 台實例中 3 台已更新、2 台還是舊版。用戶反映功能時好時壞。怎麼處理？', answer: '問題：LB Round Robin 將流量同時分給新舊版本，用戶每次請求可能打到不同版本。短期止血：(1) 用 LB 的 Weighted Routing 將舊版本權重設為 0（等同 Connection Draining）；(2) 用 Header 或 Cookie 做版本綁定（Sticky Routing to Version）。長期改善：(1) 改用 Blue-Green Deployment — 5 台新版全部就緒後一次切流量；(2) Rolling Update 搭配 Readiness Probe — 新版本未通過健康檢查前不接收流量；(3) API 向後相容設計 — 新舊版本共存時也不會破壞功能。', keywords: ['Rolling Update', 'Connection Draining', 'Readiness Probe', '版本共存'] },
      { question: '你的 LB 背後有 100 台伺服器，但 Grafana 顯示前 3 台的 CPU 90%，後 97 台只有 10%。什麼原因？', answer: '可能原因：(1) Least Connections 算法 + 長連接場景 — 早期連上的伺服器累積大量持久連線，新伺服器沒機會分到。解法：改用 Power of Two Choices（隨機選兩台取連線少的那台）；(2) 某些 Heavy Path（如報表下載）集中在特定 URL，Path-Based Routing 全導到那幾台。解法：將 Heavy Path 拆成獨立的服務池；(3) Consistent Hashing 的 Key 分佈不均（某些 Hot User 的請求量極大）。解法：增加 Virtual Node 數量或拆分 Hot Key。', keywords: ['Hot Server', 'Power of Two Choices', 'Virtual Node', 'Heavy Path'] },
    ],
  },
  'cdn-proxy': {
    concepts: [
      { title: 'CDN 的進階架構', text: 'CDN 不只快取靜態檔案。現代 CDN 支援：(1) Edge Computing — 在邊緣節點執行邏輯（Cloudflare Workers、Lambda@Edge），用於 A/B Testing、Auth Token 驗證、地理重定向，免回源延遲；(2) Origin Shield — 在 CDN 和 Origin 之間加一層聚合快取，100 個邊緣節點 MISS 時只有 1 個 Shield 回源，而非 100 次回源風暴；(3) 動態內容加速 — CDN 與 Origin 之間用持久連接 + 路由優化，比公網直連快 30-50%。' },
      { title: '快取失效是電腦科學最難的問題之一', text: '場景：電商秒殺活動商品圖片更新了，但 CDN 邊緣節點還在回傳舊圖。解法層次：(1) URL Fingerprinting — 檔案名包含 Content Hash（如 logo.abc123.png），內容變則 URL 變，快取自然失效。最可靠；(2) Surrogate-Key（Tag-Based Purge）— 給 Response 標記 Tag，Purge 時按 Tag 批量清除，比逐 URL Purge 高效；(3) stale-while-revalidate — 邊緣先回傳過期內容（用戶無感延遲），背景非同步回源更新。注意：CDN Purge 是分鐘級操作，不適合即時性要求極高的場景。' },
      { title: 'Nginx 反向代理的生產調優', text: '常見配置坑：(1) upstream keepalive — 不設的話每次請求都建新 TCP 連線到後端，延遲暴增。建議 keepalive 64 + proxy_http_version 1.1；(2) proxy_buffering — 開啟後 Nginx 完整接收後端回應再回傳客戶端，保護後端不被慢客戶端拖住（Slow Client 問題）；(3) worker_connections — 預設 1024 太低，生產環境需根據 Expected Concurrency 調整。Nginx 的 Location Block 匹配規則複雜（精確 > 前綴最長 > 正則），錯誤配置是常見排查噩夢。' },
    ],
    interview: [
      { question: '某天你發現 CDN 快取命中率從 95% 掉到 30%，你怎麼排查？', answer: '排查思路：(1) 看是全局性還是某些路徑 — 如果是全局→ 可能是 Cache-Control Header 被改了（某次部署把 max-age 設成 0）或 CDN 配置被修改；(2) 看是否有大量新 URL — 如果是動態 URL（帶 timestamp、session_id 參數），每個 URL 都被當作新資源。解法：設定 CDN Cache Key 忽略無關 Query Parameter；(3) 看是否有大規模 Purge 操作 — 運維做了全量 Purge 導致冷啟動；(4) 看流量模式 — 可能有新功能上線產生大量長尾請求（只被訪問 1-2 次的 URL 佔比擴大）。工具：CDN Dashboard + Access Log 分析。', keywords: ['Cache Hit Rate', 'Cache Key', 'Query Parameter', '長尾'] },
      { question: '你的 API 需要支援全球用戶，如何用 CDN 加速動態 API？', answer: 'CDN 傳統上只加速靜態內容，但動態 API 也能受益：(1) TCP 連線優化 — CDN Edge 與 Origin 預建持久連接，用戶只需與就近 Edge 建 TCP/TLS（省 RTT）；(2) 智能路由 — CDN 的私有骨幹網路比公網更穩定更快；(3) 可快取的 API — 某些 API 回應短時間內不變（商品列表、匯率），可加 Cache-Control 短 TTL（5-30 秒）大幅降低回源；(4) Edge Logic — Cloudflare Workers 在邊緣做認證、限流、地理分流，不需要回源。', keywords: ['動態加速', 'Edge Computing', 'TCP 優化', '短 TTL'] },
      { question: '反向代理和 API Gateway 有什麼區別？什麼時候需要兩者都用？', answer: 'Nginx 反向代理：偏基礎設施層，負責 SSL 終止、負載均衡、靜態檔案、壓縮、連線管理。強於效能和穩定性。API Gateway（Kong、AWS API GW）：偏應用層，負責認證授權、Rate Limiting、API 版本管理、請求轉換、API Analytics。強於功能和治理。兩者共用的架構：Nginx 在最前面處理 SSL 和靜態資源，API Gateway 在後面處理業務路由和治理，微服務在最後。小團隊可以先只用 Nginx，功能不夠再加 API Gateway。', keywords: ['Nginx', 'API Gateway', 'SSL Termination', '分層架構'] },
    ],
  },
  'relational-db': {
    concepts: [
      { title: '索引（Index）原理', text: 'B-Tree 索引將資料組織成平衡樹結構，查詢複雜度從全表掃描 O(n) 降至 O(log n)。複合索引遵循最左前綴原則。覆蓋索引（Covering Index）可避免回表查詢。但索引會増加寫入開銷和磁碟空間，需根據查詢模式選擇性建立。' },
      { title: '事務隔離等級', text: '四個等級：Read Uncommitted（最低，有 Dirty Read）→ Read Committed（防 Dirty Read）→ Repeatable Read（防 Non-Repeatable Read，MySQL 預設）→ Serializable（最高，完全序列化但效能最差）。等級越高，並發性能越低。' },
      { title: 'Query 優化', text: '核心工具：EXPLAIN 分析執行計劃。常見優化：避免 SELECT *（只查需要欄位）、避免函數作用於索引列、用 JOIN 替代子查詢、合理使用 LIMIT、避免 N+1 查詢。Slow Query Log 是定位效能瓶頸的第一步。' },
    ],
    interview: [
      { question: '解釋 B-Tree 索引的工作原理', answer: 'B-Tree 是多路平衡搜尋樹，每個節點存多個 Key 和子節點指標。查詢時從根節點二分查找逐層向下，IO 次數等於樹高度（通常 3-4 層可索引百萬級資料）。葉子節點透過鏈結相連，支援範圍查詢。B+Tree 進一步將所有資料存在葉子節點，提升範圍掃描效能。', keywords: ['B-Tree', 'B+Tree', 'O(log n)', '覆蓋索引'] },
      { question: '什麼場景下索引反而會降低效能？', answer: '(1) 頻繁的 INSERT/UPDATE/DELETE：每次寫入需維護索引結構；(2) 低選擇性欄位（如 gender）：區分度低，優化器選擇全表掃描更快；(3) 過多索引：增加儲存空間和維護成本；(4) 小表：資料量少時全表掃描可能比走索引更快。', keywords: ['選擇性', '寫入開銷', '索引維護'] },
      { question: 'MySQL 的 Repeatable Read 如何實作？', answer: 'InnoDB 使用 MVCC（Multi-Version Concurrency Control）。每個事務讀取時看到的是事務開始時的一致性快照（Snapshot）。實作透過 undo log 保存舊版本資料，read view 決定可見版本。Gap Lock 防止幻讀（Phantom Read）。', keywords: ['MVCC', 'Snapshot', 'Gap Lock', 'Undo Log'] },
    ],
  },
  'nosql-db': {
    concepts: [
      { title: 'NoSQL 四大類型', text: 'Document（MongoDB）：彈性 Schema，適合 CMS、用戶檔案。Key-Value（Redis、DynamoDB）：極高讀寫效能，適合快取、Session。Column-Family（Cassandra、HBase）：適合時序資料、大規模分析。Graph（Neo4j）：適合社交關係、推薦引擎。' },
      { title: '何時選擇 NoSQL', text: '選 NoSQL 的信號：Schema 變動頻繁、需要水平擴展、讀寫比極高、資料結構天然非關聯（如日誌、社交圖譜）。仍選 SQL 的信號：需要複雜 JOIN 和事務、資料關係複雜、需要 ACID 保證（如金融）。' },
      { title: 'MongoDB vs Cassandra', text: 'MongoDB：文件模型、單 Primary 架構、強一致性（可配置）、適合中等規模。Cassandra：寬列模型、無 Master 架構（Masterless）、AP 系統、線性擴展能力強，適合寫密集型場景（如 IoT、日誌）。' },
    ],
    interview: [
      { question: 'SQL 和 NoSQL 各自的優缺點？', answer: 'SQL 優點：ACID 事務、成熟的 JOIN、標準化查詢語言、強一致性。缺點：Schema 僵硬、水平擴展困難。NoSQL 優點：彈性 Schema、易水平擴展、高寫入吞吐。缺點：弱事務支援、無 JOIN（需應用層處理）、一致性需額外設計。', keywords: ['ACID', 'Schema Flexibility', 'Horizontal Scaling'] },
      { question: 'MongoDB 的 Sharding 策略？', answer: 'MongoDB 支援兩種 Shard Key 策略：(1) Range Sharding：按 Key 範圍分片，支援範圍查詢但易產生熱點；(2) Hash Sharding：雜湊後均勻分佈，避免熱點但不支援範圍查詢。選 Shard Key 要考慮基數（Cardinality）、單調性和查詢模式。', keywords: ['Shard Key', 'Range Sharding', 'Hash Sharding'] },
      { question: '何時用 Graph Database？', answer: '當資料間的關係是核心查詢目標時：社交網路（朋友的朋友）、推薦系統（用戶-商品圖譜）、知識圖譜、詐欺偵測（異常交易路徑）。Graph DB 的遍歷查詢複雜度與圖的大小無關，而 SQL 的 JOIN 層數越多效能越差。', keywords: ['Graph Traversal', 'Neo4j', 'Relationship-First'] },
    ],
  },
  'db-scaling': {
    concepts: [
      { title: 'Replication（複製）', text: '主從複製（Master-Slave）：寫入走主庫，讀取走從庫，提升讀取擴展性。同步複製保證一致性但影響寫入效能；非同步複製效能好但有複製延遲。半同步複製是折衷方案（至少一個從庫確認）。' },
      { title: 'Sharding（分片）', text: 'Range Sharding：按範圍切分，支援範圍查詢但易熱點。Hash Sharding：雜湊後均勻分佈，避免熱點但不支援範圍查詢。Consistent Hashing：節點增減時只遷移少量資料。Directory-Based Sharding：查表決定分片，彈性高但需管理 lookup table。' },
      { title: '分片帶來的挑戰', text: '跨分片 JOIN 變得昂貴或不可能、分散式事務需 2PC 或 Saga、全局唯一 ID 生成、數據遷移和重平衡的複雜性、運維成本大幅增加。因此分片應作為最後手段，先嘗試讀寫分離、快取和垂直擴展。' },
    ],
    interview: [
      { question: '主從複製的延遲問題如何解決？', answer: '(1) 半同步複製：至少一個 Slave 確認才回傳成功；(2) 寫後讀一致性：寫入後短時間內強制讀主庫；(3) 監控 Seconds_Behind_Master 指標；(4) 使用 GTID（全域事務 ID）追蹤複製進度；(5) 並行複製（Parallel Replication）加速 relay。', keywords: ['半同步', '寫後讀', 'GTID', 'Parallel Replication'] },
      { question: 'Sharding Key 如何選擇？', answer: '好的 Sharding Key 需滿足：(1) 高基數（Cardinality）避免資料傾斜；(2) 頻繁出現在查詢 WHERE 子句中；(3) 避免單調遞增（會導致所有新寫入集中到最後一個 Shard）。常見選擇：user_id（按用戶分）、region（按地區分）。複合 Sharding Key 可兼顧多維度。', keywords: ['Cardinality', '資料傾斜', 'Hot Shard', '複合 Key'] },
      { question: 'Consistent Hashing 解決什麼問題？', answer: '傳統 Hash Sharding（hash % N）在增減節點時需要大量資料遷移。Consistent Hashing 將節點和 Key 映射到環上，增減節點只影響相鄰區段的資料。虛擬節點（Virtual Node）解決節點分佈不均的問題。Cassandra 和 DynamoDB 都採用此策略。', keywords: ['Hash Ring', 'Virtual Node', '資料遷移'] },
    ],
  },
  'cache-strategy': {
    concepts: [
      { title: 'Cache-Aside（旁路快取）', text: '最常用模式。讀取：先查 Cache → 命中直接回傳 / 未命中查 DB 後回填 Cache。寫入：先更新 DB → 再刪除 Cache（而非更新 Cache）。刪除而非更新可避免並發寫入導致的不一致。簡稱 Lazy Loading。' },
      { title: 'Write-Through / Write-Behind', text: 'Write-Through：每次寫入同時更新 DB 和 Cache，一致性高但寫入延遲增加。Write-Behind（Write-Back）：寫入先進 Cache，異步批量寫入 DB，效能極高但有資料遺失風險。場景：Write-Through 適合讀多寫少，Write-Behind 適合寫密集型。' },
      { title: '快取淘汰策略', text: 'LRU（Least Recently Used）：淘汰最久未使用，最常用。LFU（Least Frequently Used）：淘汰使用頻率最低。FIFO：先進先出。TTL：設定過期時間自動清除。Redis 支援多種策略，預設 noeviction（記憶體滿時拒絕寫入）。' },
    ],
    interview: [
      { question: 'Cache-Aside 為什麼刪除而不是更新快取？', answer: '更新快取在並發場景下會出問題：Thread A 更新 DB → Thread B 更新 DB → Thread B 更新 Cache → Thread A 更新 Cache，導致 Cache 是 A 的舊值。刪除快取只會導致一次 Cache Miss，下次讀取時回填最新值，簡單且安全。', keywords: ['Cache-Aside', '並發一致性', 'Lazy Loading'] },
      { question: 'Read-Through 和 Cache-Aside 的差異？', answer: 'Cache-Aside：應用程式負責管理快取和 DB 的交互邏輯。Read-Through：快取層自己負責載入資料（Cache Provider 內建回源邏輯），應用端只面對 Cache。Read-Through 程式碼更簡潔，但需要 Cache Provider 支援（如 Caffeine、Hazelcast）。', keywords: ['Read-Through', 'Cache-Aside', 'Cache Provider'] },
      { question: 'LRU 如何實作？時間複雜度？', answer: '用 HashMap + Doubly Linked List 實作 O(1) 的 get 和 put。HashMap 用於 O(1) 查找，LinkedList 維護使用順序。每次 get 將節點移到 List 頭部，滿時淘汰 List 尾部。這是 LeetCode 146 題，也是面試高頻題。', keywords: ['HashMap', 'Doubly Linked List', 'O(1)', 'LeetCode 146'] },
    ],
  },
  'cache-problems': {
    concepts: [
      { title: '快取穿透（Cache Penetration）', text: '查詢不存在的 Key，每次都穿透到 DB。解法：(1) 布隆過濾器（Bloom Filter）前置攔截；(2) 快取空值（null）並設短 TTL；(3) 請求參數合法性校驗。常見於惡意攻擊或爬蟲查詢不存在的 ID。' },
      { title: '快取擊穿（Cache Breakdown）', text: '熱點 Key 過期瞬間，大量併發請求同時穿透到 DB。解法：(1) 互斥鎖（Mutex Lock）只允許一個請求回源；(2) 永不過期 + 異步更新；(3) 邏輯過期（在值中記錄過期時間，過期時異步更新而非刪除）。' },
      { title: '快取雪崩（Cache Avalanche）', text: '大量 Key 同時過期，或 Redis 整體宕機，導致所有請求衝向 DB。解法：(1) 過期時間加隨機偏移，打散過期時間；(2) 多級快取（L1 本地 + L2 Redis）；(3) Redis Cluster 高可用部署；(4) 熔斷 + 限流保護 DB。' },
    ],
    interview: [
      { question: '快取穿透、擊穿、雪崩的差異和解決方案？', answer: '穿透：查不存在的 Key → 布隆過濾器 + 快取 null。擊穿：單個熱點 Key 過期 → 互斥鎖 + 永不過期。雪崩：大量 Key 同時過期或 Redis 掛 → 隨機 TTL + 多級快取 + 熔斷限流。三者防護層次：穿透在入口攔截，擊穿在回源控制，雪崩在架構層面。', keywords: ['穿透', '擊穿', '雪崩', 'Bloom Filter', 'Mutex Lock'] },
      { question: '布隆過濾器的原理和限制？', answer: '原理：用 K 個雜湊函數將元素映射到位元陣列的 K 個位置。查詢時檢查這 K 位是否全為 1，全為 1 則「可能存在」，有一個 0 則「一定不存在」。限制：有誤判率（False Positive），不支援刪除（位元可能被多個元素共用）。Counting Bloom Filter 可支援刪除。', keywords: ['Bloom Filter', 'False Positive', '位元陣列'] },
      { question: '如何設計多級快取架構？', answer: 'L1（進程內）：Caffeine/Guava Cache，延遲 < 1μs，容量小。L2（Redis）：延遲 < 1ms，容量大，跨實例共享。L3（CDN）：靜態資源。讀取順序 L1→L2→DB，寫入時需同步失效 L1+L2。L1 適合熱點資料，需處理各實例 L1 一致性（用 Redis Pub/Sub 通知失效）。', keywords: ['Caffeine', 'Redis', 'L1/L2 Cache', 'Pub/Sub'] },
    ],
  },
  'redis': {
    concepts: [
      { title: 'Redis 核心資料結構', text: 'String：計數器、分散式鎖。Hash：物件屬性存儲。List：訊息佇列、Timeline。Set：標籤、共同好友。Sorted Set（ZSet）：排行榜、延遲佇列。每種結構底層有不同編碼（ziplist、hashtable、skiplist），Redis 會根據資料量自動切換。' },
      { title: 'Redis 持久化', text: 'RDB（快照）：定期 fork 子進程將記憶體快照寫入磁碟，恢復快但可能丟失最後一次快照後的資料。AOF（Append-Only File）：記錄每次寫入命令，資料更安全但檔案較大。通常同時啟用 RDB + AOF，前者用於備份，後者用於恢復。' },
      { title: 'Redis 高可用方案', text: 'Sentinel：監控主庫，自動 Failover，適合中小規模。Cluster：資料分片（16384 個 Slot），自動分片 + Failover，適合大規模。Sentinel vs Cluster 選擇取決於資料規模和是否需要分片。' },
    ],
    interview: [
      { question: 'Redis 為什麼這麼快？', answer: '(1) 純記憶體操作；(2) 單線程避免上下文切換和鎖競爭（6.0 後 IO 多線程，命令執行仍單線程）；(3) 高效資料結構（SDS、ziplist、skiplist）；(4) IO 多路複用（epoll）；(5) C 語言實作的高效能程式碼。單機可達 10 萬+ QPS。', keywords: ['Memory', '單線程', 'IO Multiplexing', 'epoll'] },
      { question: 'Redis 分散式鎖如何實作？有什麼問題？', answer: '基本版：SET key value NX EX ttl。問題：(1) 主從切換時鎖丟失；(2) 鎖過期但業務未完成（需 watchdog 續期）。進階版 Redlock：向 N 個獨立節點加鎖，超過半數成功才算獲鎖，解決單點問題但仍有爭議（Martin Kleppman vs Antirez 之辯）。', keywords: ['SETNX', 'Redlock', 'Watchdog', '鎖過期'] },
      { question: 'Redis Cluster 的 Slot 機制？', answer: 'Redis Cluster 將 Key 空間分成 16384 個 Slot，每個 Key 用 CRC16(key) % 16384 映射到 Slot，每個節點負責部分 Slot。新增節點時遷移部分 Slot 即可。客戶端收到 MOVED 或 ASK 重定向時需更新路由表。Smart Client 在本地維護 Slot 映射避免重定向。', keywords: ['16384 Slot', 'CRC16', 'MOVED', 'ASK'] },
    ],
  },
  'message-queue': {
    concepts: [
      { title: '訊息佇列核心概念', text: '訊息佇列在 Producer 和 Consumer 之間加入 Broker 做緩衝，實現非同步解耦。核心保證：at-most-once（最多一次，可能丟失）、at-least-once（至少一次，可能重複）、exactly-once（恰好一次，最難實現）。大多數系統選擇 at-least-once + 冪等消費。' },
      { title: 'Kafka vs RabbitMQ', text: 'Kafka：分散式日誌，高吞吐（百萬/秒）、持久化、Consumer Group 實現負載均衡，適合事件流、日誌收集。RabbitMQ：傳統 MQ，支援複雜路由（Exchange + Binding）、訊息確認（ACK）、優先佇列，適合任務分發、RPC 模式。' },
      { title: '訊息順序保證', text: 'Kafka 保證 Partition 內有序，全局有序需只用一個 Partition（犧牲吞吐）。方案：(1) 同一業務 Key 路由到同一 Partition；(2) 應用層排序（帶序號）；(3) 使用 FIFO 佇列（如 SQS FIFO）。大多數場景不需要全局有序。' },
    ],
    interview: [
      { question: '如何保證訊息不丟失？', answer: 'Producer 端：同步發送 + ACK 確認（Kafka acks=all）。Broker 端：持久化到磁碟 + 多副本複製。Consumer 端：處理完業務邏輯後再手動 commit offset（而非自動 commit）。三個環節都不丟才能保證端到端不丟。', keywords: ['acks=all', '持久化', '手動 ACK', '端到端'] },
      { question: '消費積壓（Lag）如何處理？', answer: '(1) 增加 Consumer 實例數（不超過 Partition 數）；(2) 批量消費提升單個 Consumer 吞吐；(3) 臨時擴容：將積壓訊息導到更多 Partition 的臨時 Topic；(4) 根因分析：查看 Consumer 處理邏輯是否有慢查詢或外部依賴瓶頸。', keywords: ['Consumer Lag', 'Partition', '批量', '擴容'] },
      { question: 'Exactly-Once 語義如何實現？', answer: '方案一：Kafka 事務（Producer 事務 + Consumer read_committed）。方案二：Outbox Pattern + CDC，用資料庫事務保證業務操作和訊息發送的原子性。方案三：at-least-once + 冪等消費（用 Message ID 去重），這是最常用的實務做法。', keywords: ['Kafka Transaction', 'Outbox Pattern', 'Idempotent Consumer'] },
    ],
  },
  'event-driven': {
    concepts: [
      { title: '事件驅動架構（EDA）', text: '服務透過發布/訂閱事件通訊，而非直接呼叫。優點：松耦合、易擴展、易添加新功能（只需訂閱事件）。挑戰：事件順序、最終一致性、事件溯源的複雜性。適合微服務架構和需要高度解耦的系統。' },
      { title: 'Event Sourcing', text: '不存儲當前狀態，而是存儲所有狀態變更事件。當前狀態透過重放（Replay）事件序列得到。優點：完整的審計軌跡、可回溯到任意時間點、天然支援事件驅動。缺點：查詢複雜（需搭配 CQRS）、事件 schema 演進困難。' },
      { title: 'CQRS（命令查詢分離）', text: '將寫入（Command）和讀取（Query）分成不同的資料模型和服務。寫入端使用正規化模型保證一致性，讀取端使用反正規化的 View Model 優化查詢效能。搭配 Event Sourcing 時，事件寫入 Event Store，讀取端透過 Projection 建立查詢視圖。' },
    ],
    interview: [
      { question: 'Event Sourcing 的優缺點？', answer: '優點：(1) 完整審計紀錄；(2) 可重建任意歷史狀態；(3) 天然支援 Event-Driven；(4) 寫入效能好（Append Only）。缺點：(1) 查詢需要 Projection 額外建立讀模型；(2) Event Schema 演進困難（需版本控制）；(3) 資料量大時 Replay 慢；(4) 開發複雜度高。', keywords: ['Event Store', 'Replay', 'Projection', 'Append Only'] },
      { question: 'Saga Pattern 如何處理分散式事務？', answer: 'Saga 將長事務拆成一系列本地事務，每個事務有對應的補償操作。兩種實現：(1) Choreography（編舞）：各服務透過事件自行協調；(2) Orchestration（編排）：中央協調者控制流程。失敗時按逆序執行補償操作。Orchestration 更易理解和維護。', keywords: ['Saga', 'Choreography', 'Orchestration', '補償事務'] },
      { question: 'Pub/Sub 和 Message Queue 的差異？', answer: 'MQ（點對點）：訊息只被一個 Consumer 消費，用於任務分發。Pub/Sub（發布訂閱）：訊息被所有 Subscriber 收到，用於事件廣播。Kafka 兼具兩者：同一 Consumer Group 內點對點，不同 Group 間廣播。選擇取決於訊息語義：命令用 MQ，事件用 Pub/Sub。', keywords: ['Point-to-Point', 'Publish-Subscribe', 'Consumer Group'] },
    ],
  },
  'async-processing': {
    concepts: [
      { title: '非同步處理模式', text: '將耗時操作從請求-回應鏈路中剝離，透過 Message Queue 或 Task Queue 異步執行。常見場景：發送通知郵件、影像處理、報表生成、第三方 API 呼叫。回應時回傳 202 Accepted + 任務 ID，客戶端輪詢或 WebSocket 取得結果。' },
      { title: 'Worker Pool 模式', text: '多個 Worker 從佇列中競爭消費任務，實現水平擴展。關鍵設計：任務超時控制、失敗重試（指數退避）、Dead Letter Queue（DLQ）處理多次失敗的任務、任務優先順序、並發限制。Celery（Python）、Sidekiq（Ruby）、Bull（Node）是常見實現。' },
      { title: '冪等性設計', text: '由於 at-least-once delivery 可能導致重複消費，每個任務處理需要冪等。實現方式：(1) 資料庫唯一約束；(2) 用 Redis 記錄已處理的 Message ID；(3) 業務操作設計為天然冪等（如 SET 而非 INCREMENT）；(4) Deduplication Token。' },
    ],
    interview: [
      { question: '什麼場景適合非同步處理？', answer: '(1) 耗時超過用戶可接受延遲（如影像轉碼）；(2) 不影響核心流程的附帶操作（如發通知）；(3) 存在流量突峰需要削峰填谷；(4) 涉及第三方服務呼叫（不確定延遲）。核心原則：如果操作的結果不需要立即回傳給用戶，就適合異步。', keywords: ['削峰填谷', '解耦', 'Best Effort', '202 Accepted'] },
      { question: '如何設計任務重試機制？', answer: '(1) 指數退避：1s → 2s → 4s → 8s...避免衝擊下游；(2) 最大重試次數（通常 3-5 次）；(3) 超過次數進 Dead Letter Queue 人工處理；(4) 區分可重試錯誤（網路超時）和不可重試錯誤（參數錯誤）；(5) 每次重試帶上 Retry-Count Header 用於追蹤。', keywords: ['Exponential Backoff', 'DLQ', 'Retry Strategy'] },
      { question: 'Dead Letter Queue（DLQ）的作用？', answer: 'DLQ 存放多次處理失敗的訊息，防止失敗訊息無限重試阻塞正常訊息。DLQ 中的訊息需要人工介入或自動化腳本處理。設計要點：保留原始訊息內容和失敗原因、設定告警、定期巡檢、提供重新投遞機制。', keywords: ['DLQ', 'Poison Message', '告警', '重投遞'] },
    ],
  },
  'consensus': {
    concepts: [
      { title: 'Raft 共識算法', text: 'Raft 將一致性問題分解為 Leader Election + Log Replication + Safety。節點有三種角色：Leader、Follower、Candidate。Leader 負責接收寫入並複製到 Follower，Follower 心跳超時則發起選舉。只要多數節點存活即可達成共識。' },
      { title: '2PC / 3PC', text: '2PC（兩階段提交）：Coordinator 先 Prepare → 所有參與者回覆 YES → 再 Commit。問題：Coordinator 單點故障會導致參與者永久阻塞。3PC 增加 Pre-Commit 階段減少阻塞，但仍不能完全解決網路分區問題。實務上 Saga Pattern 更常用。' },
      { title: 'Paxos vs Raft', text: 'Paxos 是理論上最先提出的共識算法，正確但難以理解和實現。Raft 是 Paxos 的工程簡化版，透過 Leader 機制簡化流程，更易理解和實作。etcd、Consul 用 Raft，Google Spanner 用 Multi-Paxos。' },
    ],
    interview: [
      { question: '解釋 Raft 的 Leader Election 流程', answer: 'Follower 在 election timeout（隨機 150-300ms）內未收到 Leader 心跳 → 轉為 Candidate → 遞增 term → 向所有節點發 RequestVote → 獲得多數票即成為 Leader → 開始發心跳。隨機 timeout 避免多個 Candidate 同時競選（Split Vote）。', keywords: ['Raft', 'Election Timeout', 'Term', 'Split Vote'] },
      { question: '為什麼需要多數派（Quorum）？', answer: '多數派保證任意兩個 Quorum 必有交集，確保最新寫入不會丟失。N 個節點的 Quorum = ⌊N/2⌋+1，可容忍 ⌊(N-1)/2⌋ 個故障。3 節點容忍 1 故障，5 節點容忍 2 故障。偶數節點沒有意義（4 節點和 3 節點容錯能力相同但成本更高）。', keywords: ['Quorum', '多數派', '容錯數', '奇數節點'] },
      { question: '2PC 的問題和替代方案？', answer: '2PC 問題：(1) 同步阻塞：所有參與者在 Prepare 後持鎖等待；(2) Coordinator 單點故障；(3) 效能差。替代方案：Saga Pattern（最常用）、TCC（Try-Confirm-Cancel）、本地訊息表 + MQ、Outbox Pattern。選擇取決於一致性要求。', keywords: ['2PC', 'Saga', 'TCC', 'Outbox Pattern'] },
    ],
  },
  'distributed-coordination': {
    concepts: [
      { title: '分散式鎖', text: '分散式鎖確保多個進程/機器中只有一個能持有鎖。Redis 實現：SETNX + TTL；ZooKeeper：臨時順序節點 + Watch。關鍵考量：鎖的可靠性（主從切換丟鎖）、鎖的公平性、鎖的續期（Watchdog）、鎖的可重入性。' },
      { title: 'Redlock 算法', text: '向 N 個獨立 Redis Master 加鎖，超過半數成功且耗時小於鎖有效期才算獲鎖。解決單機 Redis 鎖在主從切換時丟失問題。爭議：Martin Kleppmann 認為 Redlock 在 GC Pause 等場景下仍不安全，建議用 Fencing Token。' },
      { title: '分散式 ID 生成', text: 'Snowflake：時間戳 + 機器 ID + 序列號，64 位、趨勢遞增、去中心化。UUID：128 位、完全去中心化但無序且佔空間。資料庫自增 ID + 號段分配：中心化但效能可控。選擇取決於是否需要有序、ID 長度限制和去中心化程度。' },
    ],
    interview: [
      { question: 'Redis 分散式鎖有什麼問題？', answer: '(1) 主從切換丟鎖：主庫寫入鎖後未同步到從庫就掛了；(2) 鎖過期問題：業務未完成鎖就過期被其他進程獲取（需 Watchdog 續期）；(3) GC Pause 問題：持鎖進程 GC 停頓期間鎖過期；(4) 時鐘跳變影響 TTL。Redlock 解決了 (1) 但 (3)(4) 仍存在。', keywords: ['SETNX', 'TTL', 'Watchdog', 'Fencing Token'] },
      { question: 'Snowflake ID 的結構和優缺點？', answer: '結構：1 bit 符號 + 41 bit 時間戳(69年) + 10 bit 機器 ID(1024台) + 12 bit 序列號(4096/ms)。優點：趨勢遞增適合 B-Tree 索引、去中心化不依賴資料庫、效能極高。缺點：依賴時鐘（時鐘回撥會生成重複 ID）、機器 ID 需要分配管理。', keywords: ['Snowflake', '時間戳', '機器 ID', '時鐘回撥'] },
      { question: 'ZooKeeper 分散式鎖怎麼實現公平鎖？', answer: '(1) 在鎖節點下創建臨時順序節點；(2) 讀取所有子節點並排序；(3) 序號最小的獲得鎖；(4) 非最小的 Watch 前一個節點；(5) 前一個節點刪除時得到通知，檢查自己是否最小。臨時節點保證進程掛掉時鎖自動釋放，避免死鎖。', keywords: ['ZooKeeper', '臨時順序節點', 'Watch', '公平鎖'] },
    ],
  },
  'microservices': {
    concepts: [
      { title: 'Circuit Breaker（熔斷器）', text: '防止級聯故障。三個狀態：Closed（正常放行）→ Open（錯誤超過閾值，直接拒絕，快速失敗）→ Half-Open（冷卻後嘗試放行少量請求探測）。實現框架：Hystrix（已停止維護）、Resilience4j（推薦）、Sentinel。' },
      { title: 'Service Mesh', text: 'Service Mesh（如 Istio + Envoy）在每個服務旁部署 Sidecar Proxy，透明處理服務間通訊：負載均衡、熔斷、重試、mTLS 加密、可觀測性。應用程式只需關注業務邏輯，通訊治理下沉到基礎設施層。' },
      { title: '服務發現（Service Discovery）', text: '服務實例動態註冊到 Registry（如 Consul、Eureka、etcd），消費方從 Registry 查詢可用實例列表。客戶端發現：消費方直接查 Registry 做 LB（Spring Cloud Ribbon）。伺服端發現：透過 LB 代理轉發（Kubernetes Service）。' },
    ],
    interview: [
      { question: 'Circuit Breaker 的三種狀態和工作流程？', answer: 'Closed：正常放行所有請求，監控失敗率。當失敗率超過閾值（如 50%）→ 切換到 Open。Open：所有請求直接拒絕（Fast Fail），避免衝擊故障下游。經過冷卻時間（如 5s）→ 切換到 Half-Open。Half-Open：放行少量請求探測，成功率達標 → 回到 Closed，失敗 → 回到 Open。', keywords: ['Circuit Breaker', 'Fast Fail', 'Half-Open', 'Resilience4j'] },
      { question: '微服務間通訊方式的選擇？', answer: '同步：REST（簡單通用）、gRPC（高效能、強類型）。非同步：Message Queue（Kafka、RabbitMQ），事件驅動解耦。選擇依據：需要即時回應用同步，可以延遲處理用非同步。微服務優先選擇非同步通訊，降低耦合度和級聯故障風險。', keywords: ['同步', '非同步', 'gRPC', 'Event-Driven'] },
      { question: '微服務拆分的原則？', answer: '(1) 按業務領域劃分（DDD Bounded Context）；(2) 單一職責，每個服務做一件事；(3) 數據自治（Database per Service）；(4) 足夠小到一個團隊可以維護，足夠大到有業務意義（Two-Pizza Team）。避免過度拆分導致分散式事務和運維複雜性爆炸。', keywords: ['DDD', 'Bounded Context', 'Database per Service'] },
    ],
  },
  'auth': {
    concepts: [
      { title: 'JWT（JSON Web Token）', text: 'JWT 由 Header.Payload.Signature 三部分組成，自包含用戶資訊。優點：無狀態、減少資料庫查詢。缺點：無法主動撤銷（需配合黑名單）、Token 較大、敏感資訊不應放入 Payload。Access Token 短效（15min），Refresh Token 長效（7天）。' },
      { title: 'OAuth 2.0 授權流程', text: '四種授權模式：Authorization Code（最常用、最安全，適合 Server-Side App）、Implicit（SPA 用，已不推薦）、Client Credentials（服務間通訊）、Resource Owner Password（直接用帳密，已不推薦）。PKCE 擴展讓 Authorization Code 也能安全用於 SPA 和 Mobile App。' },
      { title: 'RBAC vs ABAC', text: 'RBAC（角色型存取控制）：User → Role → Permission，簡單直觀。ABAC（屬性型存取控制）：基於用戶屬性、資源屬性、環境條件的策略引擎，更彈性但複雜。中小系統用 RBAC 足夠，大型企業級系統用 ABAC（如 AWS IAM Policy）。' },
    ],
    interview: [
      { question: 'JWT 的優缺點和安全問題？', answer: '優點：無狀態（無需 Session Store）、跨服務驗證容易、減少資料庫查詢。缺點：無法主動撤銷（除非用黑名單）、Token 較大增加網路開銷。安全問題：必須用 HTTPS、不在 Payload 放敏感資訊、用短效 Access Token + Refresh Token 機制。', keywords: ['JWT', 'Stateless', 'Refresh Token', 'Token Blacklist'] },
      { question: 'OAuth 2.0 Authorization Code 流程？', answer: '(1) 用戶訪問 Client → Client 重定向到 Auth Server 的授權頁面；(2) 用戶授權後 Auth Server 回傳 Authorization Code 到 redirect_uri；(3) Client 用 Code + Client Secret 向 Auth Server 換取 Access Token；(4) Client 用 Access Token 訪問 Resource Server。Code 只能用一次且很短效。', keywords: ['Authorization Code', 'PKCE', 'redirect_uri'] },
      { question: '如何安全存儲密碼？', answer: '(1) 絕對不存明文；(2) 使用 bcrypt/scrypt/Argon2 加鹽雜湊（不要用 MD5/SHA）；(3) 鹽值需對每個用戶唯一且隨機；(4) 設定合理的 Cost Factor（bcrypt rounds=12）。bcrypt 故意設計成慢速，增加暴力破解成本。Rainbow Table 攻擊因個別鹽值而無效。', keywords: ['bcrypt', 'Salt', 'Argon2', 'Rainbow Table'] },
    ],
  },
  'security-vulnerabilities': {
    concepts: [
      { title: 'SQL Injection', text: '攻擊者透過輸入構造惡意 SQL 語句。防禦：(1) Parameterized Query（預處理語句），永遠不要字串拼接 SQL；(2) ORM 框架自動防護；(3) 輸入驗證和白名單過濾；(4) 最小權限原則（資料庫帳號只給必要權限）。' },
      { title: 'XSS（Cross-Site Scripting）', text: '注入惡意 JavaScript 到網頁中。Stored XSS：惡意腳本存入 DB。Reflected XSS：惡意腳本在 URL 參數中。DOM-Based XSS：前端 JavaScript 直接操作 DOM。防禦：輸出轉義（HTML Entity Encoding）、CSP（Content Security Policy）、HttpOnly Cookie。' },
      { title: 'CSRF（Cross-Site Request Forgery）', text: '誘導已登入用戶的瀏覽器發送惡意請求。防禦：(1) CSRF Token（每次請求帶隨機 Token）；(2) SameSite Cookie 屬性；(3) 檢查 Referer/Origin Header；(4) 關鍵操作要求二次驗證。現代框架（Django、Rails）都內建 CSRF 防護。' },
    ],
    interview: [
      { question: 'OWASP Top 10 有哪些？如何防護？', answer: '重點項目：(1) Injection → Parameterized Query；(2) Broken Auth → MFA + Session 管理；(3) XSS → 輸出轉義 + CSP；(4) Insecure Direct Object Reference（IDOR）→ 權限檢查每個請求；(5) Security Misconfiguration → 自動化安全掃描。核心原則：永遠不信任用戶輸入、最小權限、Defense in Depth（縱深防禦）。', keywords: ['OWASP', 'Injection', 'XSS', 'IDOR', '縱深防禦'] },
      { question: 'SQL Injection 的防禦方式？', answer: '最有效的方式是 Parameterized Query（預處理語句），讓資料庫區分 SQL 語句和用戶資料。例如 `SELECT * FROM users WHERE id = ?`，問號是參數佔位符。ORM 框架（如 Sequelize、GORM）自動使用預處理語句。補充防禦：WAF、輸入白名單、最小資料庫權限。', keywords: ['Parameterized Query', 'ORM', 'WAF', '最小權限'] },
      { question: 'XSS 和 CSRF 的差異？', answer: 'XSS 是在目標網站注入惡意腳本，竊取用戶資料（Cookie、Token）；攻擊發生在受害者的瀏覽器中。CSRF 是誘導用戶的瀏覽器發送他不知道的請求，利用用戶已有的身份；攻擊發生在攻擊者的網站上。XSS 防禦用轉義和 CSP，CSRF 防禦用 Token 和 SameSite Cookie。', keywords: ['XSS', 'CSRF', 'CSP', 'SameSite Cookie'] },
    ],
  },
  'rate-limiting': {
    concepts: [
      { title: 'Token Bucket 算法', text: '以固定速率向桶中加入 Token，每次請求消耗一個 Token，桶空則拒絕。優點：允許突發流量（消耗桶中累積的 Token），同時限制平均速率。參數：桶容量（允許的突發量）、添加速率（平均限制速率）。是 API Gateway 最常用的算法。' },
      { title: 'Sliding Window 算法', text: '滑動窗口精確統計單位時間內的請求數。Fixed Window 在窗口邊界有突發問題（兩個窗口交界處瞬間可能超限）。Sliding Window Counter 結合了固定窗口的效率和滑動窗口的精確度，是 Redis 實現限流的常用方式。' },
      { title: 'DDoS 防護策略', text: '多層防護：(1) DNS 層：Anycast 分散攻擊流量；(2) CDN 層：吸收大量靜態請求流量；(3) 網路層：ISP 黑洞路由 + 流量清洗中心；(4) 應用層：Rate Limiting + WAF + Bot Detection。CloudFlare、AWS Shield 提供一站式 DDoS 防護。' },
    ],
    interview: [
      { question: 'Token Bucket 和 Sliding Window 的差異？', answer: 'Token Bucket：允許突發流量（消耗累積 Token），適合需要一定彈性的場景。Sliding Window：嚴格限制單位時間內的請求數，更精確但不允許突發。API Gateway 常用 Token Bucket（如 Nginx limit_req），精確限流場景用 Sliding Window。', keywords: ['Token Bucket', 'Sliding Window', 'Burst', '精確限流'] },
      { question: '分散式限流如何實現？', answer: '(1) 中心化：Redis + Lua 腳本實現原子操作（INCR + EXPIRE），所有實例共用計數器；(2) 每個實例本地限流 + 定時同步到中心（適合允許一定誤差的場景）；(3) API Gateway 層統一限流（如 Kong、Envoy）。中心化方案最精確但 Redis 是性能瓶頸。', keywords: ['Redis Lua', '中心化', 'API Gateway', '分散式'] },
      { question: '如何區別正常流量和惡意流量？', answer: '(1) 基於 IP 的請求頻率異常檢測；(2) User-Agent 和 Header 特徵分析；(3) CAPTCHA 挑戰可疑請求；(4) JavaScript Challenge 阻擋無瀏覽器的 Bot；(5) 行為分析（滑鼠軌跡、點擊模式）。多維度結合使用，單一維度容易被繞過。', keywords: ['Bot Detection', 'CAPTCHA', 'JavaScript Challenge'] },
    ],
  },
  'observability': {
    concepts: [
      { title: '可觀測性三支柱', text: 'Metrics（指標）：量化的時序數據，如 QPS、延遲、錯誤率。用 Prometheus + Grafana。Logs（日誌）：離散的事件記錄，結構化 JSON 格式。用 ELK/EFK Stack。Traces（追蹤）：跨服務請求的完整鏈路。用 Jaeger/Zipkin。三者結合才能完整觀測系統。' },
      { title: 'Prometheus + Grafana', text: 'Prometheus 是 Pull-Based 監控系統，定期從各服務的 /metrics 端點拉取指標。PromQL 做查詢和告警規則。Grafana 做視覺化 Dashboard。關鍵指標 RED：Rate（請求速率）、Error（錯誤比率）、Duration（請求延遲）。' },
      { title: 'Distributed Tracing', text: '分散式追蹤透過 Trace ID 串聯一個請求經過的所有服務。每個服務操作是一個 Span，Span 間有父子關係。OpenTelemetry 是 CNCF 的統一標準，支援 Metrics + Logs + Traces。Context Propagation 透過 HTTP Header 傳遞 Trace Context。' },
    ],
    interview: [
      { question: '如何設計一個完整的監控告警系統？', answer: '(1) 指標收集：Prometheus 拉取服務 Metrics；(2) 日誌聚合：Fluentd/Filebeat → Elasticsearch；(3) 鏈路追蹤：OpenTelemetry → Jaeger；(4) 告警規則：Prometheus Alertmanager，基於 SLO 設定告警；(5) 視覺化：Grafana Dashboard。告警原則：告警需可操作（Actionable），避免 Alert Fatigue。', keywords: ['Prometheus', 'ELK', 'Jaeger', 'SLO', 'Alertmanager'] },
      { question: 'SLI、SLO、SLA 的差異？', answer: 'SLI（Service Level Indicator）：衡量指標，如 P99 延遲。SLO（Service Level Objective）：內部目標，如 P99 延遲 < 200ms。SLA（Service Level Agreement）：對客戶的合約承諾，違反有懲罰。SLI 用來衡量、SLO 用來驅動工程決策、SLA 用來約束商業承諾。SLO 通常比 SLA 更嚴格。', keywords: ['SLI', 'SLO', 'SLA', 'Error Budget'] },
      { question: 'Structured Logging 的最佳實踐？', answer: '(1) 使用 JSON 格式而非純文字；(2) 包含 Trace ID 串聯跨服務請求；(3) 分級別：DEBUG/INFO/WARN/ERROR；(4) 包含上下文：user_id, request_id, service_name；(5) 敏感資訊脫敏；(6) 日誌採樣：高流量下不記錄全部 DEBUG。ELK Stack 建立索引後可快速搜尋和分析。', keywords: ['JSON Log', 'Trace ID', 'Log Level', 'ELK'] },
    ],
  },
  'capacity-planning': {
    concepts: [
      { title: 'Back-of-Envelope Estimation', text: '系統設計面試的必考題。快速估算：DAU × 每人日均請求 = 日請求量 → 除以 86400 = 平均 QPS → ×3 = 峰值 QPS。日請求量 × 平均 Payload = 日儲存量 → × 365 × 保留年數 = 總儲存。面試官看重的是估算思路和量級判斷，不是精確數字。' },
      { title: '常用估算數字', text: '記憶體讀取 ~100ns，SSD 隨機讀取 ~100μs，HDD 隨機讀取 ~10ms，同機房 RTT ~0.5ms，跨區域 RTT ~150ms。Redis 單機 10 萬 QPS，MySQL 單機 1000-5000 QPS，Kafka 單 Broker 10 萬 msg/s。這些數字不需要精確記憶，但量級要對。' },
      { title: '容量規劃流程', text: '(1) 確定業務指標（DAU、讀寫比、資料保留期）；(2) 估算 QPS 和儲存量；(3) 選擇技術方案（單機/叢集/分片）；(4) 預留冗餘（建議利用率上限 70%）；(5) 持續監控和調整。規劃時考慮 3-5 年的增長，避免頻繁重構。' },
    ],
    interview: [
      { question: '如何估算 Twitter 的 QPS 和儲存量？', answer: '假設 DAU 3 億，每人日均看 20 條 Tweet → 讀 QPS = 3億×20/86400 ≈ 69K QPS，峰值 ≈ 200K。每人日均發 0.5 條 → 寫 QPS ≈ 1.7K。每條 Tweet 約 250 Byte，日新增 1.5 億條 ≈ 37GB/天 ≈ 13.5TB/年。這是典型的讀多寫少系統，需要大量 Cache 和 Read Replica。', keywords: ['Back-of-Envelope', 'QPS', '讀寫比', 'Cache'] },
      { question: '系統需要多少台伺服器？', answer: '公式：目標 QPS ÷ 單機 QPS = 基礎數量，× Replication Factor = 含副本數，÷ 0.7（利用率上限）= 建議部署數。例如 200K QPS ÷ 1K（MySQL）= 200 台基礎，× 3 副本 = 600，÷ 0.7 ≈ 857 台。這說明需要 Sharding + Cache 來大幅降低 DB 壓力。', keywords: ['Server Estimation', 'Replication Factor', '利用率'] },
      { question: '2的冪次方估算口訣？', answer: '2^10 ≈ 1K，2^20 ≈ 1M，2^30 ≈ 1G，2^40 ≈ 1T。一天 86400 秒 ≈ 10^5。一年 3000 萬秒 ≈ 3×10^7。1 char = 1 Byte，1 int = 4 Bytes。100 萬用戶 × 1KB/人 = 1GB。面試時用 10 的冪次快速估算，不需要精確計算。', keywords: ['2的冪', '86400', '量級估算'] },
    ],
  },
  'devops': {
    concepts: [
      { title: 'CI/CD Pipeline', text: '持續整合（CI）：每次 commit 自動觸發 Build → Test → Lint。持續部署（CD）：通過所有檢查後自動部署到 Staging/Production。工具：GitHub Actions、GitLab CI、Jenkins。核心原則：快速回饋、可重複、不可變部署（Immutable Deployment）。' },
      { title: '部署策略', text: 'Rolling Update：逐步替換舊版本 Pod。Blue-Green：新舊版本並存，流量一次切換。Canary（金絲雀）：先導流小比例流量到新版本驗證，確認無誤再全量。A/B Testing：按用戶特徵分流，用於功能實驗。Kubernetes 原生支援 Rolling Update，Istio 支援 Canary。' },
      { title: 'Infrastructure as Code（IaC）', text: '用程式碼管理基礎設施：Terraform 管理雲端資源、Ansible 管理伺服器配置、Helm 管理 Kubernetes 部署。優點：版本控制、可重複、可審計、團隊協作。GitOps 將 IaC 與 Git 工作流結合，Argo CD 是 Kubernetes GitOps 的標準工具。' },
    ],
    interview: [
      { question: 'Blue-Green 和 Canary 部署的差異？', answer: 'Blue-Green：準備完整的新環境，一次切換所有流量，回滾快速（切回舊環境），但需要雙倍資源。Canary：漸進式導流（1% → 10% → 50% → 100%），風險更低，資源效率更高，但部署時間較長。高風險變更用 Canary，需要快速驗證用 Blue-Green。', keywords: ['Blue-Green', 'Canary', 'Rollback', '漸進式'] },
      { question: 'Docker 和 Kubernetes 的關係？', answer: 'Docker 是容器運行時（Container Runtime），負責打包和運行單個容器。Kubernetes 是容器編排平台，管理多個容器的部署、擴縮容、服務發現、負載均衡、滾動更新。類比：Docker 是貨櫃，Kubernetes 是港口調度系統。', keywords: ['Docker', 'Kubernetes', 'Container Orchestration'] },
      { question: 'GitOps 的核心理念？', answer: '「Git 作為唯一的事實來源」。所有基礎設施和應用配置都存在 Git 中，任何變更都透過 PR 審核。Argo CD / Flux 監控 Git Repo，發現差異時自動同步到 Kubernetes 叢集。優點：完整的變更歷史、聲明式管理、自動漂移修復。', keywords: ['GitOps', 'Argo CD', 'Declarative', 'Single Source of Truth'] },
    ],
  },
}

export default topicContent
