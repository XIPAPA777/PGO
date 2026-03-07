import Link from 'next/link'
import siteConfig from '@/data/site-config.json'
import socialMediaData from '@/data/social-media.json'

export default function Footer() {
    // 社交媒体图标映射
    const iconMap: Record<string, string> = {
        wechat: '📱',
        xiaohongshu: '📕',
        bilibili: '🎬',
        weibo: '📘',
        twitter: '🐦',
        jike: '⚡',
    }

    return (
        <footer className="border-t bg-muted/50">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <div className="grid gap-8 md:grid-cols-3">
                    {/* 左侧：社团介绍 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-foreground">
                            {siteConfig.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {siteConfig.slogan}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            © 2025 黄叔的AI编程社团
                        </p>
                    </div>

                    {/* 中间：快速链接 */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">
                            快速导航
                        </h4>
                        <nav className="flex flex-col space-y-2">
                            {siteConfig.navigation.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.href}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* 右侧：社交媒体 */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">
                            关注我们
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {socialMediaData.slice(0, 6).map((platform, index) => (
                                <Link
                                    key={index}
                                    href={platform.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl hover:scale-110 transition-transform"
                                    title={`${platform.platform} - ${platform.followers}粉丝`}>
                                    {iconMap[platform.icon] || '📱'}
                                </Link>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            多平台累计粉丝30万+
                        </p>
                    </div>
                </div>

                {/* 底部分隔线和版权 */}
                <div className="mt-8 border-t pt-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        让AI编程触手可及 · 用AI编程创造价值
                    </p>
                </div>
            </div>
        </footer>
    )
}
