// Tab 切換元件
import { useState } from 'react'

/**
 * Tab 群組 — 用於模擬器中切換不同模式/算法
 * @param {Array} tabs - [{ id, label }]
 * @param {string} defaultTab - 預設選中的 Tab ID
 * @param {Function} onChange - Tab 切換時的回呼
 */
export default function TabGroup({ tabs, defaultTab, onChange }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  const handleClick = (tabId) => {
    setActive(tabId)
    onChange?.(tabId)
  }

  return (
    <div className="tab-group">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${active === tab.id ? 'active' : ''}`}
          onClick={() => handleClick(tab.id)}
          id={`tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
