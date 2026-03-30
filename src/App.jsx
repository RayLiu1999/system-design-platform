// App 根元件 — Router 設定
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'

/**
 * App 根元件
 * 使用 HashRouter 以便於靜態部署（Nginx / Docker）
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
