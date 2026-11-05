import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    // 初始值与变更走同一回调：mql 立即派发一次判定（订阅回调路径，非 effect 体内直呼 setState）
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    mql.dispatchEvent(new Event('change'))
    return () => { mql.removeEventListener('change', onChange); }
  }, [])

  return !!isMobile
}
