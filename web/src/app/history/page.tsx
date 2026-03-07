'use client'
import { useState } from 'react'
import { useTodoStore } from '@/store/useTodoStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function HistoryPage() {
  const { getCurrentUserItems, getCurrentUserLogs } = useTodoStore()
  const items = getCurrentUserItems()
  const timeLogs = getCurrentUserLogs()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Get all unique dates from timeLogs
  const availableDates = Array.from(new Set(timeLogs.map(log => 
    format(new Date(log.createdAt), 'yyyy-MM-dd')
  ))).sort((a, b) => b.localeCompare(a))

  // Filter logs for selected date
  const dayLogs = timeLogs.filter(log => 
    format(new Date(log.createdAt), 'yyyy-MM-dd') === selectedDate
  ).sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr))

  // Calculate stats
  const totalTime = dayLogs.reduce((acc, log) => acc + log.duration, 0)
  const statsByCategory = dayLogs.reduce((acc, log) => {
    const task = items.find(i => i.id === log.taskId)
    if (task) {
      const current = acc[task.category] || 0
      acc[task.category] = current + log.duration
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">历史回顾</h1>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar: Date List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-[calc(100vh-150px)] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> 日期
            </h2>
            <div className="space-y-1">
              {availableDates.length === 0 && (
                <p className="text-sm text-gray-400 p-2 text-center">暂无记录</p>
              )}
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex justify-between items-center group ${
                    selectedDate === date 
                      ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{format(new Date(date), 'MM-dd EEEE', { locale: zhCN })}</span>
                  <ChevronLeft className={`w-3 h-3 text-indigo-400 transition-transform ${selectedDate === date ? 'rotate-180' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Day Detail */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Calendar className="w-5 h-5"/></span>
                 {format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: zhCN })}
              </h2>

              {/* Stats Bar */}
              <div className="bg-gray-50/50 rounded-xl p-5 mb-8 border border-gray-100">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">总投入时间</span>
                    <span className="text-3xl font-mono font-light text-gray-900 tracking-tight">{formatDuration(totalTime)}</span>
                </div>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex shadow-inner mb-4">
                    <div style={{ width: `${totalTime ? ((statsByCategory['work'] || 0)/totalTime)*100 : 0}%` }} className="bg-rose-400" />
                    <div style={{ width: `${totalTime ? ((statsByCategory['growth'] || 0)/totalTime)*100 : 0}%` }} className="bg-emerald-400" />
                    <div style={{ width: `${totalTime ? ((statsByCategory['life'] || 0)/totalTime)*100 : 0}%` }} className="bg-sky-400" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs font-medium text-gray-600">
                    <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <span className="flex items-center gap-1.5 text-rose-500"><div className="w-2 h-2 rounded-full bg-rose-400"/> 工作</span>
                        <span className="text-lg font-mono text-gray-900">{formatDuration(statsByCategory['work'] || 0)}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-400"/> 成长</span>
                        <span className="text-lg font-mono text-gray-900">{formatDuration(statsByCategory['growth'] || 0)}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <span className="flex items-center gap-1.5 text-sky-500"><div className="w-2 h-2 rounded-full bg-sky-400"/> 生活</span>
                        <span className="text-lg font-mono text-gray-900">{formatDuration(statsByCategory['life'] || 0)}</span>
                    </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative border-l-2 border-dashed border-gray-200 ml-4 space-y-6 py-2">
                {dayLogs.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p>这一天没有记录</p>
                  </div>
                )}
                {dayLogs.map(log => {
                    const task = items.find(i => i.id === log.taskId)
                    if (!task) return null
                    return (
                        <div key={log.id} className="relative pl-8 group">
                            <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 bg-white z-10 ${
                                task.category === 'work' ? 'border-rose-400' :
                                task.category === 'growth' ? 'border-emerald-400' :
                                'border-sky-400'
                            }`} />
                            <div className="flex flex-col gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                        {log.startTimeStr} - {log.endTimeStr}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {log.duration}m
                                    </span>
                                </div>
                                
                                <div>
                                    <div className="font-medium text-gray-800 text-sm">{task.title}</div>
                                    {log.note && (
                                        <p className="text-xs text-gray-500 mt-1 bg-gray-50/50 p-1.5 rounded border border-gray-100 inline-block">{log.note}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
