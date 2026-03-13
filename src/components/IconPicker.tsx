"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface IconPickerProps {
  icons: Record<string, string>
  selectedIcon: string
  onSelect: (icon: string) => void
  className?: string
}

export function IconPicker({ icons, selectedIcon, onSelect, className }: IconPickerProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const iconValues = Object.values(icons)

  if (!mounted) {
    return (
      <div className={cn("relative", className)}>
        <div className="grid grid-cols-8 gap-2 p-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
          {iconValues.map((icon, index) => (
            <button
              key={`icon-${index}`}
              className="text-xl p-2.5 rounded-lg flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div className="grid grid-cols-8 gap-2 p-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
        {iconValues.map((icon, index) => (
          <button
            key={`icon-${index}`}
            onClick={() => onSelect(icon)}
            className={cn(
              "text-xl p-2.5 rounded-lg transition-all flex items-center justify-center",
              "min-w-[44px] min-h-[44px] touch-manipulation",
              selectedIcon === icon
                ? "bg-blue-100 ring-2 ring-blue-500"
                : "hover:bg-gray-100 active:bg-gray-200"
            )}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}
