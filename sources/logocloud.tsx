import Link from 'next/link'
import socialMediaData from '@/data/social-media.json'

export default function SocialMediaSection() {
    // 社交媒体图标映射（使用emoji）
    const iconMap: Record<string, string> = {
        wechat: '📱',
        xiaohongshu: '📕',
        bilibili: '🎬',
        weibo: '📘',
        twitter: '🐦',
        jike: '⚡',
    }

    return (
        <section>
            <div className="py-16 md:py-24">
                <div className="mx-auto max-w-5xl px-6">
                    {/* 标题 */}
                    <div className="text-center mb-12">
                        <h2 className="text-foreground text-2xl font-bold mb-2">
                            🌐 关注黄叔的社交媒体
                        </h2>
                        <p className="text-muted-foreground">
                            多平台获取AI编程干货，累计粉丝30万+
                        </p>
                    </div>

                    {/* 社交媒体网格 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {socialMediaData.map((platform, index) => (
                            <Link
                                key={index}
                                href={platform.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group">
                                <div className="bg-background border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:scale-105">
                                    {/* 图标 */}
                                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                                        {iconMap[platform.icon] || '📱'}
                                    </div>

                                    {/* 平台名称 */}
                                    <div className="text-sm font-medium text-foreground mb-1">
                                        {platform.platform}
                                    </div>

                                    {/* 粉丝数 */}
                                    <div className="text-xs text-muted-foreground">
                                        {platform.followers}粉丝
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* 底部提示 */}
                    <div className="text-center mt-8 text-sm text-muted-foreground">
                        点击图标即可跳转到对应平台
                    </div>
                </div>
            </div>
        </section>
    )
}
