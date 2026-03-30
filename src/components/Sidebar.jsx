// 側邊欄元件 — 主題目錄樹
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../data/topics'
import './Sidebar.css'

/**
 * 側邊欄 — 依分類列出所有主題，當前主題高亮
 */
export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // 從路徑中提取當前主題 ID
  const currentTopicId = location.pathname.startsWith('/topic/')
    ? location.pathname.replace('/topic/', '')
    : null

  const handleTopicClick = (topicId) => {
    navigate(`/topic/${topicId}`)
    onClose() // 手機版點擊後關閉側邊欄
  }

  return (
    <>
      {/* 手機版遮罩層 */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} id="main-sidebar">
        <div className="sidebar-content">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="sidebar-category">
              {/* 分類標題 */}
              <div className="sidebar-cat-label" style={{ color: cat.color }}>
                <span className="sidebar-cat-dot" style={{ background: cat.color }} />
                {t(cat.labelKey)}
              </div>

              {/* 主題列表 */}
              <ul className="sidebar-topics">
                {cat.topics.map(topic => {
                  const isActive = currentTopicId === topic.id
                  return (
                    <li key={topic.id}>
                      <button
                        className={`sidebar-topic-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleTopicClick(topic.id)}
                        id={`sidebar-topic-${topic.id}`}
                      >
                        <span className="sidebar-topic-name">{t(topic.titleKey)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
