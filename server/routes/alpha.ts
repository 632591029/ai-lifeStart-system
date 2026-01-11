/**
 * ALPHA System tRPC Router
 * 提供所有 Agent 功能和数据查询的 API 端点
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getArticlesByUser,
  getArticlesByCategory,
  getLatestDailySummaries,
  getLearningContentByUser,
  getPortfolioByUser,
  getInvestmentSignalsByUser,
  getTradeHistoryByUser,
  getUnreadMessages,
  markMessageAsRead,
  getUserPreferences,
  upsertUserPreferences,
  markLearningAsCompleted,
  createTradeRecord,
  getAgentExecutionLogs,
} from "../db";
import { runInformationAgent } from "../services/informationAgent";
import { runLearningAgent } from "../services/learningAgent";
import { runInvestmentAgent } from "../services/investmentAgent";

export const alphaRouter = router({
  // ============================================
  // Information Agent Procedures
  // ============================================

  /**
   * 获取用户的所有文章
   */
  articles: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      if (input.category) {
        return await getArticlesByCategory(userId, input.category, input.limit);
      } else {
        return await getArticlesByUser(userId, input.limit, input.offset);
      }
    }),

  /**
   * 获取每日摘要
   */
  summaries: protectedProcedure
    .input(
      z.object({
        days: z.number().default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getLatestDailySummaries(ctx.user.id, input.days);
    }),

  /**
   * 手动运行信息 Agent
   */
  runInformationAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 异步运行，不阻塞响应
    runInformationAgent(userId).catch((error) => {
      console.error("Information Agent error:", error);
    });

    return { success: true, message: "Information Agent started" };
  }),

  // ============================================
  // Learning Agent Procedures
  // ============================================

  /**
   * 获取学习内容
   */
  learning: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getLearningContentByUser(ctx.user.id, input.limit);
    }),

  /**
   * 标记学习完成
   */
  markLearningComplete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markLearningAsCompleted(input.id);
      return { success: true, message: "Learning marked as completed" };
    }),

  /**
   * 手动运行学习 Agent
   */
  runLearningAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 异步运行
    runLearningAgent(userId).catch((error) => {
      console.error("Learning Agent error:", error);
    });

    return { success: true, message: "Learning Agent started" };
  }),

  // ============================================
  // Investment Agent Procedures
  // ============================================

  /**
   * 获取投资组合
   */
  portfolio: protectedProcedure.query(async ({ ctx }) => {
    return await getPortfolioByUser(ctx.user.id);
  }),

  /**
   * 获取投资信号
   */
  signals: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getInvestmentSignalsByUser(ctx.user.id, input.limit);
    }),

  /**
   * 获取交易历史
   */
  trades: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getTradeHistoryByUser(ctx.user.id, input.limit);
    }),

  /**
   * 记录交易
   */
  recordTrade: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        assetType: z.enum(["us_stock", "crypto"]),
        tradeType: z.enum(["buy", "sell"]),
        quantity: z.number(),
        price: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const totalAmount = input.quantity * input.price;

      await createTradeRecord({
        userId: ctx.user.id,
        symbol: input.symbol,
        assetType: input.assetType,
        tradeType: input.tradeType,
        quantity: input.quantity.toString() as any,
        price: input.price.toString() as any,
        totalAmount: totalAmount.toString() as any,
        reason: input.reason,
      });

      return { success: true, message: "Trade recorded" };
    }),

  /**
   * 手动运行投资 Agent
   */
  runInvestmentAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 异步运行
    runInvestmentAgent(userId).catch((error) => {
      console.error("Investment Agent error:", error);
    });

    return { success: true, message: "Investment Agent started" };
  }),

  // ============================================
  // System Message Procedures
  // ============================================

  /**
   * 获取未读消息
   */
  messages: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadMessages(ctx.user.id);
  }),

  /**
   * 标记消息为已读
   */
  markMessageRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markMessageAsRead(input.id);
      return { success: true, message: "Message marked as read" };
    }),

  // ============================================
  // User Preferences Procedures
  // ============================================

  /**
   * 获取用户偏好
   */
  preferences: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPreferences(ctx.user.id);
  }),

  /**
   * 更新用户偏好
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        interests: z.array(z.string()).optional(),
        notificationEmail: z.string().optional(),
        summaryTime: z.string().optional(),
        learningTime: z.string().optional(),
        investmentCheckTime: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertUserPreferences({
        userId: ctx.user.id,
        interests: input.interests as any,
        notificationEmail: input.notificationEmail,
        summaryTime: input.summaryTime,
        learningTime: input.learningTime,
        investmentCheckTime: input.investmentCheckTime,
        timezone: input.timezone,
      });

      return { success: true, message: "Preferences updated" };
    }),

  // ============================================
  // Agent Execution Logs Procedures
  // ============================================

  /**
   * 获取 Agent 执行日志
   */
  agentLogs: protectedProcedure
    .input(
      z.object({
        agentName: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getAgentExecutionLogs(ctx.user.id, input.agentName, input.limit);
    }),

  // ============================================
  // System Status Procedures
  // ============================================

  /**
   * 获取系统状态
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 获取各种数据的统计
    const articles = await getArticlesByUser(userId, 1);
    const summaries = await getLatestDailySummaries(userId, 1);
    const learning = await getLearningContentByUser(userId, 1);
    const portfolio = await getPortfolioByUser(userId);
    const signals = await getInvestmentSignalsByUser(userId, 1);
    const messages = await getUnreadMessages(userId);

    return {
      articlesCount: articles.length,
      summariesCount: summaries.length,
      learningCount: learning.length,
      portfolioCount: portfolio.length,
      signalsCount: signals.length,
      unreadMessagesCount: messages.length,
    };
  }),
});
