"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { IconMoon, IconSun, IconDeviceDesktop } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { cn } from "~/lib/utils"

const themes = [
  {
    value: "light",
    label: "Claro",
    icon: IconSun,
    description: "Tema claro para melhor visibilidade durante o dia",
  },
  {
    value: "dark",
    label: "Escuro",
    icon: IconMoon,
    description: "Tema escuro para reduzir o cansaço visual",
  },
  {
    value: "system",
    label: "Sistema",
    icon: IconDeviceDesktop,
    description: "Usa a preferência do seu sistema operacional",
  },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>
          Escolha como o sistema deve aparecer para você
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon
            const isSelected = theme === themeOption.value

            return (
              <button
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className={cn(
                  "group relative flex flex-col items-start gap-3 rounded-lg border-2 p-4 transition-all hover:border-primary",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-transparent"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start gap-1 text-left">
                  <div
                    className={cn(
                      "font-semibold",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {themeOption.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {themeOption.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute right-3 top-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

