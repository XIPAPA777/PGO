'use client'
import { useState, useEffect } from 'react'
import { useTodoStore } from '@/store/useTodoStore'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MainContent } from '@/components/dashboard/MainContent'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'

export default function DashboardPage() {
  const { isBacklogOpen, toggleBacklog } = useTodoStore()
  
  // Hydration fix for persist
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar (Backlog) */}
      <div className={cn(
        "relative transition-all duration-300 ease-in-out border-r bg-white h-full shadow-xl z-20 flex-shrink-0",
        isBacklogOpen ? "w-80 translate-x-0 opacity-100" : "w-0 -translate-x-full opacity-0 overflow-hidden"
      )}>
        <div className="h-full w-80">
            <Sidebar />
        </div>
      </div>

      {/* Toggle Button - Floating/Fixed when closed */}
      {!isBacklogOpen && (
        <div className="absolute top-4 left-4 z-30">
             <button 
                onClick={toggleBacklog} 
                className="p-2 bg-white hover:bg-gray-100 rounded-lg text-gray-500 shadow-md border border-gray-200 transition-all active:scale-95"
                title="打开蓄水池"
             >
                <Menu className="w-5 h-5" />
             </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            <MainContent />
        </div>
      </div>
    </div>
  )
}
