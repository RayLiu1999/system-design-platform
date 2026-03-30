export const cache = {
  "cache-strategy": {
    concepts: [
      {
        title: "Cache-Aside（旁路快取）與並發修正",
        text: "最常用模式。讀取：先查 Cache → 未命中查 DB 後回填。寫入：先更新 DB → 再刪除 Cache。資深視角：為什麼是「先更新 DB 再刪 Cache」？如果先刪 Cache 再更新 DB，在高並發下，另一個執行緒可能在 DB 更新完成前讀到舊值並回填 Cache，導致永久不一致。即使先更新 DB，仍有極小機率在刪除前發生衝突，實務上可搭配 '延遲雙刪' 或基於 Binlog 的異步刪除。",
      },
      {
        title: "Write-Through / Write-Behind 深度選型",
        text: "Write-Through：同步更新。Write-Behind：先進 Cache，異步批次寫入 DB。資深視角：Write-Behind 是提升吞吐量的利器，適合作業系統 Page Cache、高頻計數器（如點讚數）。風險點在於「資料遺失」與「寫入順序」。如果系統掛了，Cache 中未刷盤的資料會遺失。解決方案：使用可靠的訊息佇列（Kafka）作為 Write-Behind 的實作媒介。",
      },
      {
        title: "快取預熱（Warming）與降級",
        text: "系統上線或活動前，將熱點資料提前載入快取，避免 Cold Start 打穿 DB。降級策略：當快取叢集發生故障，需保護 DB。方案：(1) 返回預設值/舊資料；(2) 限制回源 QPS；(3) 部分功能直接不顯示。重點：快取是優化組件，系統應具備「快取不存在也能運作」的韌性，但要控制對 DB 的壓力。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計 Twitter Timeline 的快取架構",
        text: "需求：全球用戶高頻讀取最新貼文。方案：(1) Fan-out on Write — 用戶發文時，推送到粉絲的 Redis List 中（Inbox 模式）；(2) 讀取時直接從 Redis LRU 取得前 N 條。關鍵：大 V 用拉模型，普通人用推模型。Redis 中只存 Tweet ID 列表，具體內容存放在帶有 Content Hash 的 Document Store 或另一個 Redis String 中。這是一個空間換時間的典型範例。",
      },
      {
        type: "practice",
        title: "多級快取一致性（L1 Caffeine + L2 Redis）",
        text: "問題：分散式環境下，各個 Node 的 L1 快取如何同步？方案：(1) 短 TTL：L1 設很短（如 10s），容忍短暫不一致；(2) Redis Pub/Sub：DB 更新後發布訊息，各節點收到後 Invalid 自己本地的 L1；(3) 監控 Zookeeper 節點。實務推薦方案 1 + 方案 2 結合，保證最終一致性。",
      },
    ],
    interview: [
      {
        question: "為什麼 Cache-Aside 建議先更新資料庫再刪除快取？",
        answer:
          "主要是為了解決並發下的不一致。如果先刪快取再更新 DB：執行緒 A 刪除快取 → 執行緒 B 讀取 Miss 查舊 DB → 執行緒 B 回填舊值到快取 → 執行緒 A 更新新 DB。結果快取裡是舊的，DB 裡是新的。先更新 DB 再刪快取雖然仍有極小機率出錯（讀取舊 DB 會在更新 DB 後回填），但機率遠低於前者，且符合原子性直覺。實務可用延遲雙刪徹底解決。",
        keywords: ["並發競爭", "延遲雙刪", "最終一致性"],
      },
      {
        question: "如何處理大 V 發文導致的寫入放大問題？",
        answer:
          "Twitter 的解法是「推拉結合」。普通用戶發文：Fan-out 到所有粉絲的 Inbox（Redis List）。大 V（粉絲 > 100 萬）：不推，改由粉絲讀取 Timeline 時，動態「拉取」該大 V 最近的貼文並與自己的 Inbox 合併。這避免了一次發文產生百萬次寫入的負擔。這本質上是在寫入壓力和讀取延遲之間做取捨。",
        keywords: ["Fan-out on Write", "Fan-out on Read", "寫入放大"],
      },
    ],
  },
  "cache-problems": {
    concepts: [
      {
        title: "Hot Key（熱點 Key）偵測與處理",
        text: "單個 Key 的訪問量遠超 redis 承載上限。偵測：(1) Redis 內建 --hotkeys；(2) 客戶端記錄；(3) 代理層（Proxy）統計。處理：(1) 本地快取（L1 Cache）— 在應用層吸收流量；(2) 備份 Key — 在 Key 後面加隨機字尾（key_1, key_2）分散到不同 Slot；(3) 主動重新分配 Slot。",
      },
      {
        title: "Big Key（大 Key）的連鎖反應",
        text: "一個 Key 的 Value 過大（如 List 萬級、String > 10MB）。影響：(1) 網路頻寬佔滿；(2) 在單執行緒 Redis 下刪除大 Key 會導致長時間阻塞（O(N) 複雜度）；(3) 叢集重平衡（Rebalance）失敗。處理：(1) 拆分資料結構；(2) 設定合適序列化減少體積；(3) 異步刪除（UNLINK 取代 DEL）。",
      },
      {
        title: "快取擊穿的 Mutex 實踐",
        text: "快取過期瞬間流量打穿。實務做法：`if (cache.get(key) == null) { if (lock.tryLock()) { data = db.load(); cache.set(key, data); lock.unlock(); } else { sleep(50); return get(key); } }`。缺點：會有等待。更好的方式是「邏輯過期」：欄位裡存一個時間戳，過期時返回舊值並異步開啟一個 Thread 更新快取。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "秒殺活動中的熱點商品 Key 打掛 Redis 節點",
        text: "場景：某爆款商品搶購，幾十萬 QPS 衝向同一個 Redis Slot。現象：該節點 CPU 100% 且網路丟包。處理：(1) 緊急啟動 L1 記憶體快取（Caffeine），每 500ms 同步一次；(2) 備份 Key 策略：將商品 Key 分身為 `sku_id:1`, `sku_id:2` 分散到叢集各處。經驗：熱點資料必須在接近用戶的地方（應用層）處理。",
      },
      {
        type: "design",
        title: "大 Key 刪除導致的「全停頓」停機事故",
        text: "現象：Redis 設定了定期清理過期 Key，某次清理一個 200MB 的 HASH Key 時停頓 2 秒，期間所有業務報超時。解法：(1) 立即升級至 Redis 4.0+ 使用 `lazyfree-lazy-expire yes`；(2) 代碼層面禁用 DEL，改用 `UNLINK` — 它會把內存釋放交給後台進程（Bio Thread）。(3) 定期腳本掃描大 Key 並逐步拆分。",
      },
    ],
    interview: [
      {
        question: "什麼是 Big Key？有什麼危害？如何排查與解決？",
        answer:
          "Big Key 指 Value 過大的 Key。危害：阻塞單執行緒、網路頻寬飽和、影響 AOF 重寫。排查：`redis-cli --bigkeys` 或分析 RDB 檔。解決：(1) 拆分 — 將一個大 List 拆成多個 small-list；(2) 異步刪除 — 用 `UNLINK`；(3) 設定 `lazyfree` 配置。核心是避免阻塞 Redis 主循環。",
        keywords: ["Value Size", "UNLINK", "Network I/O", "Blocking"],
      },
      {
        question: "如何避免快取雪崩？",
        answer:
          "三道防線：(1) 預防：資料過期時間 TTL 加上隨機數（Jitter），避免同時失效；(2) 治理：使用 Redis Cluster 保證高可用，並實施「多級快取」方案（本地+分散式）；(3) 兜底：後端加熔斷器（Circuit Breaker）與限流，快取掛了直接返回降級數據而不打掛資料庫。",
        keywords: ["Jitter", "多級快取", "熔斷降級"],
      },
    ],
  },
  redis: {
    concepts: [
      {
        title: "Redis 6.0 多執行緒真相",
        text: "Redis 6.0 引入 Multi-threaded IO。關鍵點：命令執行依然是「單執行緒」以保持原子性。多執行緒僅用於「處理網路 IO 的讀取和回傳」。這解決了單執行緒在解析大 Payload 時的網路瓶頸。效能提升約 2-3 倍，但不需要用戶處理並發鎖問題，完美保留了極簡的程式模型。",
      },
      {
        title: "Pipeline 與 Lua 腳本的原子性",
        text: "Pipeline：將多條命令打包一次發送，減少 RTT 延遲，但不保證原子性。Lua Script：Redis 內置 Lua 解釋器，整個腳本作為一條命令執行，保證原子性且減少網路開銷。資深用法：限流器、分散式鎖的釋放（判斷存不存在再刪除）必須用 Lua 以防止 Race Condition。",
      },
      {
        title: "記憶體管理與逐出策略",
        text: "Redis 是內存資料庫，核心指標是 memory usage。逐出策略：(1) allkeys-lru (最推)；(2) volatile-ttl；(3) noeviction。資深設計：必須設定 `maxmemory`。如果沒設，OOM 會導致操作系統殺掉進程。搭配 `maxmemory-samples` 調優 LRU 近似算法的精確度。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "使用 Redis Lua 腳本實作「分散式限流」",
        text: "傳統 `INCR + EXPIRE` 有非原子性問題（可能剛 INCR 完扣費掛了沒設過期）。寫法：`local curr = redis.call('get', KEYS[1]); if curr and tonumber(curr) > limit then return 0 end; curr = redis.call('incr', KEYS[1]); if tonumber(curr) == 1 then redis.call('expire', KEYS[1], ARGV[1]) end; return 1`。這保證了計數和過期設定的絕對原子化。",
      },
      {
        type: "design",
        title: "解決「分散式鎖」在 Redis Cluster 下的安全性",
        text: "場景：主從切換導致鎖遺失。A 在 Master 獲鎖，同步到 Slave 前 Master 掛了，Slave 升級為 Master 但沒鎖，B 也能獲鎖。方案：(1) 關鍵性高的場景改用 ZooKeeper/etcd（強一致）；(2) Redlock 算法（向過半節點加鎖）；(3) 業務層面加版本號或 Fencing Token（Martin Kleppmann 推薦）。",
      },
    ],
    interview: [
      {
        question: "Redis 6.0 為什麼引入多執行緒？這不違反它的初衷嗎？",
        answer:
          "不違反。Redis 的瓶頸往往不在 CPU 計算，而是在網路 IO 和 Payload 的解析。6.0 讓多個 Thread 處理 I/O 讀寫，但核心的命令處理器（Command Dispatcher）仍是單執行緒。這樣既保證了開性能提升，又避免了複雜的加鎖並發控制。這是一個非常精妙的取捨。",
        keywords: ["Multi-threaded IO", "Network Bottleneck", "Single-threaded Kernel"],
      },
      {
        question: "Pipeline 和 Lua 腳本有什麼區別？",
        answer:
          "Pipeline 僅是客戶端批次發送命令，目的是減少 RTT，伺服器是一條一條按序執行，中間可能穿插其他請求。Lua 則是保證一組命令的「原子性執行」，執行期間不會被其他請求中斷。如果是為了效能選 Pipeline，為了正確性（原子操作）選 Lua。",
        keywords: ["RTT", "Atomicity", "Batching", "Lua Engine"],
      },
    ],
  },
};
