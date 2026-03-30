// 主題資料設定 — 定義所有 8 個分類和 24 個主題的結構
// 這份資料驅動首頁學習地圖、側邊欄導航和路由

/**
 * 主題分類定義
 * 每個分類包含多個主題，每個主題有唯一 ID、色彩 token 和模擬器可用狀態
 */
export const CATEGORIES = [
  {
    id: 'fundamentals',
    labelKey: 'categories.fundamentals',
    color: 'var(--clr-fundamentals)',
    topics: [
      { id: 'cap-theorem', titleKey: 'topics.cap-theorem.title', subtitleKey: 'topics.cap-theorem.subtitle', hasSimulator: true },
      { id: 'scalability', titleKey: 'topics.scalability.title', subtitleKey: 'topics.scalability.subtitle', hasSimulator: true },
      { id: 'high-availability', titleKey: 'topics.high-availability.title', subtitleKey: 'topics.high-availability.subtitle', hasSimulator: false },
    ],
  },
  {
    id: 'api',
    labelKey: 'categories.api',
    color: 'var(--clr-api)',
    topics: [
      { id: 'api-design', titleKey: 'topics.api-design.title', subtitleKey: 'topics.api-design.subtitle', hasSimulator: true },
      { id: 'load-balancing', titleKey: 'topics.load-balancing.title', subtitleKey: 'topics.load-balancing.subtitle', hasSimulator: true },
      { id: 'cdn-proxy', titleKey: 'topics.cdn-proxy.title', subtitleKey: 'topics.cdn-proxy.subtitle', hasSimulator: true },
    ],
  },
  {
    id: 'database',
    labelKey: 'categories.database',
    color: 'var(--clr-database)',
    topics: [
      { id: 'relational-db', titleKey: 'topics.relational-db.title', subtitleKey: 'topics.relational-db.subtitle', hasSimulator: true },
      { id: 'nosql-db', titleKey: 'topics.nosql-db.title', subtitleKey: 'topics.nosql-db.subtitle', hasSimulator: true },
      { id: 'db-scaling', titleKey: 'topics.db-scaling.title', subtitleKey: 'topics.db-scaling.subtitle', hasSimulator: true },
    ],
  },
  {
    id: 'cache',
    labelKey: 'categories.cache',
    color: 'var(--clr-cache)',
    topics: [
      { id: 'cache-strategy', titleKey: 'topics.cache-strategy.title', subtitleKey: 'topics.cache-strategy.subtitle', hasSimulator: true },
      { id: 'cache-problems', titleKey: 'topics.cache-problems.title', subtitleKey: 'topics.cache-problems.subtitle', hasSimulator: true },
      { id: 'redis', titleKey: 'topics.redis.title', subtitleKey: 'topics.redis.subtitle', hasSimulator: true },
    ],
  },
  {
    id: 'mq',
    labelKey: 'categories.mq',
    color: 'var(--clr-mq)',
    topics: [
      { id: 'message-queue', titleKey: 'topics.message-queue.title', subtitleKey: 'topics.message-queue.subtitle', hasSimulator: true },
      { id: 'event-driven', titleKey: 'topics.event-driven.title', subtitleKey: 'topics.event-driven.subtitle', hasSimulator: true },
      { id: 'async-processing', titleKey: 'topics.async-processing.title', subtitleKey: 'topics.async-processing.subtitle', hasSimulator: true },
    ],
  },
  {
    id: 'distributed',
    labelKey: 'categories.distributed',
    color: 'var(--clr-distributed)',
    topics: [
      { id: 'consensus', titleKey: 'topics.consensus.title', subtitleKey: 'topics.consensus.subtitle', hasSimulator: true },
      { id: 'distributed-coordination', titleKey: 'topics.distributed-coordination.title', subtitleKey: 'topics.distributed-coordination.subtitle', hasSimulator: true },
      { id: 'microservices', titleKey: 'topics.microservices.title', subtitleKey: 'topics.microservices.subtitle', hasSimulator: false },
    ],
  },
  {
    id: 'security',
    labelKey: 'categories.security',
    color: 'var(--clr-security)',
    topics: [
      { id: 'auth', titleKey: 'topics.auth.title', subtitleKey: 'topics.auth.subtitle', hasSimulator: true },
      { id: 'security-vulnerabilities', titleKey: 'topics.security-vulnerabilities.title', subtitleKey: 'topics.security-vulnerabilities.subtitle', hasSimulator: true },
      { id: 'rate-limiting', titleKey: 'topics.rate-limiting.title', subtitleKey: 'topics.rate-limiting.subtitle', hasSimulator: true },
    ],
  },
  {
    id: 'observability',
    labelKey: 'categories.observability',
    color: 'var(--clr-observability)',
    topics: [
      { id: 'observability', titleKey: 'topics.observability.title', subtitleKey: 'topics.observability.subtitle', hasSimulator: true },
      { id: 'capacity-planning', titleKey: 'topics.capacity-planning.title', subtitleKey: 'topics.capacity-planning.subtitle', hasSimulator: true },
      { id: 'devops', titleKey: 'topics.devops.title', subtitleKey: 'topics.devops.subtitle', hasSimulator: false },
    ],
  },
]

/**
 * 取得所有主題的扁平列表（用於路由和導航）
 */
export function getAllTopics() {
  const topics = []
  CATEGORIES.forEach(cat => {
    cat.topics.forEach(topic => {
      topics.push({
        ...topic,
        categoryId: cat.id,
        categoryLabel: cat.labelKey,
        color: cat.color,
      })
    })
  })
  return topics
}

/**
 * 根據 topicId 取得主題及其分類資訊
 * @param {string} topicId - 主題 ID
 * @returns {object|null} 主題資訊含分類
 */
export function getTopicById(topicId) {
  for (const cat of CATEGORIES) {
    const topic = cat.topics.find(t => t.id === topicId)
    if (topic) {
      return {
        ...topic,
        categoryId: cat.id,
        categoryLabel: cat.labelKey,
        color: cat.color,
      }
    }
  }
  return null
}

/**
 * 取得指定主題的前一個和下一個主題（用於主題頁導航）
 * @param {string} topicId - 當前主題 ID
 * @returns {{ prev: object|null, next: object|null }}
 */
export function getAdjacentTopics(topicId) {
  const all = getAllTopics()
  const idx = all.findIndex(t => t.id === topicId)
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}
