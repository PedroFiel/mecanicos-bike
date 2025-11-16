import { useEffect, useState } from "react"
import { useNavigation } from "react-router"

export function NavigationProgress() {
  const navigation = useNavigation()
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (navigation.state === "loading") {
      setIsVisible(true)
      setProgress(20)
      
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer)
            return 90
          }
          return prev + 10
        })
      }, 200)

      return () => clearInterval(timer)
    } else {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [navigation.state])

  if (!isVisible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  )
}

