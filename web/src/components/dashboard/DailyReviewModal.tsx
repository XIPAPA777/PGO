
import { useState } from 'react'
import { X, Check, Loader2, Award, Calendar, Sparkles, Info } from 'lucide-react'
import { useTodoStore, TodoItem } from '@/store/useTodoStore'

interface DailyStats {
    totalTime: number;
    workTime: number;
    growthTime: number;
    lifeTime: number;
}

interface DailyReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: DailyStats;
    completedTasks: TodoItem[];
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    if (h > 0 && m > 0) return `${h}h${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

export function DailyReviewModal({ isOpen, onClose, stats, completedTasks }: DailyReviewModalProps) {
    const { syncConfig, getCurrentUserItems, getCurrentUserLogs, getTaskDuration } = useTodoStore()
    const [reflection, setReflection] = useState('')
    const [score, setScore] = useState(5)
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    
    // Get current user data
    const items = getCurrentUserItems()
    const timeLogs = getCurrentUserLogs()
    
    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Reset status when modal opens
    if (!isOpen) {
        if (status !== 'idle' && status !== 'success') {
             // Reset only if not success (to keep success message briefly visible if closed rapidly)
        }
        return null
    }

    const handleAIAnalysis = async () => {
        setIsAnalyzing(true)
        setReflection('正在分析今日数据，生成洞察中...')
        
        try {
            // Prepare context for AI
            const todayList = items.filter(i => i.status !== 'backlog');
            const backlogItems = items.filter(i => i.status === 'backlog');
            
            const context = {
                stats,
                tasks: todayList.map(t => ({
                    title: t.title,
                    status: t.status,
                    category: t.category,
                    plannedTime: t.plannedTime,
                    actualDuration: getTaskDuration(t.id)
                })),
                backlogItems: backlogItems.map(b => ({
                    title: b.title,
                    category: b.category,
                    targetDate: b.targetDate
                }))
            };

            // Call AI API
            if (!syncConfig.kimiApiKey) {
                // Fallback to mock if no API key
                await new Promise(resolve => setTimeout(resolve, 1500));
                const aiResponse = `【提示】您尚未配置 Kimi API Key，以下为演示内容：
                
【今日分析】
- 工作效率：今日完成了 ${context.tasks.filter(t=>t.status==='done').length} 个任务，总投入 ${formatDuration(stats.totalTime)}。
- 时间分布：${stats.workTime > stats.lifeTime ? '重心主要在工作上，注意劳逸结合。' : '生活与工作平衡得不错。'}

【改进建议】
1. 建议在设置页配置 API Key 以获取真实分析。
2. ${stats.growthTime === 0 ? '今天似乎没有安排成长类任务，建议每天预留 30 分钟阅读或学习。' : '保持每日学习的好习惯！'}

【总结】
今天过得很充实，继续保持！`;
                setReflection(aiResponse);
            } else {
                // Real API Call
                const res = await fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey: syncConfig.kimiApiKey,
                        context
                    })
                });
                
                const data = await res.json();
                if (data.success) {
                    setReflection(data.insight);
                } else {
                    setReflection(`AI 分析失败: ${data.message}`);
                }
            }
        } catch (e: any) {
            setReflection(`AI 分析请求出错: ${e.message}`);
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleSync = async () => {
        if (!syncConfig.larkAppId) {
            setErrorMsg('请先在设置页配置飞书信息')
            setStatus('error')
            return
        }
        
        setStatus('syncing')
        setErrorMsg('')

        try {
            // Lark requires timestamp in milliseconds for Date fields
            // Use Midnight Timestamp for consistency across the day (easier to delete/dedupe in backend)
            const todayTimestamp = new Date().setHours(0, 0, 0, 0); 
            const todayTs = todayTimestamp;

            // 1. Prepare Backlog Items (All backlog status items)
            // Filter only backlog items
            const backlogItems = items.filter(i => i.status === 'backlog');

            // 2. Prepare Daily Tasks (Today's Plan + Unplanned)
            // Filter Logic V3 (Strict):
            // We want to match EXACTLY what is visible in "Today Plan" + "Actual Records".
            // 1. "Today Plan" = items.filter(i => i.status !== 'backlog' && !i.isUnplanned)
            // 2. "Actual Records" = Tasks that have TimeLogs TODAY.
            
            // So we need to find tasks that are:
            // (A) In Today's Plan (status != backlog AND !isUnplanned)
            // OR
            // (B) Have time logs today (even if unplanned or backlog? backlog shouldn't have logs theoretically but if it does, it's actual work)
            
            const todayDateString = new Date().toISOString().split('T')[0];
            
            // Find IDs of tasks that have logs today
            const activeTaskIds = new Set(timeLogs
                .filter(log => new Date(log.createdAt).toISOString().split('T')[0] === todayDateString)
                .map(log => log.taskId)
            );

            // Filter items: 
            // - Exclude backlog (unless it has logs? but let's assume backlog items are moved to todo first. If not, they are still 'backlog'. 
            //   If I worked on a backlog item without moving it, should it show? Yes, as "Unplanned Work".
            //   But our current UI only shows logs for items in `items` list.
            //   Let's stick to `items` list filtering.)
            
            // Filter:
            // 1. Must not be 'backlog' status (unless we want to support working on backlog items directly? UI doesn't support it well yet)
            //    Actually, user said "extra line". That extra line was "Unplanned" and "No logs".
            //    So we must exclude: isUnplanned=true AND hasLogs=false.
            
            const todayList = items.filter(i => {
                if (i.status === 'backlog') return false; // Never sync backlog items to DailyTasks sheet
                
                // If it's planned (isUnplanned=false), we include it (even if no logs, it's a plan).
                if (!i.isUnplanned) return true;
                
                // If it's Unplanned (isUnplanned=true), we ONLY include it if it has logs today.
                // The "Ghost Task" was Unplanned + No Logs.
                if (activeTaskIds.has(i.id)) return true;
                
                return false; // Exclude Unplanned & No Logs
            });
            
            const dailyTaskRecords = todayList.map(task => {
                // Get logs for this task TODAY
                const taskLogs = timeLogs.filter(log => 
                    log.taskId === task.id && 
                    new Date(log.createdAt).toISOString().split('T')[0] === todayDateString
                );
                
                // Calculate actual duration today
                const actualDuration = taskLogs.reduce((acc, log) => acc + log.duration, 0);
                
                // Construct time range string (e.g. "10:00-11:00, 14:00-15:00")
                const timeRanges = taskLogs.map(l => `${l.startTimeStr}-${l.endTimeStr}`).join(', ');

                return {
                    userId: syncConfig.userId,
                    date: todayTs, // Send timestamp
                    content: task.title,
                    category: task.category,
                    plannedTime: task.plannedTime,
                    isCompleted: task.status === 'done',
                    actualTimeRange: timeRanges,
                    actualDuration: actualDuration,
                    isUnplanned: !!task.isUnplanned
                };
            });

            // 3. Daily Insight Record
            const dailyInsightRecord = {
                userId: syncConfig.userId,
                date: todayTs, // Send timestamp
                insight: reflection,
                score: score
            };

            // Call Batch Sync API
            const res = await fetch('/api/lark/batch-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: syncConfig,
                    backlogItems: backlogItems,
                    dailyTasks: dailyTaskRecords,
                    dailyInsight: dailyInsightRecord // New Field
                })
            });

            const json = await res.json();
            
            if (json.success) {
                setStatus('success')
                setTimeout(() => {
                    onClose()
                    setStatus('idle')
                    setReflection('')
                }, 1500)
            } else {
                setStatus('error')
                setErrorMsg(json.message || 'Sync failed')
            }

        } catch (e: any) {
            setStatus('error')
            setErrorMsg(e.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Award className="w-5 h-5" /> 每日洞察
                            </h2>
                            <p className="text-indigo-100 text-sm mt-1 opacity-90">
                                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-2 mt-6">
                        <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm">
                            <div className="text-xs text-indigo-100 mb-0.5">总投入</div>
                            <div className="font-mono font-bold text-lg">{formatDuration(stats.totalTime)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-rose-200 mb-0.5">工作</div>
                            <div className="font-mono font-bold">{formatDuration(stats.workTime)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-emerald-200 mb-0.5">成长</div>
                            <div className="font-mono font-bold">{formatDuration(stats.growthTime)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-sky-200 mb-0.5">生活</div>
                            <div className="font-mono font-bold">{formatDuration(stats.lifeTime)}</div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Completed Tasks Summary */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" /> 今日完成
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm text-gray-600 space-y-1">
                            {completedTasks.length === 0 && <p className="text-gray-400 italic">今天还没有完成任务哦</p>}
                            {completedTasks.map(t => (
                                <div key={t.id} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="truncate">{t.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reflection Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                💭 洞察与反思
                            </h3>
                            <button 
                                onClick={handleAIAnalysis}
                                disabled={isAnalyzing}
                                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isAnalyzing ? '分析中...' : '一键 AI 分析'}
                            </button>
                        </div>
                        <textarea
                            value={reflection}
                            onChange={e => setReflection(e.target.value)}
                            placeholder="今天感觉怎么样？有什么值得记录的想法？"
                            className="w-full h-32 p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
                        />
                    </div>

                    {/* Sync Info */}
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 px-1 mb-4">
                        <Info className="w-3.5 h-3.5" />
                        <p>点击同步后，系统将自动同步数据至飞书多维表格，实现长期数据沉淀。</p>
                    </div>

                    {/* Action */}
                    <div className="pt-2">
                        {status === 'error' && (
                            <p className="text-xs text-rose-500 mb-2 text-center">{errorMsg}</p>
                        )}
                        <button
                            onClick={handleSync}
                            disabled={status === 'syncing' || status === 'success'}
                            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                                status === 'success' ? 'bg-emerald-500' : 'bg-gray-900 hover:bg-gray-800'
                            }`}
                        >
                            {status === 'syncing' && <Loader2 className="w-5 h-5 animate-spin" />}
                            {status === 'success' && <Check className="w-5 h-5" />}
                            {status === 'idle' && '✨ 同步到飞书表格'}
                            {status === 'success' && '同步成功'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
