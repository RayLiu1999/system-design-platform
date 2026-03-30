// 面試問答摺疊區元件
import { useState } from 'react'

/**
 * 面試問答摺疊區 — 點擊展開/收合答案
 * @param {Array} items - 問答列表 [{ question, answer, keywords }]
 */
export default function InterviewQA({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (index) => {
    setOpenIndex(prev => prev === index ? null : index)
  }

  if (!items.length) return null

  return (
    <div className="qa-list">
      {items.map((item, index) => (
        <div
          key={index}
          className={`qa-item ${openIndex === index ? 'open' : ''}`}
        >
          <button
            className="qa-question"
            onClick={() => toggle(index)}
            id={`qa-${index}`}
          >
            <svg
              className="qa-chevron"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            <span>Q{index + 1}: {item.question}</span>
          </button>
          <div className="qa-answer">
            <p>{item.answer}</p>
            {item.keywords && item.keywords.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {item.keywords.map((kw, ki) => (
                  <span key={ki} className="keyword">{kw}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
