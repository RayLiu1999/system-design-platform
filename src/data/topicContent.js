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
      { title: '索引設計的實戰陷阱', text: '教科書說「加索引加速查詢」，但生產中常踩的坑：(1) 隱式類型轉換 — WHERE user_id = "123" 對 INT 欄位觸發全表掃描（函數作用在索引列上導致索引失效）；(2) 複合索引順序錯誤 — INDEX(a, b, c) 只對 WHERE a=? 和 WHERE a=? AND b=? 有效，WHERE b=? 無法使用（最左前綴原則）；(3) 覆蓋索引（Covering Index）— 查詢的欄位全在索引中時，不需要回表查主鍵索引（Extra: Using index），可把 SELECT * 改成精確 SELECT 欄位大幅提升效能。' },
      { title: 'MVCC 與 Long Transaction 陷阱', text: 'InnoDB 的 MVCC 讓讀不阻塞寫，但有隱藏代價：每個長事務持有一個 Read View，阻止 undo log 清理。如果某個事務 10 小時沒 commit（如忘記關閉的 DB 連線），undo log 會膨脹到數百 GB，所有查詢都需要遍歷極長的版本鏈。症狀：查詢突然變慢 + 磁碟空間暴增。排查：SHOW ENGINE INNODB STATUS 看 History list length；防範：設定 wait_timeout 和 interactive_timeout 自動斷開閒置連線。' },
      { title: 'MySQL 死鎖的排查與預防', text: '死鎖場景：事務 A 鎖住行 1 等待行 2，事務 B 鎖住行 2 等待行 1。InnoDB 會偵測到死鎖並主動 rollback 其中一個事務。排查流程：SHOW ENGINE INNODB STATUS 查看 LATEST DETECTED DEADLOCK。預防策略：(1) 固定加鎖順序 — 所有事務按 ID 升序鎖定；(2) 減小事務範圍 — 盡快 commit/rollback；(3) 避免「邊查邊改」的 Range Lock — 用明確的 WHERE id IN (...) 替代 WHERE status = ?。Gap Lock 是 MySQL RR 級別下導致意外死鎖的常見元兇。' },
    ],
    interview: [
      { question: '你的慢查詢日誌顯示一條 SQL 執行了 30 秒，EXPLAIN 發現走了全表掃描。但你明明建了索引。為什麼？', answer: '常見原因排查：(1) 隱式類型轉換 — 欄位是 VARCHAR 但 WHERE 條件傳了 INT，或反之；(2) 對索引列使用了函數 — WHERE DATE(created_at) = "2024-01-01" 改成 WHERE created_at BETWEEN ... AND ...；(3) OR 條件 — WHERE a = 1 OR b = 2 無法同時使用兩個索引，改用 UNION；(4) 資料分佈問題 — 索引選擇性太低（如 status 只有 3 種值，MySQL 優化器判斷全表掃描更快）；(5) 索引已建但未生效 — ANALYZE TABLE 更新統計資訊，或 FORCE INDEX 強制使用。', keywords: ['EXPLAIN', '隱式類型轉換', '索引失效', 'FORCE INDEX'] },
      { question: '你的系統在凌晨跑批次報表時，線上用戶的寫入 QPS 從 5000 降到 500。什麼原因？', answer: '可能原因：(1) 行鎖競爭 — 報表的大範圍 SELECT 在 Serializable 級別會導致 Shared Lock 阻塞 UPDATE。解法：報表查詢走 Read Replica 或用 SET 讀取快照隔離（RR 級別 + START TRANSACTION WITH CONSISTENT SNAPSHOT）；(2) Buffer Pool 被報表查詢沖洗 — 報表掃描大量冷數據，把 Buffer Pool 中的熱數據擠出去。解法：innodb_old_blocks_time 設定讓全表掃描的頁面不會污染 LRU Young 區；(3) CPU/IO 被吃滿 — pt-query-digest 分析 CPU/IO 瓶頸，報表 SQL 加 LIMIT 分頁或提前匯入 OLAP 系統（ClickHouse、BigQuery）。', keywords: ['Buffer Pool 污染', 'Read Replica', 'OLAP', '鎖競爭'] },
      { question: '如何安全地刪除一張上億行的大表中符合條件的 1 千萬行資料？', answer: '絕對不要 DELETE FROM big_table WHERE ... 一次刪完 — 會鎖表、Redo/Undo Log 暴增、主從延遲飆升。正確做法：(1) 分批刪除 — 每次 DELETE ... LIMIT 1000 + SLEEP(0.1) 控制速度；(2) 用 pt-archiver — Percona 的工具，自動分批刪除且可歸檔到另一張表；(3) Rename + 新表 — CREATE 新表只 INSERT 要保留的資料，再 RENAME TABLE 交換。適合要刪除超過 50% 資料的場景；(4) Partition Drop — 如果表已按時間 Partition，直接 ALTER TABLE DROP PARTITION 瞬間完成。設計階段就要考慮資料生命週期管理。', keywords: ['分批刪除', 'pt-archiver', 'RENAME TABLE', 'Partition'] },
    ],
  },
  'nosql-db': {
    concepts: [
      { title: 'DynamoDB 單表設計的精髓', text: '關聯式 DB 按「正規化」拆表，DynamoDB 的最佳實踐是「單表設計」— 把所有實體（User、Order、Product）放在同一張表，用 PK/SK 的命名規則區分（如 PK=USER#123 SK=ORDER#456）。好處：一次 Query 拿到所有關聯資料（無 JOIN 開銷），完美利用 Partition。代價：查詢模式必須預先設計（Access Pattern First），後期加新查詢模式需要 GSI（Global Secondary Index）。這和 SQL 的「先建 Schema 再寫查詢」完全相反。' },
      { title: 'MongoDB 的效能陷阱', text: '常見生產問題：(1) Unbounded Array — 文件中嵌入無限增長的陣列（如 Post.comments[]），文件超過 16MB 限制或頻繁遷移 chunk 導致寫入效能暴降。解法：拆成獨立 Collection 用 Reference；(2) 缺少索引的 Aggregation Pipeline — $lookup（類似 JOIN）在大 Collection 上極慢。解法：Pre-join 在寫入時冗餘需要的欄位；(3) WiredTiger Cache 壓力 — 預設只用 50% RAM，大 Working Set 會導致頻繁磁碟 IO。' },
      { title: 'LSM-Tree vs B-Tree：寫密集型場景', text: 'B-Tree（MySQL、PostgreSQL）：每次寫入直接修改磁碟上的 Page，隨機 IO 多，讀快寫慢。LSM-Tree（Cassandra、RocksDB、LevelDB）：寫入先進 MemTable（記憶體），滿了 Flush 到磁碟的 SSTable（順序 IO），讀取時 Merge 多層 SSTable。LSM-Tree 寫入快 10 倍，但有 Write Amplification（同一份資料在 Compaction 過程中被反覆寫入磁碟）和 Space Amplification（多層副本共存）。TiDB 的底層 TiKV 用 RocksDB LSM-Tree，就是看中它的寫入效能。' },
    ],
    interview: [
      { question: '你的 MongoDB 查詢在資料量從 100 萬成長到 1 億後變得極慢。已經有索引了，為什麼？', answer: '深入排查：(1) Working Set 超過 RAM — explain() 看 nReturned vs totalDocsExamined，如果 totalDocsExamined 遠大於 nReturned 說明掃描了太多文件。WiredTiger 的快取不夠裝整個索引 → 頻繁磁碟 IO；(2) Index Size 超過 RAM — db.collection.totalIndexSize() 檢查，如果索引本身就比記憶體大，B-Tree 遍歷全走磁碟；(3) Schema 設計問題 — 嵌套文件過深導致反覆 decompress。解法：加 RAM、拆 Collection 做 Sharding、重新設計 Schema 降低單文件大小。', keywords: ['Working Set', 'WiredTiger', 'totalDocsExamined', 'Index Size'] },
      { question: '什麼時候該用 Cassandra 而不是 MongoDB？', answer: '信號指標：(1) 寫入 QPS > 10 萬且不斷成長 — Cassandra 的 LSM-Tree 寫入效能遠勝 MongoDB 的 WiredTiger B-Tree；(2) 需要線性水平擴展 — Cassandra Masterless 架構加節點即線性增加吞吐，MongoDB 的 Sharding 需要 Config Server + Mongos 架構更重；(3) 可以接受 AP（最終一致性）— Cassandra 的 Tunable Consistency（ONE/QUORUM/ALL）可調；(4) 查詢模式簡單且固定 — Cassandra 的 Primary Key 決定查詢路徑，沒有 Secondary Index 的靈活性。反之，需要豐富查詢、Aggregation、事務（4.0+ Multi-Document Transaction）的場景選 MongoDB。', keywords: ['LSM-Tree', 'Masterless', 'Tunable Consistency', 'Write-Heavy'] },
      { question: '你的團隊在爭論新專案該用 PostgreSQL 還是 MongoDB。你怎麼決定？', answer: '決策框架：(1) 資料模型 — 如果資料有明確的關聯性（用戶-訂單-商品），SQL 的 JOIN 和外鍵約束比手動 Reference 安全得多；如果資料是半結構化（IoT 感測資料、內容管理系統），MongoDB 的彈性 Schema 更適合；(2) 一致性需求 — 需要 ACID 事務（金融、電商核心流程）→ PostgreSQL；可以接受最終一致性 → MongoDB；(3) 查詢模式 — 需要 Ad-hoc Query + 複雜分析 → PostgreSQL；查詢模式固定且 Document 導向 → MongoDB；(4) 團隊經驗 — 不要低估 Learning Curve 的成本。PostgreSQL 14+ 已原生支援 JSONB，很多場景不需要另起 MongoDB。', keywords: ['PostgreSQL JSONB', '資料模型', 'ACID', '決策框架'] },
    ],
  },
  'db-scaling': {
    concepts: [
      { title: '主從複製的延遲炸彈', text: '非同步複製延遲（Replication Lag）看起來平常只有 100ms，但在以下場景會突然飆升到分鐘級：(1) 大事務 — 一次 UPDATE 100 萬行，Master 瞬間完成但 Slave 要逐行 replay；(2) DDL 操作 — ALTER TABLE 在 Slave 上是阻塞的；(3) Slave IO/CPU 瓶頸 — Slave 規格比 Master 低是常見錯誤。後果：用戶剛下單成功，刷新頁面查不到訂單（讀 Slave 延遲）。解法：「寫後讀一致性」— 寫入成功後 3 秒內強制讀 Master，之後走 Slave。ProxySQL 可以自動管理這個邏輯。' },
      { title: 'Sharding 前該做的 Checklist', text: 'Sharding 是最後手段，先確認：(1) SQL 優化了嗎？ — Slow Query Log + EXPLAIN 看了嗎？(2) 索引建對了嗎？(3) 讀寫分離了嗎？ — Read Replica 能分擔 80%+ 的讀壓力；(4) 快取加了嗎？ — Redis 能擋住大部分熱點查詢；(5) 垂直拆分了嗎？ — 把大表的 TEXT/BLOB 欄位拆到獨立表。如果以上都做了還不夠，才考慮 Sharding。Sharding 後跨 Shard JOIN 不可能、分散式事務需要 Saga、全局排序需要額外設計，運維複雜度翻 5 倍。' },
      { title: 'Online Resharding：Shard Key 選錯了怎麼辦？', text: '場景：初期按 user_id Sharding，後來業務需要按 merchant_id 查詢，每次查詢要 Scatter-Gather 所有 Shard，效能極差。Resharding 方案：(1) 雙寫策略 — 同時寫入新舊 Sharding 方式，驗證一致性後切讀取到新方式；(2) Vitess（YouTube 開源的 MySQL Sharding 中間層）— 支援 Online Resharding，透過 VReplication 流式遷移資料，業務零感知；(3) 放棄 Sharding 改用 NewSQL — TiDB 的分散式事務 + 自動 Region Split 免手動 Sharding。教訓：Sharding Key 的選擇幾乎不可逆，必須在設計階段就對齊所有查詢模式。' },
    ],
    interview: [
      { question: '你的服務用 user_id 做 Shard Key，但有一個 API 需要按 created_at 範圍查詢所有 Shard 的資料，怎麼辦？', answer: '這是 Scatter-Gather 問題 — 查詢必須廣播到所有 Shard 再合併。短期方案：(1) 如果結果集小 — 並行查詢所有 Shard 再 Application 層合併排序，延遲等於最慢的 Shard；(2) 加 GSI（Global Secondary Index）— 按 created_at 建立一張索引表（created_at → user_id + shard_id），先查索引再精確查目標 Shard。長期方案：(1) 非同步同步到 Elasticsearch — 用 CDC（如 Debezium）將寫入事件同步到 ES，複雜查詢走 ES；(2) 建立 OLAP 副本 — 用 ClickHouse/BigQuery 處理分析查詢，OLTP 和 OLAP 分離。核心原則：Shard Key 決定了哪些查詢快、哪些查詢慢，無法兩全。', keywords: ['Scatter-Gather', 'GSI', 'CDC', 'OLAP 分離'] },
      { question: '社交應用的用戶表有 5 億行，主鍵是自增 ID。為什麼不適合做 Shard Key？', answer: '自增 ID 做 Range Sharding 的致命問題：新用戶全部寫入最後一個 Shard（Hot Shard），前面的 Shard 幾乎沒有新寫入。Hash Sharding 可以解決分佈不均，但自增 ID 本身有信息洩漏問題（競爭對手可以推算用戶量）。更好的選擇：(1) Snowflake ID — 趨勢遞增（B-Tree 友好）但 Hash 後均勻分佈，且包含時間信息方便 Debug；(2) ULID — 字典序和時間序一致，可排序。如果已經用了自增 ID 且不想改，Hash Sharding + user_id 就能解決 Hot Shard 問題。', keywords: ['Hot Shard', '自增 ID', 'Snowflake', 'ULID'] },
      { question: '你接手了一個沒有 Sharding 的數據庫，單表 10 億行，如何安全遷移到 Sharded 架構？', answer: '三階段遷移法（Zero Downtime）：Phase 1 — 雙寫：新寫入同時寫舊庫和新 Sharded 庫，讀取仍走舊庫。Phase 2 — 歷史資料搬遷：用 Background Worker 批量遷移舊資料到新庫，搬遷完成後對比一致性（checksum）。Phase 3 — 切讀：灰度切換讀取到新庫（先 1% 驗證 → 10% → 100%），確認無誤後停止雙寫，下線舊庫。工具：Debezium CDC 做雙寫比手動程式碼可靠。關鍵：每個 Phase 都要可回滾，切忌一步到位。整個過程通常需要 2-4 週。', keywords: ['雙寫', 'CDC', '灰度切讀', 'Checksum'] },
    ],
  },
  'cache-strategy': {
    concepts: [
      { title: 'Cache-Aside 的隱藏 Race Condition', text: '標準 Cache-Aside 的「先更新 DB 再刪除 Cache」仍有極端 Race Condition：Thread A 讀 Cache Miss → 查 DB 得到舊值 → Thread B 更新 DB → Thread B 刪除 Cache → Thread A 將舊值寫入 Cache。結果：Cache 中是過期資料。發生條件苛刻（讀比寫慢），但在高併發下確實會遇到。解法：延遲雙刪（Double Delete）— 更新 DB 後先刪 Cache，500ms 後再刪一次。或用 Canal/Debezium 監聽 Binlog 做 Cache 失效（最可靠）。' },
      { title: 'Write-Behind 的資料遺失案例', text: '場景：電商購物車用 Write-Behind（寫入 Redis，異步 Batch 寫回 MySQL）。某天 Redis 節點掛了，丟失最近 5 分鐘的購物車修改。教訓：Write-Behind 必須搭配：(1) AOF fsync=everysec（最多丟 1 秒）；(2) 雙寫 Redis Instance（Primary + Shadow）；(3) 降級方案 — Redis 掛了改同步寫 DB。純寫後模式只適合「丟了不致命」的場景（如計數器、瀏覽記錄），不適合訂單、支付等核心數據。' },
      { title: 'Hot Key 問題', text: '單個 Key 被百萬 QPS 訪問（如微博熱搜、秒殺商品），即使有 Redis 單一 Key 也只能走一個 Slot 的一個節點。解法：(1) Local Cache — 熱點 Key 在每台應用伺服器做 L1 本地快取（Caffeine），TTL 設短（1-5 秒）防止不一致；(2) Key 打散 — 將 hot_key 拆成 hot_key_1 ~ hot_key_10，讀取時隨機選一個，分散到不同 Slot/節點；(3) 用 Redis Proxy（如 Twemproxy）做本地快取。監控：用 redis-cli --hotkeys 或 OBJECT FREQ 偵測熱點。' },
    ],
    interview: [
      { question: '你的電商系統在做促銷活動時，Redis QPS 從平常的 5 萬飆到 50 萬，某些 Key 延遲暴增。如何緊急處理？', answer: '緊急處理 SOP：(1) 確認是否是 Hot Key — redis-cli --bigkeys + MONITOR 觀察。若確認是某個商品 Key → 本地快取 + Key 打散。(2) 確認是否是 Big Key — 某個 Hash/List 太大。超過 10K 個 member 的 Set 做 pipeline 拆分。(3) 確認是否是記憶體不足 — INFO memory 看 used_memory 是否接近 maxmemory。即時加記憶體或清理冷數據。(4) 確認網路瓶頸 — Redis 節點與應用的 RTT 是否異常。長期優化：多級快取（L1 Local + L2 Redis）、讀寫分離（Read Replica）、按業務拆分 Redis Cluster。', keywords: ['Hot Key', 'Big Key', '多級快取', '緊急 SOP'] },
      { question: 'Cache 和 DB 的雙寫一致性有幾種方案？各自的取捨？', answer: '四種方案比較：(1) 先更新 DB → 刪 Cache（Cache-Aside）— 最常用，極端 race condition 可用延遲雙刪緩解；(2) 先刪 Cache → 更新 DB — 高併發下容易回填舊值，不推薦；(3) 先更新 DB → 更新 Cache — 並發寫入導致 Cache 值錯亂，不推薦；(4) Binlog 訂閱（Canal/Debezium）→ 異步刪 Cache — 最可靠但引入組件複雜度，延遲 100-500ms。選擇依據：大部分場景用方案 1 足夠；金融級一致性需求用方案 4；方案 2 和 3 都不建議使用。', keywords: ['延遲雙刪', 'Canal', 'Binlog', '雙寫一致性'] },
      { question: '如何設計一個千萬級別的排行榜系統？', answer: '核心資料結構：Redis Sorted Set（ZSet）— ZADD、ZRANGEBYSCORE、ZREVRANK 都是 O(log N)。億級 ZSet 單 Key 大約佔用 10GB 記憶體。拆分策略：(1) 按時間分 Key — daily_rank_20240301、weekly_rank_2024w13；(2) 按分數段分 Key — rank_0_1000、rank_1000_10000。更新方式：實時型 — 每次操作直接 ZINCRBY；延遲型 — 先寫 DB，定時 Batch 更新 ZSet。並發安全：ZINCRBY 是原子操作，天然線程安全。展示：ZREVRANGE key 0 9 WITHSCORES 獲取 Top 10。', keywords: ['Sorted Set', 'ZINCRBY', '按時間分 Key', '原子操作'] },
    ],
  },
  'cache-problems': {
    concepts: [
      { title: '快取穿透的生產案例', text: '場景：電商系統被爬蟲用隨機不存在的商品 ID 攻擊，每秒 10 萬次查詢全部穿透到 MySQL。解法層次：(1) 入口攔截 — ID 格式校驗（Snowflake ID 校驗 timestamp 範圍），不合法直接拒絕；(2) 布隆過濾器 — 系統啟動時載入所有商品 ID 到 Bloom Filter，不存在的 ID 直接攔截。注意 False Positive Rate（10 億條資料、0.1% 誤判率需約 1.67GB 記憶體）；(3) 快取空值 — 穿透的 Key 在 Redis 設 null 值 + TTL 60s，防止同一 Key 反覆穿透。三層防護缺一不可。' },
      { title: '快取擊穿的互斥鎖實踐', text: '使用 Redis SETNX 做互斥鎖：GET key → MISS → SETNX lock_key → 成功 → 查 DB → SET key → DEL lock_key。未搶到鎖的請求 SLEEP 50ms 後重新 GET key。陷阱：(1) 鎖必須設 TTL（防止持有者掛了導致死鎖），建議 3-5 秒；(2) 用 Lua 腳本保證「比較 owner + 刪除」是原子操作（防誤刪他人的鎖）；(3) 永不過期 + 邏輯過期方案更優 — 在 Value 中存 { data, expireAt }，過期時異步更新而非刪除。' },
      { title: '快取雪崩的全鏈路防護', text: '真實事故：某支付系統 Redis 主從切換花了 2 分鐘，期間所有快取失效，MySQL 連線池瞬間打滿，全站不可用 30 分鐘。全鏈路防護：(1) Redis 層 — Cluster 部署，跨 AZ 副本；(2) 應用層 — 對 DB 呼叫加 Circuit Breaker，超過閥值直接降級回傳空/預設值；(3) DB 層 — 連線池設 Max Wait Timeout，超時直接拒絕不排隊；(4) 全局 — TTL 加隨機偏移（base_ttl + random(0, 300)），避免批量同時過期。' },
    ],
    interview: [
      { question: '快取穿透、擊穿、雪崩同時發生怎麼辦？', answer: '同時發生的場景：Redis 掛了（雪崩）+ 大量新用戶（穿透，ID 不在布隆過濾器中）+ 恢復後熱點 Key 被大量訪問（擊穿）。核心是「防止 DB 被壓垮」：(1) 限流 — API Gateway 對 DB 查詢做全局 Rate Limit（如 5000 QPS 上限）；(2) 降級 — 非核心服務直接返回靜態 Fallback 數據；(3) 啟動策略 — Redis 恢復後先 Pre-warming（從 DB 預載入 Top 1000 Hot Key），再逐步放行流量。最重要的是熔斷機制：只要 DB 連線池使用率 > 80%，自動觸發全局限流。', keywords: ['Pre-warming', '全局限流', '熔斷', '三者並發'] },
      { question: '多級快取（L1 Caffeine + L2 Redis）修改資料但頁面一直顯示舊值，如何排查？', answer: '排查流程：(1) 確認 Redis 中的值是否最新 — Redis 已更新但頁面舊值 → L1 Local Cache 未失效；(2) 檢查 L1 失效機制 — 是否有 Redis Pub/Sub 通知？Channel 正確嗎？(3) 特定實例問題 — 可能只有某幾台實例的 L1 未收到失效通知。解法：(1) L1 TTL 設短（5-10 秒）作為保底；(2) Redis Pub/Sub 不可靠（網路抖動可能丟訊息），改用 Redis Stream + Consumer Group 做可靠廣播；(3) 核心數據不用 L1 — 只對「允許幾秒延遲」的數據使用 L1。', keywords: ['L1 失效', 'Redis Pub/Sub', 'TTL 保底', '多級快取一致性'] },
      { question: '布隆過濾器刪除了商品後，Bloom Filter 能同步刪除嗎？', answer: '標準 Bloom Filter 不支援刪除 — 一個 Bit 可能被多個 Key 共享，刪除某個 Key 會影響其他 Key 的判斷。解法：(1) Counting Bloom Filter — 每個 Bit 換成 Counter，刪除時 Counter 減 1，但記憶體翻 4-8 倍；(2) Cuckoo Filter — 支援刪除且空間效率更好，Redis 的 RedisBloom 模組支援 CF.ADD / CF.DEL；(3) 定期重建 — 每天凌晨從 DB 重新建立 Bloom Filter，Simple & Reliable。大部分場景方案 3 最實用。', keywords: ['Counting Bloom Filter', 'Cuckoo Filter', '定期重建', '刪除問題'] },
    ],
  },
  'redis': {
    concepts: [
      { title: 'Redis 記憶體優化實戰', text: '生產中 Redis 記憶體常常比預期大 2-3 倍。原因：(1) Key 本身佔記憶體 — 命名規範用短前綴（u:123 而非 user:profile:123）在百萬 Key 場景可省 30% 記憶體；(2) 小 Hash 用 ziplist 編碼（hash-max-ziplist-entries 512, value 64 bytes），超出閾值自動轉 hashtable（記憶體翻 5 倍）；(3) 用 Hash 替代大量 String — 把 user:1:name, user:1:age 合併成一個 Hash user:1，減少 Key 數量和 Redis 物件頭開銷。Instagram 用此技巧將 3 億 KV 的記憶體從 70GB 降到 5GB。' },
      { title: 'Big Key 的隱性風險', text: '單個 Key 的 Value 超過 10MB 就算 Big Key。風險：(1) DEL Big Key 會阻塞 Redis 主線程數秒（Redis 是單線程！）→ 期間所有請求超時；(2) Big Key 所在 Slot 的節點記憶體和網路壓力集中。排查：redis-cli --bigkeys 定期掃描。解法：(1) 用 UNLINK 替代 DEL（後台線程異步刪除，Redis 4.0+）；(2) Hash/Set/List 類型用 HSCAN/SSCAN 分批刪除；(3) 設計階段控制 Value 大小 — 不要把整個用戶好友列表塞進一個 Set，超過 1 萬個 member 就分片（friends:user123:0, friends:user123:1）。' },
      { title: 'Pipeline vs Lua vs Transaction', text: '三者都是批量操作的方式但用途不同。Pipeline：打包多條命令一次發送，減少 RTT，但不保證原子性（命令間可能被其他 Client 插入）。Transaction（MULTI/EXEC）：保證原子執行但不保證隔離性，且不支援條件判斷（Check-and-Set 需用 WATCH）。Lua Script：在 Server 端原子執行複雜邏輯（if-else, loop），最強大但 Lua 執行期間阻塞所有請求。場景：簡單批量讀寫用 Pipeline，需要原子 Check-and-Set 用 Lua，事務用得少（Lua 幾乎可以替代）。' },
    ],
    interview: [
      { question: '你的 Redis 記憶體使用率突然從 60% 飆到 95%，如何緊急排查和處理？', answer: '緊急排查 SOP：(1) INFO memory 看 used_memory 和 maxmemory；(2) redis-cli --bigkeys 找 Big Key；(3) OBJECT ENCODING key 檢查是否有大量 Key 從 ziplist 轉成了 hashtable/skiplist（某次寫入超出閾值導致自動轉換）；(4) DBSIZE 看 Key 總數是否異常增長（可能有程式 Bug 導致 Key 洩漏）。緊急處理：(1) 淘汰策略改 allkeys-lru 自動淘汰冷 Key；(2) 用 SCAN 批量刪除已知的臨時 Key（如過期未清理的 Session）；(3) 如果是 Big Key 導致，用 UNLINK 異步刪除。長期：加 Key TTL 管理規範、記憶體使用率告警設 70% 閾值。', keywords: ['INFO memory', 'Big Key', 'allkeys-lru', 'UNLINK'] },
      { question: 'Redis 6.0 的多線程到底改了什麼？是否破壞了單線程模型？', answer: '核心澄清：Redis 6.0 的多線程只用於 IO（網路讀寫），命令執行仍然是單線程。改進原因：Redis 的瓶頸不是 CPU 而是網路 IO — 在 10GbE 網卡下，單線程處理 TCP 讀寫成為瓶頸。開啟 io-threads 後，多個 IO 線程並行處理網路收發，但命令仍由主線程串行執行，所以不需要加鎖、不破壞原子性保證。效能提升：在高並發小 Value 場景可提升 50-100% 吞吐。大部分場景不需要開啟 — 單線程 Redis 已經可以達到 10 萬+ QPS。', keywords: ['IO 多線程', '命令單線程', '10GbE 瓶頸', '原子性不變'] },
      { question: '什麼場景下應該用 Redis Cluster 而不是 Sentinel？', answer: '決策依據：(1) 資料量 — 單機記憶體裝不下（> 32GB）必須 Cluster 做資料分片；(2) QPS — 單機 10 萬+ QPS 瓶頸必須分片。如果資料量和 QPS 都在單機範圍內，Sentinel 更簡單（無 Slot 映射、無 CROSSSLOT 限制）。Cluster 的代價：多 Key 操作必須在同一 Slot（用 Hash Tag {user}:profile {user}:settings 強制同 Slot）、MGET 跨 Slot 需要 Client 拆分、Lua Script 涉及的所有 Key 必須在同一 Slot。小團隊建議先用 Sentinel + 垂直擴展，真正需要時再遷移 Cluster。', keywords: ['Sentinel vs Cluster', 'Hash Tag', 'CROSSSLOT', '資料量決策'] },
    ],
  },
  'message-queue': {
    concepts: [
      { title: 'Kafka 的雙寫問題與 Outbox Pattern', text: '典型場景：下單服務需要「寫入 DB + 發送 Kafka 訊息」。問題：如果 DB 寫成功但 Kafka 發送失敗，或 Kafka 發送成功但 DB 回滾，兩者就不一致。Outbox Pattern 解法：(1) 業務操作和「寫入 Outbox 表」放在同一個 DB 事務中（保證原子）；(2) 獨立的 CDC（Change Data Capture）進程（如 Debezium）監聽 Outbox 表的 Binlog，將新行發送到 Kafka；(3) 發送成功後標記 Outbox 行已處理。核心思想：用 DB 事務保證「業務 + 訊息」原子，用 CDC 保證「最終」投遞到 MQ。' },
      { title: 'Consumer Rebalance 風暴', text: '場景：Kafka Consumer Group 有 10 個 Consumer，某台掛了 → 觸發 Rebalance → 所有 Consumer 暫停消費（Stop-The-World）→ Rebalance 完成前消息積壓飆升。更糟：如果 Consumer 處理慢導致 session.timeout.ms 超時 → 被踢出群組 → 又觸發 Rebalance → 惡性循環。解法：(1) 調大 session.timeout.ms 和 max.poll.interval.ms；(2) 使用 CooperativeStickyAssignor 取代 Eager Rebalance — 只遷移變動的 Partition 而非全部重新分配；(3) Static Group Membership — Consumer 重啟後回到原來的 Partition，避免觸發 Rebalance。' },
      { title: 'Kafka 訊息積壓的多層解法', text: '消費積壓（Consumer Lag > 100 萬）的排查決策樹：(1) 單個 Consumer 吞吐不夠 → 先檢查消費邏輯是否有 DB 慢查詢或同步 HTTP 呼叫 → 改成 Batch 消費 + 非同步處理。(2) Consumer 數量不夠 → 增加 Consumer（上限 = Partition 數量）→ 如果 Partition 數也不夠，擴 Partition（注意：擴 Partition 後基於 Key 的順序保證會受影響）。(3) 臨時緊急方案 → 建立臨時 Topic（Partition 數量是原來的 10 倍），將積壓訊息轉發到臨時 Topic，大量 Consumer 並行消費。' },
    ],
    interview: [
      { question: '你的訂單服務需要同時寫 DB 和發 Kafka 訊息，如何保證一致性？', answer: '這就是經典的「雙寫問題」。錯誤做法：DB 寫完 → Try-Catch 發 Kafka → DB 回滾的話 Kafka 訊息已經發出去了，無法收回。正確方案層次：(1) Outbox Pattern（推薦）— 業務 + Outbox 表寫入在同一事務中，Debezium CDC 監聽 Outbox 表的 Binlog 發送到 Kafka。最可靠但需要維護 CDC 組件。(2) 事務訊息 — RocketMQ 原生支援（Half Message + Commit），Kafka 不直接支持。(3) 本地訊息表 + 定時任務 — 業務 + 訊息表同事務寫入，定時任務輪詢未發送的訊息，發成功後標記已處理。簡單但有延遲。核心原則：不要同時依賴兩個不同的存儲系統做事務保證。', keywords: ['Outbox Pattern', 'Debezium CDC', '雙寫問題', '事務訊息'] },
      { question: 'Kafka 某個 Partition 的 Consumer 突然收不到訊息，其他 Partition 正常。什麼原因？', answer: '排查路徑：(1) Consumer 是否還活著？ — kafka-consumer-groups.sh --describe 看是否有 Consumer 分配到這個 Partition。如果沒有 → 可能 Rebalance 後漏分配；(2) 是否被另一個 Consumer Group 的 Consumer 搶了？ — 確認 group.id 是否正確；(3) Partition Leader 是否掛了？ — kafka-topics.sh --describe 看 Leader 是否 -1（ISR 為空）；(4) Consumer 是否卡在某條訊息 — 可能反序列化失敗或業務異常導致不斷 retry 同一條消息。排查工具：kafka-consumer-groups.sh 看 Lag 和 Current Offset，Grafana Dashboard 看 Consumer 的 Poll Rate。', keywords: ['Partition Consumer', 'Rebalance', 'ISR', 'Lag 排查'] },
      { question: '設計一個訂單狀態變更的事件系統，如何保證 Consumer 處理的冪等性？', answer: '訂單狀態：CREATED → PAID → SHIPPED → DELIVERED。冪等問題：同一個 PAID 事件被消費兩次，可能導致重複扣款。多層防護：(1) 消息去重 — Consumer 收到消息後用 (event_id + event_type) 作為唯一鍵查 Redis/DB，已處理的直接跳過；(2) 狀態機防護 — 只有 CREATED 狀態才能轉 PAID，重複的 PAID 事件在狀態機校驗時被拒絕（UPDATE orders SET status=PAID WHERE id=? AND status=CREATED，affected rows=0 說明已處理）；(3) 業務冪等 — 扣款操作用 payment_intent_id 做唯一約束，重複扣款在支付閘道層被攔截。三層缺一不可。', keywords: ['冪等消費', '狀態機', 'Event ID 去重', '支付冪等'] },
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
