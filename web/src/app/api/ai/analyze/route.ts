
import { NextResponse } from 'next/server';

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

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
    const systemPrompt = `Role: 你是一位经验丰富的个人成长教练和时间管理专家，你的风格温暖而坚定，总能从数据中挖掘出深层的模式和机会，给出既有同理心又切实可行的建议。

Instruction: 
请基于用户提供的【蓄水池数据】（即用户设定的中长期计划）、【今日投入统计】（今日实际在各领域花费的时长或百分比）以及【完成任务列表】，生成一份精炼且有深度的每日洞察报告。你的思考应遵循以下步骤：

1. 对比中长期目标：将今日实际投入与蓄水池长期计划进行对比，找出显著偏离的领域（过度投入或严重不足）。
2. 评估效率与内容：结合完成任务的数量、类型和耗时，判断任务的重要性是否匹配蓄水池的长期重点，以及执行过程中是否存在效率问题（如多任务切换、拖延等）。
3. 挖掘根因：尝试从时间分布和任务选择中推断可能的阻碍或习惯模式（例如：紧急事务挤占重要事务、完美主义导致耗时过长、缺乏休息影响后续状态等）。
4. 给出行动建议：基于以上分析，提出1-2条最关键的、可立即执行的调整建议，帮助用户明日向蓄水池长期计划靠近一步。

Output Format: 
请严格按照以下 Markdown 格式输出，确保语言温暖、富有洞察力，避免机械感：

 📊 今日概览
[一句话总结今日的整体状态，既肯定亮点，也点出核心问题，例如：“今天你在工作上投入了充足的精力，完成了关键任务，但生活领域被压缩，长期来看可能影响续航。”]

 💡 深度洞察
*   时间分布：[将今日实际投入与蓄水池长期计划对比，分析各领域的偏离情况，并指出这种偏离可能带来的长期风险或机会。例如：“今日工作占比85%，远超蓄水池计划中的40%，长期如此将严重挤占健康和家庭领域，可能导致精力枯竭。”]
*   效率评价：[根据任务数量、时长和完成质量（可从任务描述推断），点评今日的工作效率。例如：“你完成了3项深度工作，但下午时段频繁切换任务，建议尝试‘番茄钟’保持专注。”]
*   内容评价：[结合完成任务的内容与蓄水池中的中长期重点，判断今日的选择是否服务于最重要的目标。例如：“你今天优先处理了紧急但不重要的琐事，而忽略了蓄水池中‘学习新技能’的关键任务，建议明天重新规划优先级。”]

 🌱 明日建议
1.  [第一条建议：具体、可操作，最好能直接解决今日发现的某个问题，例如：“明早先安排30分钟专注处理‘学习’任务，再处理工作邮件。”]
2.  [第二条建议：聚焦平衡或持续优化，例如：“下班后预留45分钟运动或陪伴家人，补充生活蓄水池。”]

Tone: 温暖、坚定、富有洞察力。语言像一位了解你长期目标的贴心教练，既指出事实，也传递信心。`;

    const userPrompt = `
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
