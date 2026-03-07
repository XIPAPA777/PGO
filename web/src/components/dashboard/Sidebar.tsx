'use client'
import { useState } from 'react'
import { useTodoStore, Category, TodoItem } from '@/store/useTodoStore'
import { Plus, ChevronRight, Briefcase, BookOpen, Coffee, PanelLeftClose, X, Clock, Trash2, Edit2, Check, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ item, editingItemId, editTitle, setEditTitle, editTargetDate, setEditTargetDate, handleSaveEdit, setEditingItemId, handleStartEdit, updateItemStatus, setSelectedTask, deleteItem }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group flex items-start justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing relative touch-none">
            {editingItemId === item.id ? (
                <div className="flex-1 space-y-2 mr-2" onPointerDown={e => e.stopPropagation()}>
                    <input 
                        type="text" 
                        value={editTitle} 
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-sm border-b border-blue-500 focus:outline-none"
                        autoFocus
                    />
                    <input 
                        type="text" 
                        value={editTargetDate} 
                        onChange={e => setEditTargetDate(e.target.value)}
                        placeholder="目标日期"
                        className="w-full text-xs text-gray-500 border-b border-gray-200 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(item.id)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingItemId(null)} className="p-1 bg-gray-50 text-gray-500 rounded hover:bg-gray-100"><X className="w-3 h-3" /></button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 min-w-0 pr-2">
                    <span className="text-sm text-gray-700 break-words leading-snug block">{item.title}</span>
                    {item.targetDate && (
                        <span className="inline-block mt-1 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            🎯 {item.targetDate}
                        </span>
                    )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={e => e.stopPropagation()}>
                        <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="编辑"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => updateItemStatus(item.id, 'done')}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="完成归档"
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setSelectedTask(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors bg-blue-50/50"
                            title="添加到今日聚焦"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="删除"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export function Sidebar() {
  const getCurrentUserItems = useTodoStore(state => state.getCurrentUserItems)
  const allItems = getCurrentUserItems()
  const items = allItems.filter(i => i.status === 'backlog')
  const addItem = useTodoStore(state => state.addItem)
  const copyToToday = useTodoStore(state => state.copyToToday)
  const toggleBacklog = useTodoStore(state => state.toggleBacklog)
  const updateItem = useTodoStore(state => state.updateItem)
  const updateItemStatus = useTodoStore(state => state.updateItemStatus)
  const deleteItem = useTodoStore(state => state.deleteItem)
  const reorderItems = useTodoStore(state => state.reorderItems)
  
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemTargetDate, setNewItemTargetDate] = useState('') 
  const [activeTab, setActiveTab] = useState<Category>('growth')
  
  // Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')

  // Add to Today Modal
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null)
  const [plannedTime, setPlannedTime] = useState('')
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        reorderItems(newItems);
    }
  };

  const handleStartEdit = (item: TodoItem) => {
    setEditingItemId(item.id)
    setEditTitle(item.title)
    setEditTargetDate(item.targetDate || '')
  }

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return
    updateItem(id, { title: editTitle, targetDate: editTargetDate })
    setEditingItemId(null)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemTitle.trim()) return
    addItem(newItemTitle, activeTab, 'backlog', undefined, newItemTargetDate)
    setNewItemTitle('')
    setNewItemTargetDate('')
  }

  const handleConfirmAddToToday = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    copyToToday(selectedTask, plannedTime)
    setSelectedTask(null)
    setPlannedTime('')
  }

  const categories: { id: Category; label: string; icon: any; color: string }[] = [
    { id: 'growth', label: '成长', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'work', label: '工作', icon: Briefcase, color: 'text-rose-600 bg-rose-50' },
    { id: 'life', label: '生活', icon: Coffee, color: 'text-sky-600 bg-sky-50' },
  ]

  // Get counts per category
  const getCategoryCount = (cat: Category) => items.filter(i => i.category === cat).length

  const currentItems = items.filter(i => i.category === activeTab)

  return (
    <div className="w-80 border-r border-gray-100 h-screen bg-gray-50/50 flex flex-col relative group">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800">🌊 蓄水池</h2>
        </div>
        <button 
            onClick={toggleBacklog}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
            <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        {categories.map(cat => (
            <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                    activeTab === cat.id 
                        ? "bg-white shadow-sm text-gray-800 ring-1 ring-black/5" 
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
            >
                <cat.icon className={cn("w-3.5 h-3.5", activeTab === cat.id && cat.color.split(' ')[0])} />
                {cat.label}
                <span className={cn("ml-0.5 opacity-60 text-[10px]", activeTab === cat.id && "opacity-100 font-bold")}>
                    {getCategoryCount(cat.id)}
                </span>
            </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={currentItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {currentItems.map(item => (
                    <SortableItem 
                        key={item.id} 
                        item={item} 
                        editingItemId={editingItemId}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        editTargetDate={editTargetDate}
                        setEditTargetDate={setEditTargetDate}
                        handleSaveEdit={handleSaveEdit}
                        setEditingItemId={setEditingItemId}
                        handleStartEdit={handleStartEdit}
                        updateItemStatus={updateItemStatus}
                        setSelectedTask={setSelectedTask}
                        deleteItem={deleteItem}
                    />
                ))}
            </SortableContext>
        </DndContext>
        
        {currentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
               <Plus className="w-6 h-6" />
            </div>
            <p className="text-xs">暂无任务</p>
          </div>
        )}
      </div>

      {/* Add Input */}
      <div className="p-4 border-t bg-gray-50/30">
        <form onSubmit={handleAdd} className="relative space-y-2 mb-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder={`+ 添加到${categories.find(c => c.id === activeTab)?.label}`}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
          <input
            type="text"
            value={newItemTargetDate}
            onChange={(e) => setNewItemTargetDate(e.target.value)}
            placeholder="目标日期 (如 2026-04)"
            className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-500"
          />
          <button type="submit" className="hidden" />
        </form>

        <Link href="/settings" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors pt-2 border-t border-gray-100 mt-2 justify-center">
            <Settings className="w-3.5 h-3.5" />
            <span>设置 & 云同步</span>
        </Link>
      </div>

      {/* Plan Time Modal */}
      {selectedTask && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="w-full space-y-4">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-sm font-bold text-gray-900">添加到今日计划</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{selectedTask.title}</p>
                 </div>
                 <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                 </button>
              </div>
              
              <form onSubmit={handleConfirmAddToToday}>
                 <label className="block text-xs font-medium text-gray-500 mb-1">计划时间段 (可选)</label>
                 <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                       type="text" 
                       value={plannedTime}
                       onChange={(e) => setPlannedTime(e.target.value)}
                       placeholder="例如: 14:00-15:00"
                       className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                       autoFocus
                    />
                 </div>
                 <button type="submit" className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    确认添加
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}
