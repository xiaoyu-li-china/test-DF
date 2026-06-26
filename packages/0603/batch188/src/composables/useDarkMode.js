import { ref, onMounted, onUnmounted, watch } from 'vue'

const THEME_KEY = 'dark-mode'
const FOLLOW_SYSTEM_KEY = 'follow-system'

export function useDarkMode() {
  const isDark = ref(false)
  const followSystem = ref(false)
  const systemIsDark = ref(false)

  let mediaQuery = null

  const updateHtmlClass = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleSystemChange = (e) => {
    systemIsDark.value = e.matches
    if (followSystem.value) {
      isDark.value = e.matches
    }
  }

  const initDarkMode = () => {
    const savedFollowSystem = localStorage.getItem(FOLLOW_SYSTEM_KEY)
    followSystem.value = savedFollowSystem === 'true'

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemIsDark.value = mediaQuery.matches

    if (followSystem.value) {
      isDark.value = systemIsDark.value
    } else {
      const savedTheme = localStorage.getItem(THEME_KEY)
      if (savedTheme !== null) {
        isDark.value = savedTheme === 'true'
      } else {
        isDark.value = systemIsDark.value
        followSystem.value = true
      }
    }

    updateHtmlClass()

    mediaQuery.addEventListener('change', handleSystemChange)
  }

  const toggleDarkMode = () => {
    followSystem.value = false
    localStorage.setItem(FOLLOW_SYSTEM_KEY, 'false')
    isDark.value = !isDark.value
  }

  const setFollowSystem = (value) => {
    followSystem.value = value
    localStorage.setItem(FOLLOW_SYSTEM_KEY, value.toString())
    if (value) {
      isDark.value = systemIsDark.value
    } else {
      localStorage.setItem(THEME_KEY, isDark.value.toString())
    }
  }

  watch(isDark, (newValue) => {
    if (!followSystem.value) {
      localStorage.setItem(THEME_KEY, newValue.toString())
    }
    updateHtmlClass()
  })

  onMounted(() => {
    initDarkMode()
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  })

  return {
    isDark,
    followSystem,
    systemIsDark,
    toggleDarkMode,
    setFollowSystem
  }
}
