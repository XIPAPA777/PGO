import { NextResponse } from 'next/server';

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

function getDayType(date: Date): { dateStr: string; dayName: string; type: '工作日' | '休息日' } {
  const day = date.getDay();
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  return {
    dateStr: `${year}年${month}月${dayOfMonth}日`,
    dayName: `星期${days[day]}`,
    type: day === 0 || day === 6 ? '休息日' : '工作日'
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, context } = body;

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Missing API Key' }, { status: 400 });
    }

    if (!context) {
        return NextResponse.json({ success: false, message: 'Missing context' }, { status: 400 });
    }

    const { stats, tasks, backlogItems } = context;

    // Construct Prompt
    const completedTasks = tasks.filter((t: any) => t.status === 'done');
    const systemPrompt = `Role: 你是一位温暖且睿智的成长伙伴，擅长从数据中发现亮点和成长机会。

Instruction:
基于用户的【蓄水池(长期目标)】、【今日时间投入】和【完成任务】，生成简短有力的每日洞察。

分析框架（内部思考，不要输出）：
1. 先找亮点：今天做得好的地方是什么？
2. 再看机会：与长期目标对比，哪里有提升空间？
3. 挖掘本质：背后可能的原因或模式是什么？
4. 区分日期：工作日关注成长时间是否被挤压；休息日关注生活和恢复是否充足

Output Format:
严格按以下格式，每个部分控制在1-3句话：

📊 今日一览
[先肯定一个具体亮点，再用"同时"或"接下来可以"引出一个成长机会。语气积极。]

💡 核心洞察
[选择最值得关注的1个发现，将时间分配、任务选择、效率模式等融合成一段流畅的分析。聚焦"为什么"和"意味着什么"，而非罗列数据。用"有趣的是"、"值得注意的是"等开头。]

🎯 明日一步
[给出1条最关键的、具体可操作的小建议。用"可以试试"、"建议"等温和语气。要足够具体到能立即执行。]

Tone:
- 像朋友聊天，不像汇报或说教
- 用"你"而非"您"，简短句子
- 问题说成"机会"或"空间"
- 数据点到为止，重在洞察
- 结尾传递信心`;

    const dayInfo = getDayType(new Date());
    const userPrompt = `
    【日期信息】：
    - 今天是: ${dayInfo.dateStr} ${dayInfo.dayName} (${dayInfo.type})

    【蓄水池数据 (长期计划)】：
    ${backlogItems ? backlogItems.map((b: any) => `- [${b.category}] ${b.title} (目标: ${b.targetDate || '无'})`).join('\n') : '暂无长期计划'}

    【今日投入统计】：
    - 总投入时间：${Math.floor(stats.totalTime / 60)}小时${stats.totalTime % 60}分钟
    - 工作投入：${Math.floor(stats.workTime / 60)}小时${stats.workTime % 60}分钟
    - 成长投入：${Math.floor(stats.growthTime / 60)}小时${stats.growthTime % 60}分钟
    - 生活投入：${Math.floor(stats.lifeTime / 60)}小时${stats.lifeTime % 60}分钟

    【今日完成任务 (${completedTasks.length}个)】：
    ${completedTasks.map((t: any) => `- [${t.category}] ${t.title} (耗时: ${t.actualDuration}m)`).join('\n')}
    `;

    // Call Moonshot API
    const response = await fetch(MOONSHOT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "moonshot-v1-8k",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ success: false, message: error.error?.message || 'AI API Error' }, { status: response.status });
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || 'AI 未返回内容';

    return NextResponse.json({
        success: true,
        insight: aiContent
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
