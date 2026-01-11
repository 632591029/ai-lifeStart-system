/**
 * Information Agent Service
 * 负责从多个数据源获取信息、分类和评分
 * 
 * 设计原则：
 * - 通用性：支持多种数据源（可配置）
 * - 可迁移性：不依赖特定平台
 * - 模块化：易于添加新数据源
 */

import { invokeLLM } from "../_core/llm";
import {
  createArticle,
  createDailySummary,
  createSystemMessage,
  logAgentExecution,
  getArticlesByUser,
  getUserPreferences,
} from "../db";
import { notifyOwner } from "../_core/notification";

interface ArticleData {
  title: string;
  description?: string;
  content?: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt?: Date;
}

interface ClassificationResult {
  category: "ai_breakthrough" | "productivity_tool" | "investment" | "other";
  relevanceScore: number;
  reason: string;
}

/**
 * 从 HackerNews 获取热门故事
 * 使用公开 API，无需认证
 */
async function fetchFromHackerNews(): Promise<ArticleData[]> {
  try {
    const response = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    const storyIds: number[] = await response.json();

    const articles: ArticleData[] = [];

    // 获取前 20 个故事
    for (const id of storyIds.slice(0, 20)) {
      try {
        const storyResponse = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        const story = await storyResponse.json();

        if (story.title && story.url) {
          articles.push({
            title: story.title,
            url: story.url,
            source: "HackerNews",
            publishedAt: new Date(story.time * 1000),
          });
        }
      } catch (error) {
        console.error(`Failed to fetch HN story ${id}:`, error);
      }
    }

    return articles;
  } catch (error) {
    console.error("Failed to fetch from HackerNews:", error);
    return [];
  }
}

/**
 * 从 Product Hunt 获取新产品
 * 需要 API 密钥（可选）
 */
async function fetchFromProductHunt(): Promise<ArticleData[]> {
  try {
    // 这是一个示例实现，实际使用需要 Product Hunt API 密钥
    // 为了通用性，我们提供一个可配置的实现
    const apiKey = process.env.PRODUCT_HUNT_API_KEY;

    if (!apiKey) {
      console.log("Product Hunt API key not configured, skipping");
      return [];
    }

    // 实现 Product Hunt API 调用
    // 这里是伪代码，实际实现需要根据 API 文档
    const response = await fetch("https://api.producthunt.com/v2/posts", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();
    const articles: ArticleData[] = (data.data || []).map((post: any) => ({
      title: post.name,
      description: post.tagline,
      url: post.url,
      imageUrl: post.thumbnail?.image_url,
      source: "ProductHunt",
      publishedAt: new Date(post.created_at),
    }));

    return articles;
  } catch (error) {
    console.error("Failed to fetch from Product Hunt:", error);
    return [];
  }
}

/**
 * 从 RSS 源获取文章
 * 支持任何 RSS 源
 */
async function fetchFromRSSFeed(feedUrl: string): Promise<ArticleData[]> {
  try {
    // 注意：这需要一个 RSS 解析库
    // 在实际部署中，可以使用 rss-parser 或类似库
    // 为了通用性，这里提供一个框架

    console.log(`Fetching from RSS feed: ${feedUrl}`);
    // 实现 RSS 解析逻辑
    return [];
  } catch (error) {
    console.error(`Failed to fetch from RSS feed ${feedUrl}:`, error);
    return [];
  }
}

/**
 * 使用 LLM 对文章进行分类和评分
 */
async function classifyAndScoreArticle(
  article: ArticleData,
  userInterests: string[]
): Promise<ClassificationResult> {
  try {
    const prompt = `
你是一个信息分类专家。请分析以下文章，并根据用户的兴趣进行分类和评分。

用户兴趣: ${userInterests.join(", ")}

文章标题: ${article.title}
文章描述: ${article.description || "无"}
来源: ${article.source}

请返回一个 JSON 对象，包含以下字段：
{
  "category": "ai_breakthrough" | "productivity_tool" | "investment" | "other",
  "relevanceScore": 0.0-1.0 之间的数字，表示与用户兴趣的相关性,
  "reason": "简短的分类原因"
}

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
      category: result.category || "other",
      relevanceScore: Math.min(Math.max(result.relevanceScore || 0.5, 0), 1),
      reason: result.reason || "",
    };
  } catch (error) {
    console.error("Failed to classify article:", error);
    return {
      category: "other",
      relevanceScore: 0.5,
      reason: "分类失败，使用默认值",
    };
  }
}

/**
 * 生成每日摘要
 */
async function generateDailySummary(
  articles: Array<ArticleData & ClassificationResult>
): Promise<string> {
  try {
    // 按相关性排序，取前 10 篇
    const topArticles = articles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    const articlesText = topArticles
      .map(
        (a) =>
          `- [${a.category}] ${a.title} (相关性: ${(a.relevanceScore * 100).toFixed(0)}%)`
      )
      .join("\n");

    const prompt = `
请基于以下文章生成一份简洁的每日摘要（不超过 300 字）。
强调最重要的信息和趋势。

文章列表：
${articlesText}

请提供：
1. 今日要点（3-5 个关键点）
2. 趋势分析
3. 投资机会（如果有）
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
    console.error("Failed to generate daily summary:", error);
    return "摘要生成失败";
  }
}

/**
 * 运行信息获取 Agent
 */
export async function runInformationAgent(userId: number): Promise<void> {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage: string | null = null;

  try {
    console.log(`[Information Agent] Starting for user ${userId}`);

    // 获取用户偏好
    const userPrefs = await getUserPreferences(userId);
    const userInterests = (userPrefs?.interests as string[]) || [
      "AI",
      "Technology",
      "Productivity",
    ];

    // 获取所有数据源
    const articles: ArticleData[] = [];

    // 从 HackerNews 获取
    try {
      const hnArticles = await fetchFromHackerNews();
      articles.push(...hnArticles);
      itemsProcessed += hnArticles.length;
    } catch (error) {
      console.error("HackerNews fetch failed:", error);
      itemsFailed++;
    }

    // 从 Product Hunt 获取
    try {
      const phArticles = await fetchFromProductHunt();
      articles.push(...phArticles);
      itemsProcessed += phArticles.length;
    } catch (error) {
      console.error("Product Hunt fetch failed:", error);
      itemsFailed++;
    }

    console.log(`[Information Agent] Fetched ${articles.length} articles`);

    // 分类和评分
    const classifiedArticles: Array<ArticleData & ClassificationResult> = [];

    for (const article of articles) {
      try {
        const classification = await classifyAndScoreArticle(
          article,
          userInterests
        );

        const classifiedArticle = {
          ...article,
          ...classification,
        };

        // 保存到数据库
        await createArticle({
          userId,
          title: article.title,
          description: article.description,
          url: article.url,
          imageUrl: article.imageUrl,
          source: article.source,
          category: classification.category,
          relevanceScore: classification.relevanceScore.toString() as any,
          publishedAt: article.publishedAt,
        });

        classifiedArticles.push(classifiedArticle);
      } catch (error) {
        console.error(`Failed to process article ${article.title}:`, error);
        itemsFailed++;
      }
    }

    // 生成每日摘要
    const today = new Date().toISOString().split("T")[0];
    const summary = await generateDailySummary(classifiedArticles);

    // 保存摘要
    await createDailySummary({
      userId,
      date: today,
      summary,
      topArticleIds: classifiedArticles
        .slice(0, 10)
        .map((_, i) => i)
        .toString() as any,
    });

    // 创建系统消息
    await createSystemMessage({
      userId,
      messageType: "daily_summary",
      title: "📰 今日信息摘要",
      content: summary,
    });

    // 记录执行日志
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "information",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime,
    });

    console.log(
      `[Information Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Information Agent] Error:", error);

    // 记录失败的执行
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "information",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime,
    });

    // 通知所有者
    await notifyOwner({
      title: "Information Agent 执行失败",
      content: `用户 ${userId} 的信息获取 Agent 执行失败: ${errorMessage}`,
    });
  }
}

/**
 * 定时运行信息 Agent（每天早上 8 点）
 */
export async function scheduleInformationAgent(userId: number): Promise<void> {
  // 这个函数会被调用来设置定时任务
  // 实际的调度逻辑在后端服务中实现
  console.log(`Information Agent scheduled for user ${userId}`);
}
