
'use client'
import { useState, useEffect } from 'react'
import { useTodoStore } from '@/store/useTodoStore'
import { ArrowLeft, Check, AlertCircle, Save, Loader2, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { syncConfig, setSyncConfig } = useTodoStore()
  
  const [formData, setFormData] = useState({
    userId: 'default_user',
    larkAppId: '',
    larkAppSecret: '',
    larkBaseToken: '',
    kimiApiKey: '',
  })
  
  // Hydrate form data from store after mount to avoid hydration mismatch and ensure latest state
  useEffect(() => {
    if (syncConfig) {
        setFormData({
            userId: syncConfig.userId || 'default_user',
            larkAppId: syncConfig.larkAppId || '',
            larkAppSecret: syncConfig.larkAppSecret || '',
            larkBaseToken: syncConfig.larkBaseToken || '',
            kimiApiKey: syncConfig.kimiApiKey || '',
        })
    }
  }, [syncConfig])

  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSave = () => {
    setSyncConfig(formData)
    setMessage('设置已保存 (本地)')
    setStatus('success')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const handleTestConnection = async () => {
    if (!formData.larkAppId || !formData.larkAppSecret || !formData.larkBaseToken) {
      setMessage('请先填写完整的飞书配置')
      setStatus('error')
      return
    }

    setStatus('testing')
    try {
      const res = await fetch('/api/lark/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (data.success) {
        setStatus('success')
        setMessage(`连接成功！已检测到/创建数据表：${data.tables.join(', ')}`)
        
        // Save config including table mapping if returned
        // Important: Merge with current formData to ensure we don't lose user inputs
        setSyncConfig({
            ...formData,
            larkTableMap: data.tableMap
        })
      } else {
        setStatus('error')
        setMessage(`连接失败: ${data.message}`)
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(`网络错误: ${e.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">设置 & 云同步</h1>
        </div>

        {/* User Profile Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            👤 用户身份
          </h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">当前用户 ID</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="例如: baoxiaoxi"
                />
            </div>
            <p className="text-xs text-gray-400">
                切换 ID 后，仪表盘将只显示该用户的数据。
            </p>
          </div>
        </div>

        {/* Lark Sync Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                ☁️ 飞书云同步 (Lark Base)
            </h2>
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                Beta
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">App ID</label>
                <input 
                    type="text" 
                    value={formData.larkAppId}
                    onChange={(e) => setFormData({...formData, larkAppId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    placeholder="cli_..."
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">App Secret</label>
                <input 
                    type="password" 
                    value={formData.larkAppSecret}
                    onChange={(e) => setFormData({...formData, larkAppSecret: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    placeholder="****************"
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Base Token (多维表格 ID)</label>
                <input 
                    type="text" 
                    value={formData.larkBaseToken}
                    onChange={(e) => setFormData({...formData, larkBaseToken: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    placeholder="从多维表格 URL 中获取"
                />
                <p className="text-xs text-gray-400">
                    例如: https://.../base/<b>N8s7d6f5g4h3...</b>?table=...
                </p>
            </div>
          </div>
        </div>

        {/* AI Configuration Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                🤖 AI 助手 (Kimi)
            </h2>
            <span className="px-2 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-full">
                New
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Kimi API Key</label>
                <input 
                    type="password" 
                    value={formData.kimiApiKey}
                    onChange={(e) => setFormData({...formData, kimiApiKey: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono"
                    placeholder="sk-..."
                />
                <p className="text-xs text-gray-400">
                    用于生成每日洞察。请前往 <a href="https://platform.moonshot.cn/" target="_blank" className="underline hover:text-violet-600">Moonshot AI 开放平台</a> 获取。
                </p>
            </div>
          </div>
        </div>


        {/* Actions - MOVED OUTSIDE of sections */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
             <div className="flex items-center gap-2">
                {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                {status === 'success' && <Check className="w-4 h-4 text-emerald-600" />}
                {status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span className={`text-sm ${
                    status === 'success' ? 'text-emerald-600' : 
                    status === 'error' ? 'text-rose-600' : 'text-gray-500'
                }`}>
                    {message}
                </span>
             </div>
             <div className="flex gap-3">
                <button 
                    onClick={handleTestConnection}
                    disabled={status === 'testing'}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <RefreshCcw className="w-4 h-4" />
                    测试连接
                </button>
                <button 
                    onClick={handleSave}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    保存配置
                </button>
             </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed border border-blue-100">
            <h3 className="font-bold mb-2 flex items-center gap-2">📚 配置指南</h3>
            <ol className="list-decimal ml-4 space-y-1 text-blue-700/80">
                <li>前往 <a href="https://open.feishu.cn/" target="_blank" className="underline hover:text-blue-900">飞书开放平台</a> 创建一个企业自建应用。</li>
                <li>在“权限管理”中开启 <b>多维表格 (bitable:app:read/write)</b> 相关权限。</li>
                <li>发布应用版本。</li>
                <li>在“凭证与基础信息”中获取 App ID 和 App Secret。</li>
                <li>创建一个新的多维表格，从 URL 中复制 Base Token。</li>
            </ol>
        </div>
      </div>
    </div>
  )
}
