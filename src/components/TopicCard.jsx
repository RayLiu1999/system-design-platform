// 主題卡片元件 — 用於首頁學習地圖
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './TopicCard.css'

/**
 * 主題卡片 — 顯示主題名稱和副標題
 * 用於首頁的 8×3 學習地圖矩陣
 */
export default function TopicCard({ topic, categoryColor }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <button
      className="topic-card"
      style={{ '--card-accent': categoryColor }}
      onClick={() => navigate(`/topic/${topic.id}`)}
      id={`topic-card-${topic.id}`}
    >
      <div className="topic-card-content">
        <div className="topic-card-title">{t(topic.titleKey)}</div>
        <div className="topic-card-subtitle">{t(topic.subtitleKey)}</div>
      </div>
      
      <div className="topic-card-arrow" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>

      <div className="topic-card-glow" />
    </button>
  )
}
