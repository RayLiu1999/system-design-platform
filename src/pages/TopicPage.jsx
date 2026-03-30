// 主題頁面骨架 — 三段式佈局（概念講解 + 模擬器 + 面試問答）
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, Suspense, lazy } from 'react'
import { getTopicById, getAdjacentTopics } from '../data/topics'
import InterviewQA from '../components/InterviewQA'
import './TopicPage.css'

// 動態載入主題模擬器（按需載入以提升效能）
const simulatorModules = {
  'load-balancing': lazy(() => import('../topics/02-api-network/LoadBalancingSimulator.jsx')),
  'cap-theorem': lazy(() => import('../topics/01-fundamentals/CAPSimulator.jsx')),
  'cache-problems': lazy(() => import('../topics/04-cache/CacheProblemsSimulator.jsx')),
  'rate-limiting': lazy(() => import('../topics/07-security/RateLimitingSimulator.jsx')),
}

/**
 * 主題頁面 — 統一三段式結構
 * 根據 URL 參數動態載入對應主題的內容和模擬器
 */
export default function TopicPage() {
  const { topicId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getTopicProgress, markComplete } = useOutletContext()

  const topic = getTopicById(topicId)
  const { prev, next } = getAdjacentTopics(topicId)
  const progress = getTopicProgress(topicId)

  // 頁面可見時標記「已閱讀概念」
  // 只依賴 topicId 字串，避免 topic 物件和 markComplete 的參考變化導致重複執行
  useEffect(() => {
    if (topicId) {
      markComplete(topicId, 'conceptRead')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  // 主題不存在時導向首頁
  if (!topic) {
    return (
      <div className="topic-not-found">
        <h2>主題不存在</h2>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          {t('app.backToMap')}
        </button>
      </div>
    )
  }

  // 取得模擬器元件
  const SimulatorComponent = simulatorModules[topicId] || null

  return (
    <div className="topic-page page-enter-active" id={`topic-${topicId}`}>
      {/* 頂部導航 */}
      <div className="topic-nav">
        <button className="btn btn-ghost" onClick={() => navigate('/')} id="back-to-map">
          ← {t('app.backToMap')}
        </button>
        <div className="topic-nav-arrows">
          {prev && (
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/topic/${prev.id}`)}
              id="prev-topic"
            >
              ← {t(prev.titleKey)}
            </button>
          )}
          {next && (
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/topic/${next.id}`)}
              id="next-topic"
            >
              {t(next.titleKey)} →
            </button>
          )}
        </div>
      </div>

      {/* 標題 */}
      <div className="topic-header">
        <div className="topic-color-bar" style={{ background: topic.color }} />
        <h1 className="topic-title">{t(topic.titleKey)}</h1>
        <p className="topic-subtitle">{t(topic.subtitleKey)}</p>
        {/* 進度指示器 */}
        <div className="topic-checkpoints">
          <span className={`checkpoint ${progress.conceptRead ? 'done' : ''}`}>
            {progress.conceptRead ? '✓' : '○'} {t('sections.concept')}
          </span>
          <span className={`checkpoint ${progress.simulatorUsed ? 'done' : ''}`}>
            {progress.simulatorUsed ? '✓' : '○'} {t('sections.simulator')}
          </span>
          <span className={`checkpoint ${progress.qaReviewed ? 'done' : ''}`}>
            {progress.qaReviewed ? '✓' : '○'} {t('sections.interview')}
          </span>
        </div>
      </div>

      {/* 第一段：概念講解（先放置預設文案，後續各主題會替換） */}
      <section className="content-section" id="concept-section">
        <h2>📖 {t('sections.concept')}</h2>
        <div className="concept-placeholder">
          <p>此主題的概念講解即將推出。我們正在為每個主題撰寫深入的講解內容。</p>
        </div>
      </section>

      {/* 第二段：互動模擬器 */}
      <section className="content-section" id="simulator-section">
        <h2>🧪 {t('sections.simulator')}</h2>
        {SimulatorComponent ? (
          <Suspense fallback={<div className="simulator-loading">載入模擬器中...</div>}>
            <SimulatorComponent onInteract={() => markComplete(topicId, 'simulatorUsed')} />
          </Suspense>
        ) : (
          <div className="simulator-placeholder">
            <div className="placeholder-icon">🔧</div>
            <p>此主題的互動模擬器正在開發中</p>
            <span className="placeholder-hint">開發完成後，你可以在此操作互動式模擬器來深入理解概念</span>
          </div>
        )}
      </section>

      {/* 第三段：面試問答 */}
      <section className="content-section" id="interview-section">
        <h2>💬 {t('sections.interview')}</h2>
        <InterviewQA items={[
          {
            question: '此主題的面試問答即將推出',
            answer: '我們正在整理各主題的高頻面試問題和最佳回答要點。',
            keywords: ['即將推出'],
          },
        ]} />
        <button
          className="btn btn-ghost mark-qa-btn"
          onClick={() => markComplete(topicId, 'qaReviewed')}
          style={{ marginTop: 'var(--space-4)' }}
        >
          ✓ 標記面試問答已複習
        </button>
      </section>
    </div>
  )
}
