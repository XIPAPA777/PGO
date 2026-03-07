import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import hackathonData from '@/data/hackathon-projects.json'

export default function HackathonSection() {
    return (
        <section id="hackathon">
            <div className="bg-muted py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    {/* 标题 */}
                    <div className="mb-12 text-center space-y-4">
                        <h2 className="text-foreground text-3xl font-bold sm:text-4xl">
                            🏆 黑客松获奖作品展示
                        </h2>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                            首期黑客松圆满成功，23个作品，4小时直播全程高能，价值1000元+奖品
                        </p>
                    </div>

                    {/* Top 3 作品展示 */}
                    <div className="grid gap-6 md:grid-cols-3 mb-8">
                        {hackathonData.map((project, index) => (
                            <div key={index}>
                                <div className="bg-background ring-foreground/10 rounded-2xl border border-transparent ring-1 overflow-hidden hover:shadow-lg transition-shadow">
                                    {/* 奖牌标识 */}
                                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
                                        <div className="text-6xl mb-2">{project.medal}</div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {project.rank === 1 ? '一等奖' : project.rank === 2 ? '二等奖' : '三等奖'}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {project.prize}
                                        </div>
                                    </div>

                                    {/* 作品信息 */}
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground mb-1">
                                                {project.projectName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                作者：{project.author}
                                            </p>
                                        </div>

                                        <p className="text-sm text-foreground">
                                            {project.description}
                                        </p>

                                        {/* 标签 */}
                                        {project.tags && (
                                            <div className="flex flex-wrap gap-2">
                                                {project.tags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 查看全部作品按钮 */}
                    <div className="text-center">
                        <Button
                            asChild
                            variant="outline"
                            size="lg">
                            <Link href="#contact">
                                🎨 查看全部23个作品
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
