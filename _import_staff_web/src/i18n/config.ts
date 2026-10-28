import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ml from './locales/ml.json'

const STORAGE_KEY = 'docmatrix-language'
const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ml: { translation: ml },
    },
    lng: savedLanguage || 'en',
    fallbackLng: 'en',
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  })

export const setLanguage = (lang: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang)
  }
  return i18n.changeLanguage(lang)
}

export default i18n
