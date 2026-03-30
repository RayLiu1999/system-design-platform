export const database = {
  "relational-db": {
    concepts: [
      {
        title: "索引的陷阱與反模式",
        text: "B+Tree 索引 3-4 層可索引千萬級資料，但容易踩坑：(1) 覆蓋索引失效 — SELECT * 導致回表，改為只查需要欄位；(2) 索引列做運算 — WHERE YEAR(created_at) = 2024 無法走索引，改為範圍查詢；(3) 隱式類型轉換 — VARCHAR 的 user_id 用數字查詢會全表掃描；(4) 聯合索引順序錯誤 — (a, b, c) 索引查 WHERE b=1 AND c=2 完全無效。",
      },
      {
        title: "MVCC 長事務炸彈",
        text: "MySQL InnoDB 的 MVCC 透過 undo log 保存舊版本。長事務（忘了 COMMIT）會阻止 undo log 清理 → 硬碟暴漲。同時長事務的 Read View 持續看舊版本，其他事務的版本無法回收。發現方法：SELECT * FROM information_schema.innodb_trx 找出運行超過 60 秒的事務。防護：設定 innodb_lock_wait_timeout、應用層加事務超時。",
      },
      {
        title: "死鎖的防護架構",
        text: "MySQL 的死鎖偵測（Wait-For Graph）發現死鎖後會回滾代價最小的事務。但偵測本身有開銷，高並發下 CPU 被死鎖偵測吃光。解決：(1) 所有操作按固定順序加鎖（先鎖 order 再鎖 inventory）；(2) 降低鎖粒度 — 改用樂觀鎖（版本號）；(3) 縮短事務時間 — 不要在事務中做 HTTP 呼叫。",
      },
      {
        title: "分區（Partitioning）vs 分片（Sharding）",
        text: "Partitioning 是單機內的資料分割（RANGE/LIST/HASH），對應用透明。Sharding 是跨多台機器。先用 Partitioning：可加速 DELETE（DROP PARTITION）、減少索引大小。不夠再 Sharding。常見場景：按月份 RANGE 分區的日誌表、按 region HASH 分區的用戶表。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "線上環境 Slow Query 暴增排查",
        text: "排查 SOP：(1) 開啟 Slow Query Log（long_query_time=1s）；(2) 用 pt-query-digest 分析 Top 10 慢查詢；(3) EXPLAIN ANALYZE 看執行計劃 — type=ALL 就是全表掃描；(4) 檢查索引 — SHOW INDEX 確認覆蓋率。常見根因：新上線的查詢沒加索引、聯合索引順序錯誤、隱式類型轉換。修復後用 pt-online-schema-change 加索引避免鎖表。",
      },
      {
        type: "design",
        title: "設計電商訂單表（千萬級）",
        text: "主表 orders + 明細表 order_items（1:N）。索引設計：(user_id, created_at) 覆蓋「查詢用戶歷史訂單」場景；(status, updated_at) 覆蓋「後台管理查詢」場景。分區：按 created_at 按月 RANGE 分區，歷史資料 DROP PARTITION 歸檔。超千萬考慮 Sharding by user_id — 同一用戶的訂單在同一 Shard，避免跨 Shard JOIN。",
      },
      {
        type: "practice",
        title: "線上 MySQL 死鎖頻繁觸發",
        text: "根因：兩個 API 同時更新同一訂單的庫存和狀態，加鎖順序不同。修復：(1) 所有 Service 統一加鎖順序 — 先鎖庫存表再鎖訂單表；(2) 改用樂觀鎖 — UPDATE WHERE version=N，失敗 Retry；(3) 縮短事務粒度 — 只鎖需要的行（WHERE id=X），避免鎖升級。監控 SHOW ENGINE INNODB STATUS 的 LATEST DETECTED DEADLOCK。",
      },
    ],
    interview: [
      {
        question: "你的線上 MySQL 出現大量慢查詢，排查 SOP？",
        answer:
          "四步排查：(1) pt-query-digest 分析 Slow Query Log 找出 Top N；(2) EXPLAIN ANALYZE 看執行計劃（type=ALL 就是全表掃描）；(3) 檢查索引覆蓋率 — 聯合索引順序是否匹配查詢；(4) 查看是否有隱式類型轉換或函數作用於索引列。常見修復：加索引（pt-osc 避免鎖表）、改寫查詢避免回表。",
        keywords: ["EXPLAIN", "pt-query-digest", "覆蓋索引", "隱式轉換"],
      },
      {
        question: "MVCC 是什麼？長事務為什麼是定時炸彈？",
        answer:
          "MVCC 透過 undo log 保存歷史版本，讀取不阻塞寫入。長事務的 Read View 不釋放 → undo log 無法回收 → 硬碟暴漲。同時阻止 Auto-Vacuum（PostgreSQL）或 Purge Thread（MySQL）。防護：innodb_lock_wait_timeout、監控 innodb_trx 運行時間、應用層事務超時。",
        keywords: ["MVCC", "Undo Log", "Long Transaction", "Read View"],
      },
      {
        question: "MySQL 的 Repeatable Read 和 PostgreSQL 的 Serializable 差異？",
        answer:
          "MySQL RR 用 Gap Lock 防幻讀，但仍有 Write Skew 問題。PostgreSQL 的 SSI（Serializable Snapshot Isolation）用依賴追蹤偵測衝突事務並回滾。PostgreSQL 的 Serializable 更嚴格但需處理回滾重試。金融系統用 Serializable + Retry Loop。",
        keywords: ["Gap Lock", "SSI", "Write Skew", "Phantom Read"],
      },
    ],
  },
  "nosql-db": {
    concepts: [
      {
        title: "NoSQL 四大類型的選型指南",
        text: "Document（MongoDB）：JSON-like 彈性 Schema，適合 CMS、用戶檔案。Key-Value（Redis/DynamoDB）：極高吞吐，適合快取、Session。Column-Family（Cassandra/HBase）：寬列模型適合時序和分析。Graph（Neo4j）：關係查詢從 O(n) 降為 O(1)。選型原則：先用 PostgreSQL，除非有明確的 Scale-Out 或 Schema 彈性需求。",
      },
      {
        title: "DynamoDB 單表設計（Single-Table Design）",
        text: "AWS DynamoDB 最佳實踐是把多個實體放一張表：用 PK=USER#123 + SK=ORDER#456 模擬 1:N 關係。優點：一次 Query 取回用戶和所有訂單（無 JOIN）。缺點：設計困難、可讀性差、遷移成本高。適合 Access Pattern 明確且穩定的場景，不適合 Ad-hoc 查詢。GSI Over-Fetching 是常見效能陷阱。",
      },
      {
        title: "MongoDB 的效能陷阱",
        text: "(1) 無 Schema Validation → 髒資料隨時間累積；(2) 巨量 Document（> 16MB Limit）需要 GridFS；(3) WiredTiger 預設快取佔 50% RAM，和系統搶記憶體；(4) 寫入密集場景的 WiredTiger 壓縮 overhead。建議：開啟 Schema Validation、設定合理的 cacheSizeGB、用 Change Stream 做 CDC 而非 Oplog 直接消費。",
      },
      {
        title: "LSM-Tree vs B-Tree 的儲存引擎取捨",
        text: "B-Tree（MySQL/PostgreSQL）：讀取優化，原地更新，適合 OLTP。LSM-Tree（RocksDB/Cassandra/LevelDB）：寫入優化，追加寫入 + 後台 Compaction，寫入吞吐 10x+。代價：讀取放大（需查多層 SSTable）、Space Amplification、Compaction 搶 IO。選型：讀多寫少用 B-Tree，寫多讀少用 LSM-Tree。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計 IoT 感測器資料儲存系統（每秒百萬寫入）",
        text: "需求：10 萬個設備每秒各產 10 條資料 = 100 萬 TPS。MySQL 不可行（單機 ~5K TPS）。方案：Cassandra（LSM-Tree、線性擴展、寫入優化）。Partition Key = device_id，Clustering Key = timestamp。TTL 自動清理過期資料。讀取用 WHERE device_id = X AND timestamp > T 範圍查詢（Clustering Key 排序）。",
      },
      {
        type: "practice",
        title: "MongoDB 線上環境記憶體佔用 90%+",
        text: "根因：WiredTiger 預設 cacheSizeGB = (RAM - 1GB) * 50%，在容器環境中看到的是主機 RAM 而非 Container Limit。修復：(1) 明確設定 --wiredTigerCacheSizeGB 為 Container 記憶體的 40%；(2) 檢查是否有大量 In-Memory Sort（缺少索引導致）；(3) 用 db.serverStatus().wiredTiger.cache 監控命中率。",
      },
      {
        type: "practice",
        title: "DynamoDB 突然出現 ProvisionedThroughputExceeded",
        text: "根因：Hot Partition — 某個 PK 的流量遠超其他。DynamoDB 按 Partition 分配容量，即使總容量充足，單一 Partition 也會被限流。解決：(1) Partition Key 改為更高基數（加 suffix #0-#9 做 Write Sharding）；(2) 開啟 On-Demand 模式（但成本更高）；(3) 用 DAX 快取熱點資料。",
      },
    ],
    interview: [
      {
        question: "SQL 和 NoSQL 如何選型？什麼場景不該用 NoSQL？",
        answer:
          "先用 PostgreSQL，除非有明確需求：(1) 需要 PB 級水平擴展；(2) Schema 極度彈性；(3) 寫入吞吐 > 單機 DB 上限。不該用 NoSQL：複雜 JOIN + 事務的 OLTP（ERP、金融核心）、需要 Ad-hoc 查詢的分析場景。NoSQL 不是「更好的 SQL」，而是「不同的取捨」。",
        keywords: ["選型原則", "ACID vs BASE", "Schema Flexibility"],
      },
      {
        question: "LSM-Tree 和 B-Tree 的差異？各適合什麼場景？",
        answer:
          "B-Tree 原地更新，讀快寫慢，適合 OLTP（MySQL）。LSM-Tree 追加寫入 + 背景 Compaction，寫快讀慢，適合寫密集場景（Cassandra、RocksDB）。LSM-Tree 寫入吞吐 10x+，但有讀取放大和 Compaction IO 問題。TiKV 用 LSM-Tree + Bloom Filter 優化讀取。",
        keywords: ["LSM-Tree", "B-Tree", "Compaction", "Write Amplification"],
      },
      {
        question: "DynamoDB 的 Hot Partition 問題如何解決？",
        answer:
          "根因：PK 基數太低導致流量集中。解決：(1) Write Sharding — PK 加 #1-#10 suffix 分散寫入，讀取時 Scatter-Gather；(2) DAX 快取熱點讀取；(3) On-Demand 模式移除手動容量規劃。設計 DynamoDB 時 PK 基數要 >> Partition 數量。",
        keywords: ["Hot Partition", "Write Sharding", "DAX", "Partition Key"],
      },
    ],
  },
  "db-scaling": {
    concepts: [
      {
        title: "Replication Lag 的連鎖反應",
        text: "非同步複製的 Lag 不只是「讀到舊資料」— 在電商場景：(1) 用戶下單成功 → 跳轉到訂單列表 → 讀 Replica 看不到訂單 → 以為失敗再下一次 → 重複訂單。(2) Admin 更新商品價格 → Replica 延遲 5 秒 → 5 秒內的訂單用舊價格。解決：寫後讀走 Primary（Read-Your-Write）；價格更新直接清 Cache 強制走 Primary。",
      },
      {
        title: "Sharding 前的 Checklist",
        text: "Sharding 是「不可逆的複雜度增加」，上之前確認：(1) 已做 Query 優化 + 索引調整？(2) 已做讀寫分離？(3) 已做冷熱資料分離（歸檔舊數據）？(4) 已做垂直拆分（大表拆成小表）？(5) 已做快取層？如果以上都做了還不夠，再考慮 Sharding。大部分中型系統（千萬級）不需要 Sharding。",
      },
      {
        title: "Online Resharding 策略",
        text: "業務增長後需要增加 Shard，如何不停機遷移？(1) 雙寫 — 新舊 Shard 同時寫入，背景遷移歷史資料，完成後切讀到新 Shard；(2) Vitess / ProxySQL 做透明路由切換；(3) Change Data Capture（CDC）同步增量資料。關鍵：遷移期間的資料一致性校驗（Checksum 比對）。",
      },
      {
        title: "全局唯一 ID 生成",
        text: "Sharding 後 AUTO_INCREMENT 不再全局唯一。方案：(1) UUID — 全局唯一但無序，作為 PK 會導致 B-Tree 頻繁分裂；(2) Snowflake — 時間戳 + 機器 ID + 序列號，有序且可反推時間；(3) DB Sequence 段模型（美團 Leaf）— 預取 ID 段減少 DB 壓力。推薦 Snowflake 變種。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計 5 億用戶的社交平台 DB 架構",
        text: "5 億用戶 × 平均 200 條動態 = 1000 億條。單機 MySQL 不可行。方案：Shard by user_id（Consistent Hashing），每 Shard 5000 萬用戶。用戶的動態、按讚、評論都在同一 Shard（避免跨 Shard JOIN）。Feed 查詢：拉模型 → 查詢關注者的 Shard → 合併排序。全局搜索走 Elasticsearch。ID 用 Snowflake。",
      },
      {
        type: "practice",
        title: "Replication Lag 導致用戶看不到自己的訂單",
        text: "場景：下單成功後跳轉到訂單列表，讀 Replica 還沒同步到新訂單。解決方案分層：(1) 短期 — 下單後 3 秒內的 GET /orders 強制走 Primary；(2) 中期 — 前端在跳轉時帶上 Order ID，直接用 ID 查 Primary 確認；(3) 長期 — 監控 Seconds_Behind_Master，Lag > 1s 時自動切到 Primary。",
      },
      {
        type: "practice",
        title: "Shard 資料嚴重傾斜（一個 Shard 佔 80% 空間）",
        text: "根因：Shard Key 選了低基數欄位（如 country_code，中國用戶佔 80%）。修復：(1) Reshard — 改用 user_id Hash Sharding（高基數）；(2) 二級拆分 — 將中國 Shard 再按 city 拆分；(3) Vitess 的 Resharding Workflow 自動化遷移。預防：上 Sharding 前用 production 資料分析 Shard Key 的分佈。",
      },
    ],
    interview: [
      {
        question: "Replication Lag 導致的業務問題 and 解決方案？",
        answer:
          "典型問題：用戶下單後看不到訂單。解決分層：(1) Read-Your-Write — 寫入後短時間走 Primary；(2) Session Token 綁定 — 帶版本號路由；(3) 監控自動切換 — Lag > 閾值時讀改走 Primary。半同步複製可降低 Lag 但犧牲寫入延遲。關鍵：按業務場景選擇一致性級別。",
        keywords: ["Replication Lag", "Read-Your-Write", "半同步", "GTID"],
      },
      {
        question: "Sharding Key 如何選擇？選錯了怎麼辦？",
        answer:
          "好的 Sharding Key：(1) 高基數（user_id > region）；(2) 在查詢 WHERE 中（避免跨 Shard）；(3) 避免單調遞增（用 Hash）。選錯了（資料傾斜）：Reshard + CDC 遷移，用 Vitess/ProxySQL 做透明路由。上 Sharding 前必須用生產資料分析 Key 分佈。",
        keywords: ["Cardinality", "Hot Shard", "Vitess", "資料傾斜"],
      },
      {
        question: "分散式環境下的全局唯一 ID 怎麼生成？",
        answer:
          "UUID — 全局唯一但無序（B-Tree 頻繁分裂）。Snowflake — 時間戳 + 機器 ID + 序列號，有序可反推時間（推薦）。DB 段模型（Leaf）— 預取 ID 段減少 DB 壓力。注意 Snowflake 的時鐘回撥問題 — 需要等待或拒絕生成。",
        keywords: ["Snowflake", "UUID", "Leaf", "時鐘回撥"],
      },
    ],
  },
};
