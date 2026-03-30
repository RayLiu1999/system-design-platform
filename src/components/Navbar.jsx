// 頂部導覽列元件
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import './Navbar.css'

/**
 * 導覽列 — 包含 Logo、搜尋（預留）、學習進度、暗色模式切換
 */
export default function Navbar({ theme, onToggleTheme, totalProgress, onToggleSidebar }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-left">
        {/* 手機版漢堡選單按鈕 */}
        <button
          className="navbar-hamburger show-mobile-only"
          onClick={onToggleSidebar}
          aria-label="切換側邊欄"
          id="sidebar-toggle"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Logo / 標題 */}
        <button className="navbar-brand" onClick={() => navigate('/')} id="nav-home">
          <span className="navbar-logo">⚙</span>
          <span className="navbar-title hide-mobile">{t('app.title')}</span>
        </button>
      </div>

      <div className="navbar-right">
        {/* 學習進度 */}
        <div className="navbar-progress" id="nav-progress">
          <div className="progress-ring">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke="var(--clr-border)"
                strokeWidth="2.5"
              />
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke="var(--clr-info)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - totalProgress.percentage / 100)}`}
                transform="rotate(-90 14 14)"
                className="progress-ring-fill"
              />
            </svg>
          </div>
          <span className="progress-text">{totalProgress.percentage}%</span>
        </div>

        {/* 暗色/亮色模式切換 */}
        <button
          className="navbar-theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('app.lightMode') : t('app.darkMode')}
          id="theme-toggle"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </nav>
  )
}
