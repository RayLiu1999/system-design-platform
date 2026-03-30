export const distributed = {
  consensus: {
    concepts: [
      {
        title: "Raft 共識算法與安全性（Safety）",
        text: "Raft 不只是一場選舉。資深視角：Raft 的核心在於『Leader Completeness Property』。只有包含了所有已提交日誌的節點，才能領取選票成為 Leader。這是透過 RequestVote 請求中的 `lastLogIndex` 和 `lastLogTerm` 比較來保證的。這確保了 Leader 永遠擁有最完整的數據，簡化了同步邏輯。",
      },
      {
        title: "2PC vs 3PC：為什麼 2PC 仍然是主流？",
        text: "2PC（兩階段提交）存在同步阻塞和單點問題。3PC 引入了 Pre-Commit 和超時機制來緩解阻塞。資深視角：實務中 3PC 極少使用，因為它雖然解決了阻塞，但在網路分區時仍可能導致腦裂（Split-brain）。大多數現代系統（如 MySQL Group Replication）偏向使用 Paxos/Raft 變體，或在應用層使用 Saga 避開強一致性鎖定。",
      },
      {
        title: "Paxos：分散式共識的鼻祖",
        text: "Paxos 分為 Basic Paxos 和 Multi-Paxos。Basic Paxos 每次達成共識需要兩輪 RTT（Prepare, Accept），效率較低。Multi-Paxos 透過穩定 Leader 減少 RTT。資深視角：Raft 本質上是 Multi-Paxos 的一個更具約束力的版本，雖然靈活性稍低，但極大地降低了實現錯誤的機率。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "解析 Kubernetes 元數據儲存中心：etcd",
        text: "場景：K8s 叢集的所有狀態都存於 etcd。為什麼選 etcd？(1) 強一致性（Raft 實作）；(2) Watch 機制 — 資源變更時主動推送給 Controller。經驗：etcd 的寫入延遲受磁碟 IOPS 影響極大，建議使用 SSD 且監控 `wal_fsync_duration`。如果 etcd 延遲高，整個 K8s 叢集的反應都會變慢。",
      },
      {
        type: "practice",
        title: "處理 Raft 叢集的『腦裂』與分割",
        text: "場景：5 節點叢集，2 個節點與其餘 3 個斷開。現象：2 節點側無法達成 Quorum（2 < 3），寫入停擺；3 節點側選舉出新 Leader 繼續服務。當網路恢復，2 節點側根據 Term 大小被覆蓋為新數據。資深設計：必須使用奇數節點，且 Quorum 必須嚴格執行，否則會出現數據分叉。",
      },
    ],
    interview: [
      {
        question: "Raft 算法中，如何保證新選舉出的 Leader 一定包含所有已提交的日誌？",
        answer:
          "透過選舉限制（Election Restriction）：在 RequestVote 階段，Candidate 會帶上自己的最後一條日誌索引和 Term。投票節點會比較 Candidate 的日誌是否比自己『更新』（Term 更大，或 Term 相同但 Index 更大）。如果 Candidate 日誌不夠新，則拒絕投票。這保證了領取多數票的 Leader 必含所有 Commit 日誌。",
        keywords: ["Election Restriction", "lastLogTerm", "多數派確認"],
      },
      {
        question: "分散式事務中，2PC 的最大缺點是什麼？如何改善？",
        answer:
          "最大缺點是『同步阻塞』：參與者在等待 Coordinator 指令期間會鎖住資源，極大降低吞吐量。改善方案：(1) 使用 Saga 模式，將大事務拆為本地事務 + 補償操作；(2) TCC (Try-Confirm-Cancel) 模式，在應用層做預留資源與確認/釋放，減少資料庫層面的長事務鎖定時間。",
        keywords: ["Blocking", "Saga", "TCC", "最終一致性"],
      },
    ],
  },
  "distributed-coordination": {
    concepts: [
      {
        title: "ZooKeeper ZAB 協議與 Watch 機制",
        text: "ZooKeeper 使用 ZAB（ZooKeeper Atomic Broadcast）協議。核心理念：順序一致性。資深視角：ZK 的 Watch 機制是一次性的（One-time trigger），觸發後需重新註冊。這是一把雙刃劍：減少了伺服器壓力，但也要求客戶端必須處理『Watch 丟失』的空窗期，通常透過讀取最新狀態來補救。",
      },
      {
        title: "租約（Lease）機制：主權的平滑交接",
        text: "Lease 是分散式鎖的一種優化。資深視角：單純的鎖在持鎖者掛掉時需等待 TTL。Lease 給予持鎖者在一段時間內的『絕對權力』。若 Lease 到期未續約，權力自動失效。這常用於 Leader Election（如 Google Chubby），避免了因時鐘漂移或 GC Pause 導致的雙主（Dual-Master）問題。",
      },
      {
        title: "一致性雜湊（Consistent Hashing）再設計",
        text: "解決節點增減導致的緩存劇烈抖動。資深視角：簡單的一致性雜湊會有節點分佈不均問題。現代方案引入『虛擬節點（Virtual Nodes）』，將實體節點映射成數百個虛擬位點，使負載分佈趨於完美的均勻。常見於 DynamoDB、Cassandra 與各種分散式快取系統。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計一個高可用的分散式定時任務調度器",
        text: "方案：(1) 使用 ZooKeeper 做選主（Leader），負責分派任務；(2) 任務描述存於 DB；(3) Worker 節點註冊到 ZK 路徑下做服務發現。關鍵：當 Leader 掛掉，ZK 自動觸發 Watch，備選節點立即搶佔成為新 Leader。這利用了 ZK 的強一致性保證任務不被重複執行。",
      },
    ],
    interview: [
      {
        question: "ZooKeeper 和 Redis 實作的分散式鎖，你選哪一個？為什麼？",
        answer:
          "Redis 選項：效能高、實現簡單，適合高頻但容忍極低機率丟鎖的場景（如防重複點讚）。ZooKeeper 選項：可靠性極高、支援公平鎖、利用臨時順序節點與 Watch 機制，自動處理進程崩潰，適合金融級、任務調度等絕對嚴格的場景。一般來說，業務場景選 Redis，架構組件（如 Kafka 選主）選 ZK。",
        keywords: ["Performance vs Reliability", "Ephemeral Node", "Watch"],
      },
      {
        question: "在大規模叢集中，Snowflake ID 的『時鐘回撥』問題怎麼解決？",
        answer:
          "(1) 容忍小範圍回撥：直接等待時鐘追上；(2) 拒絕服務：丟出異常，依賴監控處理；(3) 備用序列：若回撥發生，切換到另一組邏輯序列空間；(4) 定時同步：使用 NTP 嚴格同步時間。百度 UidGenerator 會在啟動時測試平均回撥時間並預留緩衝。",
        keywords: ["Clock Skew", "NTP", "Sequence Space"],
      },
    ],
  },
  microservices: {
    concepts: [
      {
        title: "Service Mesh (Istio) 深度解析",
        text: "資深視角：Service Mesh 將『通訊治理』從業務代碼中剝離。每個 Pod 裡有一個 Envoy Proxy（Sidecar）。優點：支援 mTLS 加密、細粒度金絲雀發佈、故障注入測試。代價：增加了網路跳轉（Hop）導致的延遲與運維複雜度。一般在微服務數量 > 50 個且通訊複雜度高時才考慮引入。",
      },
      {
        title: "絞殺者模式（Strangler Pattern）",
        text: "老舊單體架構遷移的最佳實踐。過程：不重寫整個系統，而是在外層加一個路由層，將新功能寫在微服務中，舊功能保留。隨時間推移，新服務逐漸『勒死』舊單體。這保證了遷移過程中的業務連續性，是風險最低的架構現代化策略。",
      },
      {
        title: "CQRS 與微服務數據拆分",
        text: "當單一資料庫無法承載查詢壓力時，使用 Command Query Responsibility Segregation。資深視角：在微服務中，這通常意味著寫入端更新自己的原子庫，讀取端訂閱訊息佇列將數據同步到 Elasticsearch 或 Redis 做高性能查詢。難點在於數據同步的延遲（最終一致性）處理。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "實施百萬級訂單系統的微服務拆分",
        text: "順序：(1) 按業務邊界定義 Bounded Context（訂單、支付、帳戶）；(2) 採用 Database per Service，絕對禁止跨庫 Join；(3) 跨服務查詢改用 API 組合或數據異構；(4) 導入 API Gateway 做統一鑑權與限流。經驗：拆分初期會導致效能下降與開發變慢，核心價值在於團隊的並行開發效率與系統負載的隔離。",
      },
    ],
    interview: [
      {
        question: "API Gateway 與 Service Mesh 的區別與聯繫？",
        answer:
          "API Gateway 處理的是『南北向流量』（外部客戶端到內部服務），專注於鑑權、路由、請求聚合與協議轉換。Service Mesh 處理的是『東西向流量』（內部服務之間），專注於負載均衡、熔斷、重試、可觀測性與安全。兩者通常共存：Gateway 擋在最前方，Istio 管理內部叢集通訊。",
        keywords: ["南北向 vs 東西向", "Envoy", "Sidecar"],
      },
      {
        question: "微服務如何解決分散式請求的追蹤問題？",
        answer:
          "使用分散式追蹤系統（Distributed Tracing），如 OpenTelemetry 配合 Jaeger。核心原理：請求進入 Gateway 時產生 Trace ID，並在服務間跳轉時透過 HTTP Header (B3 Propagation) 傳遞。每個服務產生 Span ID 並異步上傳。這讓開發者能一目瞭然地看清整個調用鏈中的性能瓶頸。",
        keywords: ["Trace ID", "Span", "Context Propagation", "Jaeger"],
      },
    ],
  },
};
