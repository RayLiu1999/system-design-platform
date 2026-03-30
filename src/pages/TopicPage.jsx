// 主題頁面骨架 — 四段式佈局（概念講解 + 實戰場景 + 模擬器 + 面試問答）
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Suspense, lazy } from 'react'
import { getTopicById, getAdjacentTopics } from '../data/topics'
import topicContent from '../data/topicContent'
import InterviewQA from '../components/InterviewQA'
import './TopicPage.css'

// 動態載入主題模擬器（按需載入以提升效能）
const simulatorModules = {
  'load-balancing': lazy(() => import('../topics/02-api-network/LoadBalancingSimulator.jsx')),
  'cap-theorem': lazy(() => import('../topics/01-fundamentals/CAPSimulator.jsx')),
  'scalability': lazy(() => import('../topics/01-fundamentals/ConsistencySimulator.jsx')),
  'cache-problems': lazy(() => import('../topics/04-cache/CacheProblemsSimulator.jsx')),
  'rate-limiting': lazy(() => import('../topics/07-security/RateLimitingSimulator.jsx')),
  'consensus': lazy(() => import('../topics/06-distributed/RaftSimulator.jsx')),
  'message-queue': lazy(() => import('../topics/05-message-queue/MessageQueueSimulator.jsx')),
  'db-scaling': lazy(() => import('../topics/03-database/DBScalingSimulator.jsx')),
  'distributed-coordination': lazy(() => import('../topics/06-distributed/DistributedCoordSimulator.jsx')),
  'auth': lazy(() => import('../topics/07-security/AuthFlowSimulator.jsx')),
  'observability': lazy(() => import('../topics/08-observability/ObservabilitySimulator.jsx')),
  'cache-strategy': lazy(() => import('../topics/04-cache/CacheStrategySimulator.jsx')),
  'event-driven': lazy(() => import('../topics/05-message-queue/EventDrivenSimulator.jsx')),
  'api-design': lazy(() => import('../topics/02-api-network/APIDesignSimulator.jsx')),
  'cdn-proxy': lazy(() => import('../topics/02-api-network/CDNSimulator.jsx')),
  'security-vulnerabilities': lazy(() => import('../topics/07-security/SecuritySimulator.jsx')),
  'async-processing': lazy(() => import('../topics/05-message-queue/AsyncProcessingSimulator.jsx')),
  'relational-db': lazy(() => import('../topics/03-database/RelationalDBSimulator.jsx')),
  'nosql-db': lazy(() => import('../topics/03-database/NoSQLSimulator.jsx')),
  'redis': lazy(() => import('../topics/04-cache/RedisSimulator.jsx')),
  'capacity-planning': lazy(() => import('../topics/08-observability/CapacityPlanningSimulator.jsx')),
  'high-availability': lazy(() => import('../topics/01-fundamentals/HighAvailabilitySimulator.jsx')),
  'microservices': lazy(() => import('../topics/06-distributed/MicroservicesSimulator.jsx')),
  'devops': lazy(() => import('../topics/08-observability/DevOpsSimulator.jsx')),
}

/**
 * 主題頁面 — 四段式結構
 * 概念講解 → 實戰場景 → 互動模擬器 → 面試問答
 */
export default function TopicPage() {
  const { topicId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const topic = getTopicById(topicId)
  const { prev, next } = getAdjacentTopics(topicId)
  const content = topicContent[topicId] || null

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
      </div>

      {/* 第一段：概念講解 */}
      <section className="content-section" id="concept-section">
        <h2>📖 {t('sections.concept')}</h2>
        {content?.concepts ? (
          <div className="concept-content">
            {content.concepts.map((c, i) => (
              <div key={i} className="concept-block">
                <h3 className="concept-block-title">{c.title}</h3>
                <p className="concept-block-text">{c.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="concept-placeholder">
            <p>此主題的概念講解即將推出。</p>
          </div>
        )}
      </section>

      {/* 第二段：實戰場景（含產品設計題） */}
      {content?.scenarios && content.scenarios.length > 0 && (
        <section className="content-section scenarios-section" id="scenarios-section">
          <h2>🎯 實戰場景</h2>
          <div className="scenarios-content">
            {content.scenarios.map((s, i) => (
              <div key={i} className="scenario-block">
                <div className="scenario-label">{s.type === 'design' ? '🏗️ 產品設計' : '🔥 生產實戰'}</div>
                <h3 className="scenario-block-title">{s.title}</h3>
                <p className="scenario-block-text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 第三段：互動模擬器 */}
      <section className="content-section" id="simulator-section">
        <h2>🧪 {t('sections.simulator')}</h2>
        {SimulatorComponent ? (
          <Suspense fallback={<div className="simulator-loading">載入模擬器中...</div>}>
            <SimulatorComponent />
          </Suspense>
        ) : (
          <div className="simulator-placeholder">
            <div className="placeholder-icon">🔧</div>
            <p>此主題的互動模擬器正在開發中</p>
            <span className="placeholder-hint">開發完成後，你可以在此操作互動式模擬器來深入理解概念</span>
          </div>
        )}
      </section>

      {/* 第四段：面試問答 */}
      <section className="content-section" id="interview-section">
        <h2>💬 {t('sections.interview')}</h2>
        <InterviewQA items={content?.interview || [
          { question: '此主題的面試問答即將推出', answer: '我們正在整理各主題的高頻面試問題和最佳回答要點。', keywords: ['即將推出'] },
        ]} />
      </section>
    </div>
  )
}
