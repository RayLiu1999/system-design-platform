// 學習進度管理 Hook — 使用 localStorage 持久化
import { useState, useCallback, useMemo, useRef } from 'react'

const STORAGE_KEY = 'sd-platform-progress'
const PROGRESS_VERSION = 1

/**
 * 從 localStorage 讀取進度資料
 * @returns {object} 進度資料物件
 */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: PROGRESS_VERSION, topics: {} }
    const data = JSON.parse(raw)
    if (data.version !== PROGRESS_VERSION) {
      return { version: PROGRESS_VERSION, topics: {} }
    }
    return data
  } catch {
    return { version: PROGRESS_VERSION, topics: {} }
  }
}

/**
 * 將進度資料寫入 localStorage
 * @param {object} data - 進度資料物件
 */
function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage 已滿或不可用，靜默失敗
  }
}

/**
 * 學習進度管理 Hook
 * 每個主題有三個檢查點：conceptRead / simulatorUsed / qaReviewed
 */
export function useProgress() {
  const [data, setData] = useState(loadProgress)

  // 標記某個主題的某個檢查點為完成
  // 若該檢查點已完成，則跳過更新以避免不必要的重渲染
  const markComplete = useCallback((topicId, checkpoint) => {
    setData(prev => {
      // 若已完成，直接回傳原狀態不觸發重渲染
      if (prev.topics[topicId]?.[checkpoint]) {
        return prev
      }
      const next = {
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...prev.topics[topicId],
            [checkpoint]: true,
            lastVisited: new Date().toISOString(),
          },
        },
      }
      saveProgress(next)
      return next
    })
  }, [])

  // 使用 ref 追蹤最新的 data，以穩定 getTopicProgress 的參考
  const dataRef = useRef(data)
  dataRef.current = data

  // 取得單一主題的進度
  // 使用 dataRef 而非直接依賴 data，避免函式參考頻繁變化
  const getTopicProgress = useCallback((topicId) => {
    const topic = dataRef.current.topics[topicId] || {}
    const checks = [topic.conceptRead, topic.simulatorUsed, topic.qaReviewed]
    const done = checks.filter(Boolean).length
    return {
      conceptRead: !!topic.conceptRead,
      simulatorUsed: !!topic.simulatorUsed,
      qaReviewed: !!topic.qaReviewed,
      done,
      total: 3,
      percentage: Math.round((done / 3) * 100),
      status: done === 0 ? 'not-started' : done === 3 ? 'completed' : 'in-progress',
    }
  }, [])

  // 計算總進度（24 個主題 × 3 個檢查點 = 72）
  const totalProgress = useMemo(() => {
    const allTopics = Object.values(data.topics)
    let totalDone = 0
    allTopics.forEach(t => {
      if (t.conceptRead) totalDone++
      if (t.simulatorUsed) totalDone++
      if (t.qaReviewed) totalDone++
    })
    const totalChecks = 72 // 24 主題 × 3 檢查點
    return {
      done: totalDone,
      total: totalChecks,
      percentage: Math.round((totalDone / totalChecks) * 100),
      completedTopics: allTopics.filter(t => t.conceptRead && t.simulatorUsed && t.qaReviewed).length,
    }
  }, [data])

  // 重置所有進度
  const resetProgress = useCallback(() => {
    const fresh = { version: PROGRESS_VERSION, topics: {} }
    saveProgress(fresh)
    setData(fresh)
  }, [])

  return {
    markComplete,
    getTopicProgress,
    totalProgress,
    resetProgress,
  }
}
