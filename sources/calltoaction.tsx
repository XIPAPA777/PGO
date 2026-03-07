import Image from 'next/image'
import siteConfig from '@/data/site-config.json'

export default function CTASection() {
    return (
        <section id="contact">
            <div className="py-24 md:py-32">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-8 md:p-12 border border-primary/20 shadow-xl">
                        {/* 标题 */}
                        <div className="text-center space-y-4 mb-12">
                            <h2 className="text-foreground text-3xl font-bold sm:text-4xl">
                                🎯 立即加入社团
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                {siteConfig.description}
                            </p>
                        </div>

                        {/* 二维码和信息 */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                            {/* 二维码图片 */}
                            <div className="flex-shrink-0">
                                <div className="bg-white p-4 rounded-2xl shadow-lg">
                                    <Image
                                        src="/pic/shetuan.png"
                                        alt="扫码加入社团"
                                        width={300}
                                        height={400}
                                        className="rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* 报名信息 */}
                            <div className="space-y-6 text-center md:text-left max-w-md">
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                                        <span className="text-2xl">💰</span>
                                        <span className="text-foreground font-bold text-xl">
                                            {siteConfig.pricing}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 text-foreground">
                                    <div className="flex items-start gap-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <span>完整8大Part系统课程</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <span>黄叔亲自指导答疑</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <span>参与黑客松比赛</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <span>社群互助氛围</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <span>手把手教做产品</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <p className="text-primary font-semibold text-lg">
                                        👈 扫描二维码立即加入
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
