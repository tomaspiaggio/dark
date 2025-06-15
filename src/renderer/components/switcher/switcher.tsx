"use client"

import { cn } from "@/lib/utils"
import { Tab } from "@/types/tab"
import { useCallback, useEffect, useMemo, useState } from "react"
import { setupSwitcherListener, removeSwitcherListener, selectTab, closeSwitcher } from "@/controller/switcher"

type TabWithThumbnail = Tab & {
  thumbnail: string
}

interface SwitcherData {
  tabs: TabWithThumbnail[]
  selectedIndex: number
  isVisible: boolean
}

interface BrowserTabSwitcherProps {
  maxVisibleTabs?: number
}

export default function BrowserTabSwitcher({
  maxVisibleTabs = 5,
}: BrowserTabSwitcherProps) {
  const [switcherData, setSwitcherData] = useState<SwitcherData>({
    tabs: [],
    selectedIndex: 0,
    isVisible: false,
  })

  const displayedTabs = useMemo(() => 
    switcherData.tabs.slice(0, maxVisibleTabs), 
    [switcherData.tabs, maxVisibleTabs]
  )

  // Set up IPC listener for switcher updates
  useEffect(() => {
    const handleSwitcherUpdate = (data: SwitcherData) => {
      console.log("Received switcher update:", data)
      setSwitcherData(data)
    }

    setupSwitcherListener(handleSwitcherUpdate)

    return () => {
      removeSwitcherListener()
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!switcherData.isVisible || displayedTabs.length === 0) return

      switch (event.key) {
        case "ArrowRight":
        case "Tab":
          // Navigation is handled by main process
          event.preventDefault()
          break
        case "ArrowLeft":
          // Navigation is handled by main process  
          event.preventDefault()
          break
        case "Enter":
          event.preventDefault()
          if (displayedTabs[switcherData.selectedIndex]) {
            selectTab(displayedTabs[switcherData.selectedIndex].id)
          }
          break
        case "Escape":
          event.preventDefault()
          closeSwitcher()
          break
        default:
          break
      }
    },
    [switcherData.isVisible, displayedTabs, switcherData.selectedIndex],
  )

  useEffect(() => {
    if (switcherData.isVisible) {
      window.addEventListener("keydown", handleKeyDown)
    } else {
      window.removeEventListener("keydown", handleKeyDown)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [switcherData.isVisible, handleKeyDown])

  if (!switcherData.isVisible || displayedTabs.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-800/80 z-50 p-4" onClick={closeSwitcher}>
      <div
        className="rounded-xl p-4 flex items-end space-x-3"
        onClick={(e) => e.stopPropagation()}
      >
        {displayedTabs.map((tab, index) => (
          <div
            key={tab.id}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
              "w-40", // Each card container width
              index === switcherData.selectedIndex ? "bg-neutral-600/90 scale-105" : "hover:bg-neutral-700/50",
            )}
            onClick={() => {
              selectTab(tab.id)
            }}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                selectTab(tab.id)
              }
            }}
            aria-label={`Select tab: ${tab.title}`}
          >
            {/* Landscape Thumbnail Area */}
            <div className="relative w-32 h-18 mb-2">
              {" "}
              {/* w-32 (128px), h-18 (72px) -> 16:9 aspect ratio */}
              <img
                src={tab.thumbnail || "/placeholder.svg?width=128&height=72&query=Website+thumbnail"}
                alt={`Thumbnail for ${tab.title}`}
                width={128}
                height={72}
                className="object-cover rounded-md border border-neutral-700 shadow-md"
              />
              {/* Optional: Favicon overlay on thumbnail - kept as per previous design */}
              {tab.icon && (
                <img
                  src={tab.icon || "/placeholder.svg?width=16&height=16&query=Favicon+overlay"}
                  alt="" // Decorative
                  width={16}
                  height={16}
                  className="absolute bottom-1 right-1 rounded-sm bg-white/20 p-0.5"
                />
              )}
            </div>

            {/* Title Row: Favicon + Text */}
            <div className="flex items-center w-full px-1 space-x-1.5 mt-1">
              {tab.icon && (
                <img
                  src={tab.icon || "/placeholder.svg?width=16&height=16&query=Favicon"}
                  alt="" // Decorative, as title is present
                  width={16}
                  height={16}
                  className="rounded-sm flex-shrink-0" // Prevents favicon from shrinking
                />
              )}
              <p className="text-xs text-neutral-200 truncate flex-grow text-left">{tab.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
