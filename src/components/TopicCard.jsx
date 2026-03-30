// 主題卡片元件 — 用於首頁學習地圖
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './TopicCard.css'

/**
 * 主題卡片 — 顯示主題名稱、副標題和學習進度
 * 用於首頁的 8×3 學習地圖矩陣
 */
export default function TopicCard({ topic, categoryColor, progress }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const statusClass = progress.status === 'completed'
    ? 'topic-card-completed'
    : progress.status === 'in-progress'
    ? 'topic-card-progress'
    : ''

  return (
    <button
      className={`topic-card ${statusClass}`}
      style={{ '--card-accent': categoryColor }}
      onClick={() => navigate(`/topic/${topic.id}`)}
      id={`topic-card-${topic.id}`}
    >
      {/* 完成徽章 */}
      {progress.status === 'completed' && (
        <span className="topic-card-badge">✓</span>
      )}

      {/* 進行中指示器 */}
      {progress.status === 'in-progress' && (
        <span className="topic-card-badge progress-badge">{progress.percentage}%</span>
      )}

      <div className="topic-card-title">{t(topic.titleKey)}</div>
      <div className="topic-card-subtitle">{t(topic.subtitleKey)}</div>

      {/* 底部進度條 */}
      {progress.status !== 'not-started' && (
        <div className="topic-card-bar">
          <div
            className="topic-card-bar-fill"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}
    </button>
  )
}
