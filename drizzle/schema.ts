import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// ALPHA System Tables
// ============================================

/**
 * 信息源配置表
 * 存储用户订阅的各种信息源（Twitter、HackerNews、RSS 等）
 */
export const informationSources = mysqlTable("information_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceType: varchar("sourceType", { length: 50 }).notNull(), // 'twitter', 'hackernews', 'producthunt', 'rss', etc.
  name: varchar("name", { length: 255 }).notNull(),
  config: json("config"), // 存储源特定的配置（如 RSS URL、Twitter 关键词等）
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InformationSource = typeof informationSources.$inferSelect;
export type InsertInformationSource = typeof informationSources.$inferInsert;

/**
 * 文章/信息表
 * 存储爬取的所有文章和信息
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceId: int("sourceId"), // 关联到 informationSources
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  content: text("content"),
  url: varchar("url", { length: 1000 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }),
  source: varchar("source", { length: 200 }).notNull(), // 来源名称
  category: varchar("category", { length: 100 }), // 'ai_breakthrough', 'productivity_tool', 'investment', 'other'
  relevanceScore: decimal("relevanceScore", { precision: 3, scale: 2 }), // 0.00 - 1.00
  isSaved: boolean("isSaved").default(false).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * 每日摘要表
 * 存储每天生成的信息摘要
 */
export const dailySummaries = mysqlTable("daily_summaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD 格式
  summary: text("summary").notNull(),
  topArticleIds: json("topArticleIds"), // 存储 top articles 的 ID 列表
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = typeof dailySummaries.$inferInsert;

/**
 * 学习内容表
 * 存储每天生成的学习任务和内容
 */
export const learningContent = mysqlTable("learning_content", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD 格式
  topic: varchar("topic", { length: 255 }).notNull(), // 学习主题
  category: varchar("category", { length: 50 }).notNull(), // 'web3', 'us_stocks', 'quantitative'
  explanation: text("explanation"), // 概念解释
  caseStudy: text("caseStudy"), // 案例分析
  keyPoints: json("keyPoints"), // 关键要点列表
  resources: json("resources"), // 推荐资源列表
  nextTopic: varchar("nextTopic", { length: 255 }), // 下一个学习主题
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningContent = typeof learningContent.$inferSelect;
export type InsertLearningContent = typeof learningContent.$inferInsert;

/**
 * 投资组合表
 * 存储用户的投资组合信息
 */
export const portfolio = mysqlTable("portfolio", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(), // 股票或加密货币代码
  assetType: varchar("assetType", { length: 50 }).notNull(), // 'us_stock', 'crypto', 'other'
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 8 }),
  totalValue: decimal("totalValue", { precision: 18, scale: 8 }),
  gainLoss: decimal("gainLoss", { precision: 18, scale: 8 }),
  gainLossPercent: decimal("gainLossPercent", { precision: 5, scale: 2 }),
  purchasedAt: timestamp("purchasedAt"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Portfolio = typeof portfolio.$inferSelect;
export type InsertPortfolio = typeof portfolio.$inferInsert;

/**
 * 投资信号表
 * 存储 AI 生成的投资机会和信号
 */
export const investmentSignals = mysqlTable("investment_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("assetType", { length: 50 }).notNull(), // 'us_stock', 'crypto'
  signal: varchar("signal", { length: 50 }).notNull(), // 'buy', 'sell', 'hold', 'watch'
  reason: text("reason").notNull(),
  targetPrice: decimal("targetPrice", { precision: 18, scale: 8 }),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }),
  riskLevel: varchar("riskLevel", { length: 20 }), // 'low', 'medium', 'high'
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00 - 1.00
  isActioned: boolean("isActioned").default(false).notNull(),
  actionedAt: timestamp("actionedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InvestmentSignal = typeof investmentSignals.$inferSelect;
export type InsertInvestmentSignal = typeof investmentSignals.$inferInsert;

/**
 * 交易历史表
 * 记录所有交易活动
 */
export const tradeHistory = mysqlTable("trade_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("assetType", { length: 50 }).notNull(),
  tradeType: varchar("tradeType", { length: 20 }).notNull(), // 'buy', 'sell'
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 18, scale: 8 }).notNull(),
  reason: text("reason"), // 交易原因
  signalId: int("signalId"), // 关联的投资信号
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TradeHistory = typeof tradeHistory.$inferSelect;
export type InsertTradeHistory = typeof tradeHistory.$inferInsert;

/**
 * 量化策略表
 * 存储用户创建的量化策略
 */
export const quantitativeStrategies = mysqlTable("quantitative_strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  strategyType: varchar("strategyType", { length: 100 }).notNull(), // 'moving_average', 'momentum', 'mean_reversion', etc.
  parameters: json("parameters"), // 策略参数
  backtestResults: json("backtestResults"), // 回测结果
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuantitativeStrategy = typeof quantitativeStrategies.$inferSelect;
export type InsertQuantitativeStrategy = typeof quantitativeStrategies.$inferInsert;

/**
 * 系统消息表
 * 存储发送给用户的所有消息（邮件、通知等）
 */
export const systemMessages = mysqlTable("system_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageType: varchar("messageType", { length: 50 }).notNull(), // 'daily_summary', 'learning_task', 'investment_signal', 'alert'
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"), // 存储额外的元数据
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemMessage = typeof systemMessages.$inferSelect;
export type InsertSystemMessage = typeof systemMessages.$inferInsert;

/**
 * Agent 执行日志表
 * 记录每个 Agent 的执行情况
 */
export const agentExecutionLogs = mysqlTable("agent_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentName: varchar("agentName", { length: 50 }).notNull(), // 'information', 'learning', 'investment'
  status: varchar("status", { length: 20 }).notNull(), // 'success', 'failed', 'partial'
  itemsProcessed: int("itemsProcessed").default(0).notNull(),
  itemsFailed: int("itemsFailed").default(0).notNull(),
  errorMessage: text("errorMessage"),
  executionTime: int("executionTime"), // 执行时间（毫秒）
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentExecutionLog = typeof agentExecutionLogs.$inferSelect;
export type InsertAgentExecutionLog = typeof agentExecutionLogs.$inferInsert;

/**
 * 用户偏好设置表
 * 存储用户的系统配置
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  interests: json("interests"), // 用户兴趣列表 ['AI', 'Web3', 'Productivity']
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  notificationEnabled: boolean("notificationEnabled").default(true).notNull(),
  summaryTime: varchar("summaryTime", { length: 5 }), // HH:MM 格式，每日摘要时间
  learningTime: varchar("learningTime", { length: 5 }), // 学习任务时间
  investmentCheckTime: varchar("investmentCheckTime", { length: 5 }), // 投资检查时间
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  theme: varchar("theme", { length: 20 }).default("light").notNull(), // 'light', 'dark'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
