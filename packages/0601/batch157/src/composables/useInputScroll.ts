export function useInputScroll() {
  const scrollIntoView = (el: HTMLElement | null, delay = 300) => {
    if (!el) return
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, delay)
  }
  return { scrollIntoView }
}
