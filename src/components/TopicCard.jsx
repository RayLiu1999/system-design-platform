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
      <div className="topic-card-title">{t(topic.titleKey)}</div>
      <div className="topic-card-subtitle">{t(topic.subtitleKey)}</div>
    </button>
  )
}
