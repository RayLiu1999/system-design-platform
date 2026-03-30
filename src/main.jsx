// React 應用入口
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 載入全域樣式（順序重要）
import './styles/reset.css'
import './styles/tokens.css'
import './styles/components.css'
import './styles/simulator.css'

// 載入 i18n
import './i18n/index.js'

import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
