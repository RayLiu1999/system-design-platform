export const fundamentals = {
  "cap-theorem": {
    concepts: [
      {
        title: "CAP Theorem 核心",
        text: "CAP Theorem 指出分散式系統無法同時滿足一致性（Consistency）、可用性（Availability）和分區容錯（Partition Tolerance）三者。由於網路分區在分散式環境中不可避免，實際上我們只能在 CP 和 AP 之間做取捨。",
      },
      {
        title: "PACELC 模型 — CAP 的精確延伸",
        text: "CAP 只描述了分區發生時的取捨，但正常運作時呢？PACELC 補充了這一點：Partition 時選 A 或 C，Else（正常時）選 Latency 或 Consistency。DynamoDB 正常時也犧牲一致性換低延遲（PA/EL），ZooKeeper 正常時也堅持一致性（PC/EC）。這解釋了為什麼同樣是 AP 系統，DynamoDB 和 Cassandra 在正常時的行為也不同。",
      },
      {
        title: "CP vs AP 的 Per-Feature 策略",
        text: "同一個系統的不同功能可以有不同的一致性策略。Instagram Likes 計數用 AP（延遲一致沒差），但 DM 訊息用 CP（訊息順序不能亂）。金融系統的帳戶餘額必須 CP，但通知推播可以 AP。實務設計是「Per-Feature 選擇」而非整個系統統一策略。",
      },
      {
        title: "ACID vs BASE 的邊界場景",
        text: "電商下單涉及「扣庫存 + 建訂單 + 扣款」三步，傳統 2PC 延遲高且有 Coordinator 單點問題。實務做法是 BASE：先鎖定庫存（預留），訂單建立後非同步扣款，失敗則補償釋放庫存。這就是 Saga Pattern 的核心思想 — 用一系列本地事務 + 補償操作取代分散式 ACID。",
      },
      {
        title: "Eventual Consistency 的 SLA 陷阱",
        text: "「最終一致」的「最終」是多久？沒有 SLA 的 Eventual Consistency 在生產中很危險。實務做法：(1) Read-Your-Write — 寫入後從 Primary 讀取，保證用戶看到自己的操作；(2) Monotonic Read — 用 Session Token 綁定 Replica，避免時光倒流；(3) Causal Consistency — Lamport Timestamp 保證因果序。DynamoDB 的 Consistent Read 就是犧牲延遲換強一致。",
      },
      {
        title: "衝突解決策略",
        text: "多副本同時寫入時的衝突解決：(1) LWW（Last-Write-Wins）— 用時間戳選最新，簡單但可能丟失寫入；(2) Vector Clock — 偵測因果關係，保留併發寫入交給應用層解決；(3) CRDT（Conflict-free Replicated Data Types）— 數學保證可合併，如 G-Counter、OR-Set。Redis 用 LWW，Riak 用 Vector Clock，協作編輯用 CRDT。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計跨國電商平台的庫存系統",
        text: "核心取捨：庫存扣減必須 CP（超賣是財務損失），但庫存展示可以 AP（頁面顯示「剩餘 3 件」延遲幾秒無妨）。架構分離：寫路徑用強一致（MySQL + 行鎖 SELECT FOR UPDATE），讀路徑用 Redis 快取 + 非同步更新（AP）。下單時走 DB 確認真實庫存，頁面瀏覽走 Cache。這就是 Per-Operation 混合策略。",
      },
      {
        type: "practice",
        title: "Multi-DC 資料同步與衝突處理",
        text: "場景：用戶 A 在 DC-East 修改頭像，同時在 DC-West 修改簽名，兩個 DC 各自接受寫入再同步。解決方案：大部分場景 LWW + 寫入衝突偵測告警即可。計數器類操作用 CRDT（G-Counter 可合併加法）。文件編輯類用 OT（Operational Transform）算法。關鍵是選擇和業務匹配的衝突策略，而非追求通用方案。",
      },
      {
        type: "practice",
        title: "Redis Session Store 節點故障導致用戶登出",
        text: "問題根因：Redis Cluster 主從切換期間，未同步的寫入丟失（CP 場景下犧牲了 A）。最佳方案：改用 JWT + Refresh Token 架構 — Access Token 無狀態驗證不依賴 Redis，Redis 只存 Refresh Token 和黑名單。從根本上消除 Session Store 的單點依賴。備選方案：min-slaves-to-write=1 保證至少一個 Slave 同步，犧牲寫入延遲換可靠性。",
      },
    ],
    interview: [
      {
        question: "解釋 CAP Theorem，為什麼不能三者兼得？",
        answer:
          "CAP Theorem 證明了在網路分區（P）發生時，系統必須在一致性（C）和可用性（A）之間做選擇。當兩個節點間網路中斷，要麼拒絕請求保證一致性（CP），要麼繼續服務但可能回傳舊資料（AP）。P 是必選的，因為網路分區無法避免。更精確的分析用 PACELC 模型：分區時選 A/C，正常時選 Latency/Consistency。",
        keywords: ["CAP", "PACELC", "CP vs AP", "Partition Tolerance"],
      },
      {
        question: "設計一個跨國電商，庫存系統該選 CP 還是 AP？",
        answer:
          "核心洞察：庫存扣減必須 CP（超賣是財損），但庫存展示可以 AP（頁面「剩餘 3 件」延遲幾秒沒差）。寫路徑用 MySQL + SELECT FOR UPDATE（強一致），讀路徑用 Redis 快取（AP）。下單走 DB 確認真實庫存，瀏覽走 Cache。這是 Per-Operation 混合策略，避免一刀切。",
        keywords: ["CP/AP 混合", "SELECT FOR UPDATE", "讀寫分離", "超賣防護"],
      },
      {
        question: "兩個 Data Center 之間出現資料衝突怎麼辦？",
        answer:
          "衝突解決策略：(1) LWW — 用 NTP 時間戳取最新，簡單但可能丟寫入；(2) CRDT — 數學保證可合併（G-Counter、OR-Set），適合計數器和集合類操作；(3) Vector Clock — 偵測因果關係，保留併發寫入交給應用層決定；(4) Application-Level Merge — 像 Google Docs 的 OT 算法。大部分場景 LWW + 衝突偵測告警即可。",
        keywords: ["LWW", "CRDT", "Vector Clock", "Multi-DC Sync"],
      },
    ],
  },
  scalability: {
    concepts: [
      {
        title: "水平擴展的前提條件",
        text: "水平擴展不是「加機器就好」。前提：(1) Stateless — Session 必須外部化（Redis），否則加機器沒用；(2) 無共享磁碟 — 檔案上傳不能存本地，要用 S3/MinIO；(3) 無本地快取依賴 — 或改用分散式快取。常見反模式：把上傳圖片存在 /tmp、用全域變數做計數器、用 in-memory queue 做任務佇列。這些都會在第二台機器上線時爆炸。",
      },
      {
        title: "Fan-out 問題：推拉模型",
        text: "用戶 A 發照片，1000 個粉絲如何看到？Fan-out on Write（推模型）：發布時寫入每個粉絲的 Feed Cache（寫入放大 1000 倍），讀取快但大 V 不可行。Fan-out on Read（拉模型）：讀取時查詢所有關注者的最新貼文再合併排序，寫入快但讀取慢。Instagram/Twitter 實務是混合方案：普通用戶推模型，大 V 拉模型。",
      },
      {
        title: "CQRS + Event Sourcing 實戰",
        text: "寫入端（Command）用正規化 MySQL 存事件（OrderCreated、OrderPaid）。讀取端（Query）透過事件消費建立反正規化 View（ES 全文搜索、Redis 即時統計）。好處：讀寫獨立擴展，讀取端可針對不同場景建不同 Projection。代價：最終一致性延遲、事件 Schema 演進需要版本控制、系統複雜度高。",
      },
      {
        title: "效能瓶頸定位方法論",
        text: "不要猜，要測量。(1) Application Profiling — Go pprof / Java JFR 找出 CPU/Memory 熱點；(2) DB 層 — Slow Query Log + EXPLAIN 找出全表掃描；(3) 網路層 — 分散式 Tracing（Jaeger）找出延遲最高的 Span；(4) 系統層 — top/vmstat/iostat 觀察 CPU/IO 飽和度。常見發現：80% 的效能問題來自 N+1 查詢和缺少索引。",
      },
      {
        title: "垂直擴展 vs 水平擴展的決策時機",
        text: "垂直擴展（Scale Up）是升級單機硬體，簡單但有上限。水平擴展（Scale Out）是增加機器，需處理分散式複雜性。通常先垂直（代價低），最後才水平。決策信號：單機 CPU > 80% 且已優化代碼 → 考慮水平擴展。單機記憶體不夠 → 可能需要 Sharding。讀 QPS 太高 → 加 Read Replica + Cache。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計日活 1000 萬的社交 Feed 系統",
        text: "核心問題是 Fan-out 策略：DAU 1000 萬 × 每次刷新 20 條 = 2 億次 Feed 讀取/天 ≈ 2300 QPS 均值、峰值 ~7K。方案：普通用戶用推模型（Fan-out on Write 到 Redis List），大 V（粉絲 > 10 萬）用拉模型（讀取時合併）。Feed Cache 用 Redis Sorted Set，Score 為時間戳。重點：推拉混合 + 熱冷分離。",
      },
      {
        type: "practice",
        title: "API 流量暴增 10 倍後超時排查",
        text: "排查 SOP：(1) 看 Metrics — CPU/Memory 飽和還是 IO Wait 高？(2) 看 DB Slow Query — 是否有新出現的慢查詢？(3) 看 Tracing — 哪個下游服務延遲最高？(4) 看連線池 — DB/Redis 連線是否耗盡？常見根因：N+1 查詢 → Batch Query + DataLoader；DB 熱點行 → 讀寫分離 + Cache；閘道瓶頸 → 水平擴展 + Rate Limiting。",
      },
      {
        type: "practice",
        title: "判斷 CQRS 是否過度設計",
        text: "如果系統是簡單 CRUD、讀寫比例相近、團隊規模小，CQRS 的複雜度遠超收益。適合信號：(1) 讀寫比 > 10:1 且讀取模式多變；(2) 需要 Event Sourcing 做審計（金融、醫療）；(3) 讀取端需要不同資料模型（ES + Redis + ClickHouse）；(4) 團隊有分散式經驗。簡單系統用 Read Replica + Cache 就能解決 90% 讀擴展。",
      },
    ],
    interview: [
      {
        question: "你的 API 在流量成長 10 倍後開始超時，如何系統性排查？",
        answer:
          "排查 SOP：(1) 看 Metrics — CPU/Memory 飽和還是 IO Wait？(2) 看 DB Slow Query；(3) 看 Tracing — 哪個下游服務延遲最高？(4) 看連線池 — DB/Redis 連線是否耗盡？常見根因：N+1 查詢 → Batch Query；DB 熱點行 → 讀寫分離 + Cache；大 Payload → 分頁 + 壓縮。先垂直優化，最後才水平擴展。",
        keywords: ["效能排查 SOP", "N+1", "Slow Query", "連線池耗盡"],
      },
      {
        question: "如何設計一個可水平擴展的系統？",
        answer:
          "關鍵原則：(1) 無狀態設計，Session 存 Redis；(2) 資料庫讀寫分離 + Sharding；(3) 用 MQ 解耦服務；(4) 有效的快取策略；(5) 服務發現 + 負載均衡。核心反模式：本地檔案存儲、全域變數計數器、in-memory queue。目標是讓每個組件都可以獨立水平擴展。",
        keywords: ["Stateless", "Sharding", "Cache", "MQ"],
      },
      {
        question: "什麼是 CQRS？什麼場景下適用？",
        answer:
          "CQRS 將讀取和寫入分開處理。寫入走主庫保證一致性，讀取走反正規化 View（ES、Redis）分散壓力。適合場景：讀寫比 > 10:1、需要 Event Sourcing 審計、讀取端需要多種資料模型。不適合：簡單 CRUD、小團隊、讀寫比例相近。簡單系統用 Read Replica + Cache 就能解決 90% 問題。",
        keywords: ["CQRS", "Event Sourcing", "Read Replica", "過度設計"],
      },
    ],
  },
  "high-availability": {
    concepts: [
      {
        title: "從 SLA 反推架構設計",
        text: "99.99% SLA 意味著年停機 52 分鐘。單一 AZ 部署時 AZ 故障就直接超標，因此 99.99% 必須 Multi-AZ 部署、DB 跨 AZ 同步複製、LB 自動切換。99.999%（年停機 5 分鐘）更需要 Multi-Region + Active-Active。每多一個 9，架構複雜度和成本指數級增長。設計時先問清楚 SLA 需求，避免過度設計。",
      },
      {
        title: "Failover 的隱藏延遲",
        text: "Active-Standby Failover 看起來簡單，但實際切換有延遲：DNS TTL 過期（分鐘級）、Health Check 偵測間隔（秒級）、新 Primary 啟動預熱（秒~分鐘級）。AWS RDS Multi-AZ Failover 通常 60-120 秒。解決方案：(1) 降低 Health Check 間隔（但過於敏感會誤判）；(2) 用連線池 Retry 遮蔽短暫切換；(3) Circuit Breaker 在切換期間返回降級回應。",
      },
      {
        title: "Chaos Engineering 實踐",
        text: "Netflix 的 Chaos Monkey 隨機殺 Production 實例驗證韌性。核心原則：(1) 建立穩態假設（P99 < 200ms）；(2) 注入故障（殺實例、注入延遲、斷網路）；(3) 觀察穩態是否打破；(4) 修復弱點。工具：Gremlin（商業）、LitmusChaos（K8s 原生）。重點不是證明系統不會壞，而是提前發現怎麼壞。",
      },
      {
        title: "優雅降級 vs 快速失敗",
        text: "下游服務掛了的兩種策略：(1) 優雅降級 — 回傳部分資料 or 預設值。推薦服務掛了改回傳熱門排行榜。(2) 快速失敗 — 直接回錯誤，不讓請求排隊。適合寫操作（不能給錯誤的成功回應）。Netflix 的 Fallback 策略：Cache → Static Default → Empty Response 按優先級選擇。",
      },
      {
        title: "Health Check 的深度設計",
        text: "淺層 Health Check（/health 返回 200）只能發現進程是否存活，但節點 OOM 時進程還活著，Health Check 通過但請求全部超時。Deep Health Check（查 DB、Redis 連通性）更可靠但增加依賴。最佳實踐：Liveness Probe 用淺層（重啟進程），Readiness Probe 用深層（從 LB 摘除但不重啟）。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "支付服務凌晨 3 點 DB 主庫掛了",
        text: "自動 Failover 花了 2 分鐘，期間所有支付失敗。短期：DB 切 ProxySQL 吸收連線中斷 + 支付 API 加 Circuit Breaker 回傳「處理中」。中長期：評估 Aurora（Failover < 30 秒）；實作 Outbox Pattern — 支付意圖先寫本地 DB，Worker 非同步提交支付閘道；定期 Chaos Testing 模擬 DB Failover。",
      },
      {
        type: "design",
        title: "設計 Zero-Downtime 資料庫 Schema Migration",
        text: "三步法：(1) Expand — 新增欄位/表，舊程式碼不受影響（ALTER TABLE ADD COLUMN）；(2) Migrate — 部署新版同時讀寫新舊欄位（雙寫），背景 Backfill 遷移舊資料；(3) Contract — 確認完成後移除舊欄位。關鍵：每一步可獨立部署和回滾。大表用 gh-ost / pt-online-schema-change 避免鎖表。",
      },
      {
        type: "design",
        title: "設計 Active-Active 跨區域部署系統",
        text: "策略選擇：(1) 單 Leader — 寫入路由到一個 DC 的 Primary，其他 DC 做 Read Replica。簡單但寫入有跨區延遲。(2) Multi-Leader — CockroachDB/TiDB 用分散式共識保證一致性，犧牲延遲。(3) CRDT — 數學保證無衝突。大多數場景用方案 1（寫入量遠小於讀取），只有真正需要全球任意節點寫入才用方案 2 或 3。",
      },
    ],
    interview: [
      {
        question: "你負責的支付服務 DB 掛了，Failover 期間所有支付失敗。如何改善？",
        answer:
          "短期：(1) DB 切 ProxySQL 吸收連線中斷，自動 Retry；(2) 支付 API 加 Circuit Breaker，Failover 期間回傳「處理中」。中長期：(1) 評估 Aurora/TiDB（Failover < 30 秒）；(2) Outbox Pattern 解耦即時可用性；(3) 定期 Chaos Testing 模擬 DB Failover。",
        keywords: ["DB Failover", "ProxySQL", "Outbox Pattern", "Chaos Testing"],
      },
      {
        question: "如何在不停機的情況下做 Schema Migration？",
        answer:
          "Expand-Migrate-Contract 三步法：(1) Expand — 新增欄位（MySQL Online DDL）；(2) Migrate — 雙寫 + Backfill；(3) Contract — 移除舊欄位。大表用 gh-ost 避免鎖表。絕對不要在一個 Deployment 中同時改 Schema 和程式碼。每一步都可以獨立部署和回滾。",
        keywords: ["Zero-Downtime", "Expand-Migrate-Contract", "gh-ost", "雙寫"],
      },
      {
        question: "什麼是 SLA？如何計算系統可用性？",
        answer:
          "可用性 = (總時間 - 停機時間) / 總時間。多組件串聯的可用性是各組件乘積：99.9% × 99.9% = 99.8%。提升策略：增加冗餘（並聯）、減少 MTTR（自動化恢復）、增加 MTBF（Chaos Engineering 提前發現弱點）。99.99% 需對應 Multi-AZ 架構，99.999% 需 Multi-Region Active-Active。",
        keywords: ["SLA", "MTTR", "MTBF", "Multi-AZ"],
      },
    ],
  },
};
