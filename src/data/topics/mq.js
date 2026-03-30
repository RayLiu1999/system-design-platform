export const mq = {
  "message-queue": {
    concepts: [
      {
        title: "訊息佇列核心保證與 Exactly-once",
        text: "三種語義：At-most-once, At-least-once (最常見), Exactly-once。資深視視角：Exactly-once 在分散式系統中是極大挑戰。Kafka 透過『冪等寫入（Sequence ID）』與『兩階段提交事務（Transactional API）』實作。這保證了在 Producer 發送多個 Topic 或 Partition 時，要麼全部成功，要麼全部失敗，且 Consumer 不會讀到未提交的訊息。",
      },
      {
        title: "Kafka vs RabbitMQ：推拉模型的架構取捨",
        text: "Kafka 是 Pull 模型（Consumer 主動拉），適合大數據、流處理，優點是 Consumer 可根據自身處理能力控制速率。RabbitMQ 預設是 Push 模型（Broker 推送），延遲極低但易導致 Consumer 過載。Kafka 的日誌持久化（Log-based）讓訊息可重放（Replay），RabbitMQ 則在 ACK 後通常立即刪除。",
      },
      {
        title: "訊息順序：分區順序 vs 全域順序",
        text: "資深視角：不要追求全球順序，那是效能殺手。實務上保證『相同業務 ID（如 order_id）』進入相同 Partition。Kafka 透過 Key Hash 實現。如果 Partition 發生 Rebalance，需確保舊 Consumer 停止後新 Consumer 才接手，避免短暫的順序錯亂。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "線上環境出現億級訊息積壓（Consumer Lag）",
        text: "場景：促銷活動中 Consumer Bug 導致積壓。應急 Sop：(1) 修復 Consumer 並暫停業務逻辑；(2) 建立新 Topic 並擴大 Partition 數量；(3) 寫一個簡單的『轉發 Worker』將舊 Topic 訊息快速搬到新 Topic；(4) 啟動 10 倍數量的 Consumer 消費新 Topic。經驗：絕對不要直接在舊 Topic 增加 Consumer（受限於 Partition 數）。",
      },
      {
        type: "design",
        title: "設計 Kafka Exactly-once 支付狀態同步",
        text: "方案：使用 Kafka Transactional Producer。代碼流程：`producer.initTransactions(); try { producer.beginTransaction(); producer.send(topic1, data1); producer.sendOffsetsToTransaction(offsets, groupID); producer.commitTransaction(); } catch { producer.abortTransaction(); }`。配合 Consumer `isolation.level=read_committed`。這確保了『扣款狀態訊息』與『消費進度提交』是原子操作。",
      },
    ],
    interview: [
      {
        question: "如何保證訊息不丟失？請從生產、存儲、消費三端說明。",
        answer:
          "生產端：配置 acks=all（所有副本確認），且重試次數 max.retries 設為大值。存儲端：設定 replication.factor >= 3，且 min.insync.replicas >= 2。消費端：關閉自動提交（enable.auto.commit=false），確保業務邏輯執行成功後才手動提交 offset。這樣才能達成數據的端到端不丟。",
        keywords: ["acks=all", "副本同步", "手動提交", "端到端保證"],
      },
      {
        question: "分散式系統中如何實作訊息的冪等消費？",
        answer:
          "三種方案：(1) 利用資料庫唯一鍵（Unique Key）攔截重複寫入；(2) 使用分散式鎖（Redis SETNX）記錄 message_id；(3) 狀態機檢查 — 判斷當前狀態是否已處理過該階段（如訂單狀態已是『已支付』則忽略『支付成功』訊息）。(1) 是效能與可靠性的平衡點。",
        keywords: ["唯一索引", "Redis 去重", "狀態機控制"],
      },
    ],
  },
  "event-driven": {
    concepts: [
      {
        title: "Outbox Pattern：解決『雙寫』不一致問題",
        text: "場景：更新 DB 同時發送 MQ 訊息。資深視角：DB 更新成功但發 MQ 失敗會導致數據不一致。方案：在同一個 DB Transaction 中，將訊息寫入 `outbox` 表。另起一個服務（或使用 CDC 工具如 Debezium）監控 `outbox` 表並發送至 MQ。這將分散式事務轉化為本地事務，保證了 Event 發送的可靠性。",
      },
      {
        title: "Saga Pattern：Choreography vs Orchestration",
        text: "Choreography（編舞）：無中心節點，服務間透過事件鏈動，適合簡單場景。Orchestration（編排）：由一個中央狀態機（Saga Manager）控制流程，適合複雜長事務。資深視角：Orchestration 易於監控與回滾（補償操作方便管理），減少了循環依賴的風險，是大型微服務系統的首選。",
      },
      {
        title: "Dead Letter Queue (DLQ) 的策略設計",
        text: "訊息連續重試失敗後進入 DLQ。資深設計：(1) 設定指數退避（Exponential Backoff）；(2) DLQ 應配備監控告警，由人工或自動補償腳本處理；(3) 區分『可恢復錯誤』（如超時）與『邏輯錯誤』（如格式錯誤，直接進 DLQ）。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "實作銀行轉帳的 Saga 分散式事務",
        text: "流程：(1) Service-A 預扣 A 帳戶款項；(2) 發布 `A_Deducted` 事件；(3) Service-B 收到後增加 B 帳戶款項；(4) 若 (3) 失敗，則 B 發布 `B_Failed`，A 訂閱後執行『退款』補償。使用 Orchestrator 維持狀態機，處理超時與網路分區導致的懸掛請求。比 2PC 吞吐量高出數倍。",
      },
      {
        type: "practice",
        title: "基於 Debezium 實現零延遲的 Cache 刷新",
        text: "方案：監控 MySQL Binlog，當訂單更新時，Debezium 發送事件到 Kafka，一個專門的『Cache Refresher』消費事件並更新 Redis。優點：業務代碼無需入侵、異步解耦、不會因為發送 MQ 失敗影響主業務。這是實作資料庫與快取最終一致性的資深模式。",
      },
    ],
    interview: [
      {
        question: "什麼是 Outbox Pattern？它解決了什麼問題？",
        answer:
          "它解決了資料庫更新與訊息發送之間的原子性問題。在沒有 Outbox 時，DB 更新成功但 MQ 發送失敗會導致外部服務收不到通知。Outbox 模式將訊息先存在本地 DB 的一表，隨後由異步 process 保證訊息一定會被送往 MQ。它是微服務最終一致性的核心基石。",
        keywords: ["原子性", "CDC", "雙寫問題", "本地事務"],
      },
      {
        question: "Saga 模式中，補償事務（Compensating Transaction）失敗了怎麼辦？",
        answer:
          "這是 Saga 的極端情況。處理：(1) 持續重試補償操作；(2) 仍然失敗則記錄日誌，觸發高級別告警，進行人工介入。設計宗旨：補償事務必須是『冪等』且『不可失敗』的業務逻辑。如果補償機制本身不可靠，則整個 Saga 就失去價值。",
        keywords: ["冪等", "人工介入", "告警機制"],
      },
    ],
  },
  "async-processing": {
    concepts: [
      {
        title: "背壓（Backpressure）與流量控制",
        text: "當生產速度大於消費速度，佇列會爆滿。資深視角：系統必須有反饋機制。策略：(1) 阻塞生產者；(2) 使用固定大小佇列，滿了直接丟棄（Load Shedding）；(3) 動態擴展 Consumer。如果沒有背壓保護，記憶體 OOM 是時間問題。",
      },
      {
        title: "狀態機任務追蹤：從 Task Queue 到 Workflow",
        text: "簡單異步可用 Redis List。複雜流程需狀態機。資深視角：任務應有 `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `RETRYING` 狀態。推薦使用 Temporal 或 AWS Step Functions 將任務定義為持久化的工作流，即使服務重啟也能恢復進度。",
      },
      {
        title: "異步處理的副作用與結果回傳",
        text: "回應式設計：用戶發起任務獲得 Task-ID，隨後透過 (1) 短輪詢 (Polling)、(2) 長輪詢 (Long Polling)、(3) WebSocket 或 (4) Server-Sent Events (SSE) 取得進度。推薦針對 Web 場景用 SSE，針對後台批次處理用 Webhook 回傳結果。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計可擴展的分散式影片轉碼 Pipeline",
        text: "架構：S3 上傳觸發 Lambda → 寫入 SQS → 多台 GPU Worker 群組競爭消費。設計：(1) 每個分片 (Chunk) 獨立任務；(2) 使用 Visibility Timeout 防止重複領取；(3) 任務進度存於 Redis Hash。若 Worker 掛了，Timeout 到期訊息重回佇列，實現高可用重試。結果合併後 Webhook 通知用戶。",
      },
    ],
    interview: [
      {
        question: "如何設計一個支援萬級並發的異步任務系統？",
        answer:
          "關鍵點：(1) 選型高效 MQ（Kafka）；(2) 任務無狀態化與分群；(3) 每個任務必備 Timeout 與重試機制；(4) 分散式 ID (Snowflake) 追蹤任務。此外，需針對熱點任務做流量過濾，並實作 DLQ 以保護主流程。如果是超長時間任務（數小時），建議引入 Temporal 這類 Workflow Engine。",
        keywords: ["Snowflake ID", "Timeout", "Workflow Engine", "無狀態"],
      },
    ],
  },
};
