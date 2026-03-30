export const observability = {
  observability: {
    concepts: [
      {
        title: "高基數（High Cardinality）指標問題",
        text: "資深視角：Prometheus 儲存指標時，每個 Label 組合都是一個序列。如果將 `user_id` 或 `order_id` 作為 Label，會導致指標系統 OOM 並崩潰。解決方案：(1) 只對低基數標籤做 Metrics（如 `status_code`, `service_name`）；(2) 高基數數據放入日誌或分散式追蹤中查詢。",
      },
      {
        title: "Metrics + Traces 的聯動：Exemplars",
        text: "當你在 Grafana 看到一個延遲尖峰（Metric），如何快速找到對應的請求？資深視角：使用 Exemplars。它在 Prometheus 指標中附加一個特定的 Trace-ID。點擊指標點即可跳轉至 Jaeger 看到該請求的完整鏈路，極大提升排障效率。",
      },
      {
        title: "SLO 與錯誤預算（Error Budget）",
        text: "SLI 是衡量指標，SLO 是目標。資深視角：Error Budget 是 100% - SLO。如果你的可用性目標是 99.9%，你有 0.1% 的出錯空間。當 Budget 用完，應停止新功能發佈，全面轉向穩定性治理（SRE 核心思想）。這解決了開發（求快）與運維（求穩）的天然矛盾。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "排查分散式系統中的 P99 延遲尖峰",
        text: "SOP：(1) 查看 Grafana 確認是否為全域尖峰或單機問題；(2) 透過 Trace Exemplar 找到慢請求；(3) 分析 Span 回報，確認是 DB 慢、下游服務慢還是垃圾回收（GC）停頓；(4) 檢查 CPU Throttling。經驗：P99 尖峰通常由『長尾效應』引起，如 JVM 生存區爆滿導致的 Full GC。",
      },
    ],
    interview: [
      {
        question: "如何監控一個分散式事務的健康度？",
        answer:
          "(1) 埋點：在交易開始與結束處打點；(2) 監控成功率與平均耗時（Metrics）；(3) 監控『懸掛事務』：任務進入 Queue 超時未處理的數量；(4) 日誌追蹤：記錄 Trace ID 並在失敗時關鍵字告警。最資長的回答是：應建立一個『對帳監控』，定時對比 DB 與 MQ 的狀態，主動發現一致性缺口。",
        keywords: ["Exemplars", "SLA monitoring", "對帳機制", "Distributed Tracing"],
      },
      {
        question: "Push 跟 Pull 監控模型哪個更好？",
        answer:
          "Pull（Prometheus）優點：服務不需知道監控方的存在，易於水平擴展，適合靜態架構。Push（StatsD / InfluxDB）優點：即時性更高，適合 Serverless 或極短壽命的任務（如 Lambda）。資深視角：雲原生環境主流選 Pull，因為它具備更強的服務發現整合能力（K8s），且不會因為監控方掛掉導致業務服務阻塞。",
        keywords: ["Service Discovery", "Serverless", "Metric Scrape"],
      },
    ],
  },
  "capacity-planning": {
    concepts: [
      {
        title: "Little's Law：容量估算的核心理論",
        text: "公式：`平均請求數 (L) = 請求到達率 (λ) * 平均處理時間 (W)`。資深視角：如果你知道 API 每秒進來 100 轉，處理平均 0.2 秒，那麼系統中平均會有 20 個並存請求。這決定了你所需的 Thread Pool 大小或並發連線數。是 back-of-envelope 估算的科學依據。",
      },
      {
        title: "阿姆達爾定律 (Amdahl's Law) 與擴展瓶頸",
        text: "系統的速度提升受限於其必須串行執行的部分。資深視角：如果你將伺服器數量增加 10 倍，但資料庫鎖是唯一的串行路徑，你的效能可能只會提升 2 倍。這解釋了為什麼微服務拆分（解開串行依賴）比單純加機器（Scale-up）更有效。",
      },
      {
        title: "儲存傾斜與分區設計 (Sharding Skew)",
        text: "場景：按 `user_id` 分鏡像，但有個大網紅用戶數據是普通人的 1 萬倍。資深視角：這會導致單個分區過載。解決方案：(1) 對熱點 Key 加入隨機後綴（Salt）；(2) 將熱點用戶單獨移出到專用節點。面試中提到『熱點處理』比單純講『雜湊算法』更能體現深度。",
      },
    ],
    scenarios: [
      {
        type: "design",
        title: "設計百萬 QPS 級別的雙十一促銷容量規劃",
        text: "步驟：(1) 基準測試（Benchmark）：壓測單機極限（如 1000 QPS）；(2) 計算機器數：100 萬 / 1000 = 1000 台；(3) 考慮容餘：增加 30% 應對不可預知流量；(4) 計算頻寬：QPS * 平均 Payload (10KB) ≈ 10GB/s。經驗：核心不在機器數，而在於資料庫的 IOPS 極限，必須搭配強大的非同步寫入緩衝。",
      },
    ],
    interview: [
      {
        question: "如何進行 Back-of-envelope 估算？（例如 Twitter 儲存量）",
        answer:
          "(1) 確定 DAU（3 億）；(2) 估算單日寫入頻率（0.1 條/人）；(3) 計算日新增數據量（3000 萬條）；(4) 估算每條大小（200 Byte 文本 + 附件路徑）；(5) 總額：30M * 200B ≈ 6GB/天。考慮 3 副本與 10 年存儲：6GB * 3 * 3650 ≈ 65TB。這是一個大方向正確的思考過程，不強求數據百分之百精確。",
        keywords: ["DAU", "Payload", "Storage over Time"],
      },
    ],
  },
  devops: {
    concepts: [
      {
        title: "GitOps：陳述式運維的極致",
        text: "ArgoCD 監控 Git Repo 的 YAML 變更並同步到 Kubernetes。資深視角：GitOps 解決了『配置漂移』問題。任何人手動修改 K8s 狀態，ArgoCD 數據比對後會立即將其覆蓋。這強制了運維操作必須透過程式碼審核（PR），大大提高了安全性與可靠性。",
      },
      {
        title: "混沌工程（Chaos Engineering）",
        text: "資深視角：分散式系統中，故障是常態（Everything fails all the time）。我們不該祈禱不發生故障，而應主動製造故障（如殺掉 Pod、增加延遲）。原則：限制爆炸半徑（Blast Radius）、先在 Staging 測試、有明確的自動中斷機制。Netfix Chaos Monkey 是先驅。",
      },
      {
        title: "不可變基礎設施 (Immutable Infrastructure)",
        text: "不再透過 SSH 到伺服器改配置（Mutable），而是每次變更都重新打包 Image 並部署。優點：環境高度一致、易於回滾到任意版本。資深設計：必須配合雲原生的 Auto-scaling，讓舊版在新版 Healthy 後自動消亡。",
      },
    ],
    scenarios: [
      {
        type: "practice",
        title: "設計零停機 (Zero-Downtime) 資料庫遷移策略",
        text: "場景：更換資料庫 Schema。步驟：(1) 同步寫入舊庫與新庫（Dual-write）；(2) 背景遷移存量數據（Backfill）；(3) 校驗新舊庫數據一致性；(4) 將讀取流量切換到新庫；(5) 停用舊庫寫入。經驗：Dual-write 時必須確保異步或最終一致，避免因為新庫慢而拖慢現有業務。",
      },
    ],
    interview: [
      {
        question: "Kubernetes 的 Rolling Update 怎麼運作？",
        answer:
          "K8s 會在創建一個新版本 Pod 的同時，殺掉一個舊版本 Pod。關鍵參數：`maxSurge`（允許超出預定數量的 Pod 數）和 `maxUnavailable`（允許最多不可用的 Pod 數）。如果 `maxSurge=1, maxUnavailable=0`，則保證了在更新過程中，始終有 100% 的可用實例。",
        keywords: ["maxSurge", "maxUnavailable", "Readiness Probe"],
      },
      {
        question: "金絲雀發佈 (Canary) 與 藍綠發佈 (Blue-Green) 的選型？",
        answer:
          "藍綠發佈需要兩倍伺服器資源，但切換極快，適合對資源不敏感且要求『一鍵回滾』的關鍵服務。金絲雀發佈更節省資源且能逐步觀察用戶反應，適合大規模流量、需要灰度測試新功能的場景。在 K8s 中，搭配 Istio 或 Flagger 實施金絲雀發佈已是資深團隊的標準配備。",
        keywords: ["Incremental Rollout", "Traffic Splitting", "Blast Radius"],
      },
    ],
  },
};
