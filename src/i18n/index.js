// i18next 國際化初始化設定
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
    },
    lng: 'zh-TW', // 預設語系
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false, // React 已自動處理 XSS
    },
  })

export default i18n
