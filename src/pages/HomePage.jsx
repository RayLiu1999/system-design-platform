// 首頁 — 學習地圖
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { CATEGORIES } from '../data/topics'
import TopicCard from '../components/TopicCard'
import './HomePage.css'

/**
 * 首頁 — 8×3 學習地圖矩陣
 * 按分類分層顯示所有 24 個主題卡片
 */
export default function HomePage() {
  const { t } = useTranslation()
  const { getTopicProgress, totalProgress } = useOutletContext()

  return (
    <div className="home-page page-enter-active" id="home-page">
      {/* 標題區域 */}
      <div className="home-header">
        <h1 className="home-title">{t('app.title')}</h1>
        <p className="home-subtitle">{t('app.subtitle')}</p>

        {/* 總進度摘要 */}
        <div className="home-progress-summary">
          <div className="home-progress-bar">
            <div
              className="home-progress-bar-fill"
              style={{ width: `${totalProgress.percentage}%` }}
            />
          </div>
          <span className="home-progress-text">
            {t('app.progress')}：{totalProgress.percentage}%（{totalProgress.completedTopics}/24 主題完成）
          </span>
        </div>
      </div>

      {/* 學習地圖 */}
      <div className="home-map">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="home-category" id={`category-${cat.id}`}>
            {/* 分類標籤 */}
            <div className="home-cat-label" style={{ color: cat.color }}>
              <span className="home-cat-line" style={{ background: cat.color }} />
              {t(cat.labelKey)}
            </div>

            {/* 主題卡片網格 */}
            <div className="home-topic-grid">
              {cat.topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  categoryColor={cat.color}
                  progress={getTopicProgress(topic.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <p className="home-footer-hint">{t('app.clickToExplore')}</p>
    </div>
  )
}
