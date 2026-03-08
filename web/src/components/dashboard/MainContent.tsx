'use client'
import { useState } from 'react'
import { isSameDay } from 'date-fns'
import { useTodoStore, Category } from '@/store/useTodoStore'
import { CheckCircle, Circle, Trash2, Plus, Clock, Sun, X, Calendar, Edit2, Sparkles, Tag, Home, NotebookPen, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { DailyReviewModal } from './DailyReviewModal'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  
  if (h > 0 && m > 0) return `${h}小时${m}分钟`
  if (h > 0) return `${h}小时`
  return `${m}分钟`
}

export function MainContent() {
  const { getCurrentUserItems, getCurrentUserLogs, getTaskDuration, updateItemStatus, deleteItem, addItem, addTimeLog, updateTimeLog, deleteTimeLog, updateItem } = useTodoStore()
  
  const items = getCurrentUserItems();
  const timeLogs = getCurrentUserLogs();
  
  // Filter for today's items
  const today = new Date();
  const todayItems = items.filter(i => {
    if (i.status === 'backlog') return false;
    if (i.isUnplanned) return false;
    // For done items, only show if completed today
    if (i.status === 'done' && i.completedAt) {
      return isSameDay(i.completedAt, today);
    }
    return true;
  });
  const backlogItems = items.filter(i => i.status === 'backlog')

  const [newItemTitle, setNewItemTitle] = useState('')
  const [activeTab, setActiveTab] = useState<Category>('growth')
  const [newItemPlannedTime, setNewItemPlannedTime] = useState('')

  // Log Time Modal State
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null)
  const [logTimeRange, setLogTimeRange] = useState('')
  const [logNote, setLogNote] = useState('')

  // Quick Log State
  const [quickLogTitle, setQuickLogTitle] = useState('')
  const [quickLogTimeRange, setQuickLogTimeRange] = useState('')
  const [quickLogCategory, setQuickLogCategory] = useState<Category>('growth')

  // Edit Plan Item State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanTitle, setEditPlanTitle] = useState('')
  const [editPlanTime, setEditPlanTime] = useState('')
  const [editPlanParentId, setEditPlanParentId] = useState<string | null>(null)

  const handleStartEditPlan = (item: any) => {
    setEditingPlanId(item.id)
    setEditPlanTitle(item.title)
    setEditPlanTime(item.plannedTime || '')
    setEditPlanParentId(item.parentId || null)
  }

  const handleSaveEditPlan = (id: string) => {
    if (!editPlanTitle.trim()) return
    updateItem(id, { title: editPlanTitle, plannedTime: editPlanTime, parentId: editPlanParentId || undefined })
    setEditingPlanId(null)
  }

  // Edit Time Log State
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editLogStart, setEditLogStart] = useState('')
  const [editLogEnd, setEditLogEnd] = useState('')
  const [editLogNote, setEditLogNote] = useState('')
  const [editLogParentId, setEditLogParentId] = useState<string | null>(null) // To update task's parent
  const [editingLogTaskId, setEditingLogTaskId] = useState<string | null>(null) // To track which task is being edited via log

  const handleStartEditLog = (log: any, task: any) => {
    setEditingLogId(log.id)
    setEditLogStart(log.startTimeStr)
    setEditLogEnd(log.endTimeStr)
    setEditLogNote(log.note || '')
    setEditingLogTaskId(task.id)
    setEditLogParentId(task.parentId || null)
  }

  const handleSaveEditLog = (id: string) => {
    if (!editLogStart || !editLogEnd) return
    updateTimeLog(id, { 
        startTimeStr: editLogStart, 
        endTimeStr: editLogEnd,
        note: editLogNote 
    })

    // Also update task parent if changed
    if (editingLogTaskId && editLogParentId !== undefined) {
         updateItem(editingLogTaskId, { parentId: editLogParentId || undefined })
    }

    setEditingLogId(null)
    setEditingLogTaskId(null)
  }

  const parseTimeRange = (range: string): { start: string, end: string } | null => {
      // Clean up input: remove spaces, handle Chinese colon/dash
      const clean = range.replace(/：/g, ':').replace(/[~—]/g, '-').replace(/\s+/g, '')
      const parts = clean.split('-')
      if (parts.length !== 2) return null
      
      const start = parts[0]
      const end = parts[1]
      
      // Simple validation regex for H:mm or HH:mm
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(start) || !timeRegex.test(end)) return null
      
      return { start, end }
  }

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemTitle.trim()) return
    addItem(newItemTitle, activeTab, 'todo', newItemPlannedTime)
    setNewItemTitle('')
    setNewItemPlannedTime('')
  }

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loggingTaskId || !logTimeRange) return
    
    const parsed = parseTimeRange(logTimeRange)
    if (!parsed) {
        alert('请输入正确的时间格式，例如: 10:00-11:00')
        return
    }

    addTimeLog(loggingTaskId, parsed.start, parsed.end, logNote)
    setLoggingTaskId(null)
    setLogTimeRange('')
    setLogNote('')
  }

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickLogTitle.trim() || !quickLogTimeRange) return
    
    const parsed = parseTimeRange(quickLogTimeRange)
    if (!parsed) {
        alert('请输入正确的时间格式，例如: 10:00-11:00')
        return
    }

    // 1. Create done task
    const taskId = addItem(quickLogTitle, quickLogCategory, 'done', undefined, undefined, true)
    // 2. Add time log
    addTimeLog(taskId, parsed.start, parsed.end)
    
    // Reset
    setQuickLogTitle('')
    setQuickLogTimeRange('')
  }

  // Handle task completion with auto-log
  const handleToggleStatus = (item: any) => {
    const newStatus = item.status === 'done' ? 'todo' : 'done'
    updateItemStatus(item.id, newStatus)

    // Auto-log time when marking as done
    if (newStatus === 'done') {
        let start = ''
        let end = ''
        
        // 1. Try to use planned time
        if (item.plannedTime) {
            const range = parseTimeRange(item.plannedTime)
            if (range) {
                start = range.start
                end = range.end
            }
        }
        
        // 2. Fallback to Now-1h -> Now
        if (!start || !end) {
            const now = new Date()
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
            
            const formatTime = (d: Date) => {
                return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
            }
            
            start = formatTime(oneHourAgo)
            end = formatTime(now)
        }
        
        addTimeLog(item.id, start, end, '自动记录')
    }
  }

  // Balance Stats - based on TODAY's logs
  const todayLogs = timeLogs.filter(log => isSameDay(log.createdAt, today));
  
  const totalTime = todayLogs.reduce((acc, log) => acc + log.duration, 0);
  
  const itemCategoryMap = new Map(items.map(i => [i.id, i.category]));
  
  const workTime = todayLogs.filter(l => itemCategoryMap.get(l.taskId) === 'work').reduce((acc, l) => acc + l.duration, 0);
  const growthTime = todayLogs.filter(l => itemCategoryMap.get(l.taskId) === 'growth').reduce((acc, l) => acc + l.duration, 0);
  const lifeTime = todayLogs.filter(l => itemCategoryMap.get(l.taskId) === 'life').reduce((acc, l) => acc + l.duration, 0);

  const [isReviewOpen, setIsReviewOpen] = useState(false)

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 relative">
      <DailyReviewModal 
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        stats={{ totalTime, workTime, growthTime, lifeTime }}
        completedTasks={todayItems.filter(i => i.status === 'done')}
      />

      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-4">
           {/* Menu button handled in DashboardPage now */}
           <div>
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               今日聚焦 <Sun className="w-5 h-5 text-amber-500" />
             </h1>
             <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}&nbsp;&nbsp;{new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
             </p>
           </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsReviewOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
            >
                <Sparkles className="w-4 h-4" />
                今日洞察
            </button>
            <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="回到主页">
                <Home className="w-5 h-5" />
            </Link>
        </div>
      </div>

      {/* Balance Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
         <div className="flex justify-between items-end">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">时间平衡</span>
            <span className="text-2xl font-mono font-light text-gray-900">{formatDuration(totalTime)}</span>
         </div>
         <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: `${totalTime ? (workTime/totalTime)*100 : 0}%` }} className="bg-rose-400 transition-all duration-500" />
            <div style={{ width: `${totalTime ? (growthTime/totalTime)*100 : 0}%` }} className="bg-emerald-400 transition-all duration-500" />
            <div style={{ width: `${totalTime ? (lifeTime/totalTime)*100 : 0}%` }} className="bg-sky-400 transition-all duration-500" />
         </div>
         <div className="flex gap-4 text-xs font-medium text-gray-500 pt-1">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"/> 工作 {formatDuration(workTime)}</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"/> 成长 {formatDuration(growthTime)}</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400"/> 生活 {formatDuration(lifeTime)}</span>
         </div>
      </div>

      {/* SECTION 1: 今日计划 (Plan) */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">📋 今日计划</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{todayItems.length}</span>
         </div>

         {/* Quick Add Form */}
         <form onSubmit={handleQuickAdd} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 flex flex-col md:flex-row gap-2">
                <input 
                    type="text" 
                    placeholder="添加一个任务..." 
                    className="flex-1 bg-transparent border-none focus:outline-none placeholder:text-gray-400 text-gray-700 text-sm"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="计划时间 (选填, 如 14:00-15:00)" 
                    className="w-full md:w-48 bg-gray-50 rounded-md px-2 py-1 text-xs border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-gray-600"
                    value={newItemPlannedTime}
                    onChange={(e) => setNewItemPlannedTime(e.target.value)}
                />
            </div>
            <select 
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as Category)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none text-gray-600 font-medium cursor-pointer hover:bg-gray-100"
            >
                <option value="growth">成长</option>
                <option value="work">工作</option>
                <option value="life">生活</option>
            </select>
            <button 
                type="submit" 
                className="bg-gray-900 text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="添加"
            >
                <Plus className="w-4 h-4" />
            </button>
         </form>

         {todayItems.length === 0 && (
             <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/30">
                 <p className="text-sm text-gray-400">还没有计划</p>
                 <p className="text-xs text-gray-300 mt-1">从左侧拖入或上方添加</p>
             </div>
         )}
      
         <div className="grid gap-3">
            {todayItems.map(item => (
                <div key={item.id} className={cn(
                    "flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm group hover:border-gray-300 transition-all",
                    item.status === 'done' ? "bg-gray-50/80 border-transparent opacity-75" : "hover:shadow-md"
                )}>
                    <button 
                        onClick={() => handleToggleStatus(item)}
                        className={cn("mt-1 text-gray-300 hover:text-emerald-500 transition-colors", item.status === 'done' && "text-emerald-500")}
                    >
                        {item.status === 'done' ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        {editingPlanId === item.id ? (
                            <div className="space-y-2">
                                <input 
                                    type="text" 
                                    value={editPlanTitle} 
                                    onChange={e => setEditPlanTitle(e.target.value)}
                                    className="w-full text-sm border-b border-indigo-500 focus:outline-none bg-transparent"
                                    autoFocus
                                />
                                <div className="flex gap-2 items-center">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={editPlanTime} 
                                        onChange={e => setEditPlanTime(e.target.value)}
                                        placeholder="计划时间 (如 14:00-15:00)"
                                        className="text-xs bg-gray-50 rounded px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                                    />
                                </div>
                                {/* Parent Task Selection */}
                                <div className="flex gap-2 items-center">
                                    <LinkIcon className="w-3 h-3 text-gray-400" />
                                    <select
                                        value={editPlanParentId || ''}
                                        onChange={e => setEditPlanParentId(e.target.value || null)}
                                        className="text-xs bg-gray-50 rounded px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-gray-600 max-w-[200px]"
                                    >
                                        <option value="">关联蓄水池目标...</option>
                                        {backlogItems.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.category === 'work' ? '💼' : b.category === 'growth' ? '🌱' : '生活'} {b.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => handleSaveEditPlan(item.id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><CheckCircle className="w-4 h-4"/></button>
                                    <button onClick={() => setEditingPlanId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={cn("font-medium text-gray-800 transition-all leading-snug", item.status === 'done' && "line-through text-gray-400")}>
                                    {item.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1.5">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                                        item.category === 'work' ? "bg-rose-50 text-rose-600" :
                                        item.category === 'growth' ? "bg-emerald-50 text-emerald-600" :
                                        "bg-sky-50 text-sky-600"
                                    )}>
                                        {item.category === 'work' ? '工作' : item.category === 'growth' ? '成长' : '生活'}
                                    </span>
                                    
                                    {item.plannedTime && (
                                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                            <Clock className="w-3 h-3" />
                                            计划: {item.plannedTime}
                                        </span>
                                    )}

                                    {item.parentId && (
                                        <span className="flex items-center gap-1 text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100" title="关联的蓄水池目标">
                                            <LinkIcon className="w-3 h-3" /> 
                                            {items.find(i => i.id === item.parentId)?.title || '蓄水池'}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {item.status !== 'done' && !editingPlanId && (
                        <button 
                            onClick={() => setLoggingTaskId(item.id)}
                            className="self-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all text-xs font-medium whitespace-nowrap"
                        >
                            记录时间
                        </button>
                    )}
                    
                    {!editingPlanId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                            <button 
                                onClick={() => handleStartEditPlan(item)}
                                className="p-2 text-gray-300 hover:text-indigo-500 transition-all"
                                title="编辑"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => deleteItem(item.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-all"
                                title="删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            ))}
         </div>
      </div>

      {/* SECTION 2: 实际记录 (Actual) */}
      <div className="space-y-4 pt-8 border-t border-dashed border-gray-200">
         <div className="flex items-center gap-2 pb-2">
            <h2 className="text-lg font-bold text-gray-800">✅ 实际时间记录</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {todayLogs.length}
            </span>
         </div>

         {/* Quick Log Form */}
         <form onSubmit={handleQuickLog} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all mb-4">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 flex flex-col md:flex-row gap-2">
                <input 
                    type="text" 
                    placeholder="刚刚做了什么..." 
                    className="flex-1 bg-transparent border-none focus:outline-none placeholder:text-gray-400 text-gray-700 text-sm"
                    value={quickLogTitle}
                    onChange={(e) => setQuickLogTitle(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="时间段 (如 10:00-11:00)"
                    className="w-full md:w-48 bg-gray-50 rounded-md px-2 py-1 text-xs border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-gray-600"
                    value={quickLogTimeRange}
                    onChange={(e) => setQuickLogTimeRange(e.target.value)}
                />
            </div>
            <select 
                value={quickLogCategory}
                onChange={(e) => setQuickLogCategory(e.target.value as Category)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none text-gray-600 font-medium cursor-pointer hover:bg-gray-100"
            >
                <option value="growth">成长</option>
                <option value="work">工作</option>
                <option value="life">生活</option>
            </select>
            <button 
                type="submit" 
                className="bg-gray-900 text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="快速记录"
            >
                <Plus className="w-4 h-4" />
            </button>
         </form>

         {todayLogs.length === 0 ? (
             <div className="text-center py-8 text-sm text-gray-400 bg-gray-50/30 rounded-xl">
                 还没有时间记录，点击上方任务的“记录时间”按钮开始。
             </div>
         ) : (
             <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 py-2">
                 {todayLogs
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map(log => {
                        const task = items.find(i => i.id === log.taskId) // Look in all items to include unplanned
                        if (!task) return null
                        return (
                            <div key={log.id} className="relative pl-6 group">
                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-100 group-hover:border-indigo-400 transition-colors" />
                                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                                    {editingLogId === log.id ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="time" 
                                                    value={editLogStart} 
                                                    onChange={e => setEditLogStart(e.target.value)}
                                                    className="bg-gray-50 rounded px-2 py-1 text-xs"
                                                />
                                                <span className="text-gray-300">-</span>
                                                <input 
                                                    type="time" 
                                                    value={editLogEnd} 
                                                    onChange={e => setEditLogEnd(e.target.value)}
                                                    className="bg-gray-50 rounded px-2 py-1 text-xs"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={editLogNote} 
                                                onChange={e => setEditLogNote(e.target.value)}
                                                className="w-full text-xs border-b border-gray-200 focus:outline-none"
                                                placeholder="备注"
                                            />
                                            {/* Parent Task Selection for Log */}
                                            <div className="flex gap-2 items-center">
                                                <LinkIcon className="w-3 h-3 text-gray-400" />
                                                <select
                                                    value={editLogParentId || ''}
                                                    onChange={e => setEditLogParentId(e.target.value || null)}
                                                    className="text-xs bg-gray-50 rounded px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-gray-600 max-w-[150px]"
                                                >
                                                    <option value="">关联蓄水池目标...</option>
                                                    {backlogItems.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.category === 'work' ? '💼' : b.category === 'growth' ? '🌱' : '生活'} {b.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleSaveEditLog(log.id)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><CheckCircle className="w-4 h-4"/></button>
                                                <button onClick={() => setEditingLogId(null)} className="text-gray-400 hover:bg-gray-50 p-1 rounded"><X className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {log.startTimeStr} - {log.endTimeStr}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {log.duration}m
                                                    </span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <button onClick={() => handleStartEditLog(log, task)} className="text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => deleteTimeLog(log.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-1 font-medium text-gray-800 text-sm flex flex-wrap items-center gap-2">
                                                <span>{task.title}</span>
                                                {task.isUnplanned && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                                                        <Tag className="w-3 h-3" /> 非计划
                                                    </span>
                                                )}
                                                {task.parentId && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100" title="关联的蓄水池目标">
                                                        <LinkIcon className="w-3 h-3" /> 
                                                        {items.find(i => i.id === task.parentId)?.title || '蓄水池'}
                                                    </span>
                                                )}
                                            </div>
                                            {log.note && (
                                                <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                    {log.note}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
             </div>
         )}
      </div>

      {/* Log Time Modal */}
      {loggingTaskId && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-gray-800 mb-4">记录时间</h3>
                <form onSubmit={handleLogTime} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">时间段</label>
                        <input 
                            type="text" 
                            placeholder="例如: 10:00-11:00" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={logTimeRange}
                            onChange={e => setLogTimeRange(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">备注 (可选)</label>
                        <input 
                            type="text" 
                            placeholder="完成了什么..." 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={logNote}
                            onChange={e => setLogNote(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setLoggingTaskId(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium">取消</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">确认记录</button>
                    </div>
                 </form>
             </div>
         </div>
       )}
     </div>
   )
}
