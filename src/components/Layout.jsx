// 佈局元件 — 整合 Navbar + Sidebar + 主內容區
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useTheme } from '../hooks/useTheme'
import './Layout.css'

/**
 * 整體佈局框架
 * 提供 Navbar（固定頂部）+ Sidebar（固定左側）+ 主內容區（可捲動）
 */
export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content" id="main-content">
        <Outlet />
      </main>
    </div>
  )
}
