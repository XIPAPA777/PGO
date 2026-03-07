import { Card } from '@/components/ui/card'
import statsData from '@/data/stats.json'

export default function StatsSection() {
    return (
        <section>
            <div className="bg-muted py-12 md:py-20">
                <div className="mx-auto max-w-5xl px-6">
                    {/* 标题 */}
                    <div className="text-center mb-12">
                        <h2 className="text-foreground text-2xl font-bold">
                            📊 社团数据一览
                        </h2>
                    </div>

                    {/* 数据卡片 */}
                    <Card className="grid gap-0.5 divide-y *:py-8 *:text-center md:grid-cols-4 md:divide-x md:divide-y-0">
                        {statsData.map((stat, index) => (
                            <div key={index}>
                                <div className="text-foreground space-y-1 text-4xl font-bold">
                                    {stat.value}
                                </div>
                                <p className="text-muted-foreground mt-2">{stat.label}</p>
                                {stat.description && (
                                    <p className="text-muted-foreground/70 text-xs mt-1 px-4">
                                        {stat.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </section>
    )
}
