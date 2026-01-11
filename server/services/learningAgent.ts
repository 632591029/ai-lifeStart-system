/**
 * Learning Agent Service
 * 负责生成每日学习内容，帮助用户从 Web3 到美股再到量化投资的学习路径
 */

import { invokeLLM } from "../_core/llm";
import {
  createLearningContent,
  getTodayLearningContent,
  createSystemMessage,
  logAgentExecution,
  getUserPreferences,
} from "../db";
import { notifyOwner } from "../_core/notification";

interface LearningPlan {
  topic: string;
  category: "web3" | "us_stocks" | "quantitative";
  explanation: string;
  caseStudy: string;
  keyPoints: string[];
  resources: Array<{ title: string; url: string; type: string }>;
  nextTopic: string;
}

/**
 * 生成学习计划
 * 根据用户的学习进度和兴趣动态生成
 */
async function generateLearningPlan(
  userId: number,
  category: "web3" | "us_stocks" | "quantitative"
): Promise<LearningPlan> {
  try {
    const categoryDescriptions = {
      web3: "区块链、加密货币、DeFi、NFT 等 Web3 技术",
      us_stocks: "美国股市基础、公司分析、投资策略",
      quantitative: "量化投资、算法交易、数据分析",
    };

    const prompt = `
你是一位专业的投资教育专家。请为一位初学者生成一份关于"${categoryDescriptions[category]}"的学习内容。

请生成一个 JSON 对象，包含以下字段：
{
  "topic": "今天的学习主题",
  "explanation": "详细的概念解释（200-300字）",
  "caseStudy": "真实的案例分析（200-300字）",
  "keyPoints": ["关键点1", "关键点2", "关键点3", "关键点4"],
  "resources": [
    {"title": "资源标题", "url": "https://example.com", "type": "article|video|course"},
    ...
  ],
  "nextTopic": "下一个学习主题的建议"
}

要求：
1. 内容应该循序渐进，从基础到进阶
2. 包含实际的例子和案例
3. 资源应该是真实存在的、高质量的
4. 语言应该清晰易懂

只返回 JSON，不要其他内容。
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);

    return {
      topic: result.topic || "未知主题",
      category,
      explanation: result.explanation || "",
      caseStudy: result.caseStudy || "",
      keyPoints: result.keyPoints || [],
      resources: result.resources || [],
      nextTopic: result.nextTopic || "",
    };
  } catch (error) {
    console.error("Failed to generate learning plan:", error);
    throw error;
  }
}

/**
 * 确定今天应该学习的类别
 * 使用循环策略：Web3 → US Stocks → Quantitative
 */
function decideLearningCategory(dayOfWeek: number): "web3" | "us_stocks" | "quantitative" {
  const categories: Array<"web3" | "us_stocks" | "quantitative"> = [
    "web3",
    "us_stocks",
    "quantitative",
  ];

  return categories[dayOfWeek % 3];
}

/**
 * 生成学习总结
 */
async function generateLearningSummary(plan: LearningPlan): Promise<string> {
  try {
    const prompt = `
请基于以下学习内容生成一份简洁的学习总结（不超过 150 字）。

主题: ${plan.topic}
类别: ${plan.category}

关键点:
${plan.keyPoints.map((p) => `- ${p}`).join("\n")}

请提供：
1. 今日学习的核心要点
2. 为什么这很重要
3. 如何应用到实际投资中
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to generate learning summary:", error);
    return "学习总结生成失败";
  }
}

/**
 * 运行学习 Agent
 */
export async function runLearningAgent(userId: number): Promise<void> {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage: string | null = null;

  try {
    console.log(`[Learning Agent] Starting for user ${userId}`);

    // 确定今天应该学习的类别
    const today = new Date();
    const dayOfWeek = today.getDay();
    const category = decideLearningCategory(dayOfWeek);

    // 检查今天是否已经生成过学习内容
    const todayStr = today.toISOString().split("T")[0];
    const existingContent = await getTodayLearningContent(userId, todayStr);

    if (existingContent) {
      console.log(`[Learning Agent] Learning content already exists for today`);
      return;
    }

    // 生成学习计划
    const plan = await generateLearningPlan(userId, category);
    itemsProcessed++;

    // 生成学习总结
    const summary = await generateLearningSummary(plan);

    // 保存到数据库
    await createLearningContent({
      userId,
      date: todayStr,
      topic: plan.topic,
      category,
      explanation: plan.explanation,
      caseStudy: plan.caseStudy,
      keyPoints: plan.keyPoints as any,
      resources: plan.resources as any,
      nextTopic: plan.nextTopic,
    });

    // 创建系统消息
    await createSystemMessage({
      userId,
      messageType: "learning_task",
      title: `📚 今日学习: ${plan.topic}`,
      content: summary,
      metadata: {
        category,
        keyPoints: plan.keyPoints,
      } as any,
    });

    // 记录执行日志
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "learning",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime,
    });

    console.log(
      `[Learning Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Learning Agent] Error:", error);

    // 记录失败的执行
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "learning",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime,
    });

    // 通知所有者
    await notifyOwner({
      title: "Learning Agent 执行失败",
      content: `用户 ${userId} 的学习 Agent 执行失败: ${errorMessage}`,
    });
  }
}
