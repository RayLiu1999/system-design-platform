# 資深後端系統設計學習平台

這是一個專門為資深後端工程師設計的現代化、互動式學習平台，旨在深入掌握系統設計模式、真實架構場景以及高階面試準備。

---

## 核心特色

- **全面模組化架構**：技術內容存放於 `src/data/topics/` 目錄下，採用 ESM 模組化管理，便於技術模組的獨立擴充與維護。
- **資深工程師視角**：拒絕膚淺的名詞解釋，專注於解決實際架構中的複雜痛點：
  - **訊息佇列 (Messaging)**：深度解析 **Exactly-once** 事務保證、**Outbox Pattern** 結合 CDC 解決雙寫問題，以及面對億級訊息積壓的應急處理策略（如臨時 Topic 重平衡）。
  - **分散式系統 (Distributed)**：詳解 **Raft** 安全性保證（Leader Completeness）、ZooKeeper **Lease 機制**，以及 **Snowflake ID** 在分布式環境下的時鐘回撥解決方案。
  - **網路安全 (Security)**：深入 **OIDC/OAuth2 (PKCE)** 標準、**IDOR/SSRF** 實戰防禦場景，以及針對 DDoS 的**自適應限流 (Adaptive Throttling)** 策略。
  - **可觀測性與運維 (SRE)**：探討監控中的**高基數 (High Cardinality)** 問題、利用 **Little's Law** 進行科學容量規劃，以及**零探機 (Zero-Downtime)** 資料庫遷移方案。
- **互動式模擬器**：內建多個動態模擬器，直觀演示負載均衡、快取三兄弟（穿透/擊穿/雪崩）、訊息積壓與消費語義等系統現象。
- **專業面試庫**：精選專為資深後端設計的面試問答，著重於架構權衡 (Trade-offs) 與極限場景下的解決方案。
- **極致閱讀體驗**：簡約、專業且具備響應式設計的技術文檔介面，專為深度學習與內容查閱優化。

---

## 技術棧

- **前端框架**：[React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **樣式處理**：[Tailwind CSS](https://tailwindcss.com/)
- **狀態管理**：React Context / Hooks
- **國際化**：[i18next](https://www.i18next.com/)
- **圖標庫**：[Lucide React](https://lucide.dev/)

---

## 專案結構

```text
src/
├── components/       # 可複用 UI 組件與互動式模擬器
├── data/
│   ├── topics/       # 模組化的技術內容 (JS 格式)
│   │   ├── mq.js
│   │   ├── security.js
│   │   ├── observability.js
│   │   └── index.js  # 內容匯出主入口
├── hooks/            # 用於模擬器的自定義 Hook
└── pages/            # 應用主版面與路由配置
```

---

## 快速開始

### 環境需求

- Node.js (v18 或更高版本)
- npm 或 pnpm

### 安裝與執行

1. 複製專案：
   ```bash
   git clone https://github.com/RayLiu1999/system_design_note_web.git
   ```
2. 安裝依賴：
   ```bash
   npm install
   # 或
   pnpm install
   ```
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

---

## 授權條款

本專案依據 MIT License 授權 — 詳見 [LICENSE](LICENSE) 檔案。

---

[English Version (英文版本)](README.md)
