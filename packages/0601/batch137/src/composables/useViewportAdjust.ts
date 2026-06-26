import { ref, onMounted, onUnmounted } from 'vue'

export function useViewportAdjust() {
  const keyboardVisible = ref(false)
  const viewportHeight = ref(window.innerHeight)

  function onResize() {
    if (window.visualViewport) {
      keyboardVisible.value = window.visualViewport.height < window.innerHeight * 0.8
      viewportHeight.value = window.visualViewport.height
    } else {
      keyboardVisible.value = window.innerHeight < viewportHeight.value * 0.8
    }
  }

  function onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement
    if (!target) return
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
    document.addEventListener('focusin', onFocusIn)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    document.removeEventListener('focusin', onFocusIn)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onResize)
    }
  })

  return { keyboardVisible, viewportHeight }
}
