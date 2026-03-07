import Link from 'next/link'
import { ArrowRight, Sparkles, History, Settings } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white text-center p-6">
      <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
          平衡工作， <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">投资自己。</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
          终身学习者的个人成长系统，管理你的注意力和成长。
        </p>
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-800 transition-all hover:gap-3 hover:shadow-lg"
          >
            打开仪表盘 <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex gap-4">
            <Link 
              href="/history" 
              className="inline-flex items-center gap-2 bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-50 transition-all hover:shadow-lg"
            >
              查看历史 <History className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        <div className="mt-12 p-4 bg-white/50 backdrop-blur rounded-xl border border-gray-100 text-sm text-gray-400">
          <p>数据仅存储在您的本地设备中，除非您<Link href="/settings" className="text-indigo-600 hover:text-indigo-700 hover:underline ml-1">配置云同步</Link>。</p>
        </div>
      </div>
    </div>
  )
}
