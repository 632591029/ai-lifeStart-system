import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  articles,
  dailySummaries,
  learningContent,
  portfolio,
  investmentSignals,
  tradeHistory,
  systemMessages,
  agentExecutionLogs,
  userPreferences,
  informationSources,
  quantitativeStrategies,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Article Operations
// ============================================

export async function createArticle(article: typeof articles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(articles).values(article);
  return result;
}

export async function getArticlesByUser(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(articles)
    .where(eq(articles.userId, userId))
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getArticlesByCategory(
  userId: number,
  category: string,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(articles)
    .where(and(eq(articles.userId, userId), eq(articles.category, category)))
    .orderBy(desc(articles.relevanceScore))
    .limit(limit);
}

export async function updateArticleRelevanceScore(
  articleId: number,
  score: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(articles)
    .set({ relevanceScore: score.toString() as any })
    .where(eq(articles.id, articleId));
}

export async function markArticleAsRead(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(articles)
    .set({ isRead: true })
    .where(eq(articles.id, articleId));
}

export async function saveArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(articles)
    .set({ isSaved: true })
    .where(eq(articles.id, articleId));
}

// ============================================
// Daily Summary Operations
// ============================================

export async function createDailySummary(
  summary: typeof dailySummaries.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(dailySummaries).values(summary);
}

export async function getDailySummary(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(dailySummaries)
    .where(and(eq(dailySummaries.userId, userId), eq(dailySummaries.date, date)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getLatestDailySummaries(userId: number, days = 7) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dailySummaries)
    .where(eq(dailySummaries.userId, userId))
    .orderBy(desc(dailySummaries.date))
    .limit(days);
}

// ============================================
// Learning Content Operations
// ============================================

export async function createLearningContent(
  content: typeof learningContent.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(learningContent).values(content);
}

export async function getLearningContentByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(learningContent)
    .where(eq(learningContent.userId, userId))
    .orderBy(desc(learningContent.date))
    .limit(limit);
}

export async function getTodayLearningContent(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(learningContent)
    .where(
      and(eq(learningContent.userId, userId), eq(learningContent.date, date))
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function markLearningAsCompleted(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(learningContent)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(eq(learningContent.id, contentId));
}

// ============================================
// Portfolio Operations
// ============================================

export async function upsertPortfolioItem(
  item: typeof portfolio.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否存在
  const existing = await db
    .select()
    .from(portfolio)
    .where(
      and(
        eq(portfolio.userId, item.userId!),
        eq(portfolio.symbol, item.symbol!),
        eq(portfolio.assetType, item.assetType!)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(portfolio)
      .set(item)
      .where(eq(portfolio.id, existing[0].id));
  } else {
    return await db.insert(portfolio).values(item);
  }
}

export async function getPortfolioByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(portfolio)
    .where(eq(portfolio.userId, userId))
    .orderBy(desc(portfolio.totalValue));
}

export async function getPortfolioItem(
  userId: number,
  symbol: string,
  assetType: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(portfolio)
    .where(
      and(
        eq(portfolio.userId, userId),
        eq(portfolio.symbol, symbol),
        eq(portfolio.assetType, assetType)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================
// Investment Signal Operations
// ============================================

export async function createInvestmentSignal(
  signal: typeof investmentSignals.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(investmentSignals).values(signal);
}

export async function getInvestmentSignalsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(investmentSignals)
    .where(eq(investmentSignals.userId, userId))
    .orderBy(desc(investmentSignals.createdAt))
    .limit(limit);
}

export async function getActiveInvestmentSignals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(investmentSignals)
    .where(
      and(
        eq(investmentSignals.userId, userId),
        eq(investmentSignals.isActioned, false)
      )
    )
    .orderBy(desc(investmentSignals.confidence));
}

export async function markSignalAsActioned(signalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(investmentSignals)
    .set({ isActioned: true, actionedAt: new Date() })
    .where(eq(investmentSignals.id, signalId));
}

// ============================================
// Trade History Operations
// ============================================

export async function createTradeRecord(
  trade: typeof tradeHistory.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(tradeHistory).values(trade);
}

export async function getTradeHistoryByUser(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(tradeHistory)
    .where(eq(tradeHistory.userId, userId))
    .orderBy(desc(tradeHistory.executedAt))
    .limit(limit);
}

// ============================================
// System Message Operations
// ============================================

export async function createSystemMessage(
  message: typeof systemMessages.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(systemMessages).values(message);
}

export async function getUnreadMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(systemMessages)
    .where(
      and(eq(systemMessages.userId, userId), eq(systemMessages.isRead, false))
    )
    .orderBy(desc(systemMessages.sentAt));
}

export async function markMessageAsRead(messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(systemMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(systemMessages.id, messageId));
}

// ============================================
// Agent Execution Log Operations
// ============================================

export async function logAgentExecution(
  log: typeof agentExecutionLogs.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(agentExecutionLogs).values(log);
}

export async function getAgentExecutionLogs(
  userId: number,
  agentName: string,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(agentExecutionLogs)
    .where(
      and(
        eq(agentExecutionLogs.userId, userId),
        eq(agentExecutionLogs.agentName, agentName)
      )
    )
    .orderBy(desc(agentExecutionLogs.executedAt))
    .limit(limit);
}

// ============================================
// User Preferences Operations
// ============================================

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function upsertUserPreferences(
  prefs: typeof userPreferences.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserPreferences(prefs.userId!);

  if (existing) {
    return await db
      .update(userPreferences)
      .set(prefs)
      .where(eq(userPreferences.userId, prefs.userId!));
  } else {
    return await db.insert(userPreferences).values(prefs);
  }
}

// ============================================
// Information Source Operations
// ============================================

export async function createInformationSource(
  source: typeof informationSources.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(informationSources).values(source);
}

export async function getInformationSourcesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(informationSources)
    .where(
      and(eq(informationSources.userId, userId), eq(informationSources.isActive, true))
    );
}

// ============================================
// Quantitative Strategy Operations
// ============================================

export async function createQuantitativeStrategy(
  strategy: typeof quantitativeStrategies.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(quantitativeStrategies).values(strategy);
}

export async function getStrategiesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(quantitativeStrategies)
    .where(eq(quantitativeStrategies.userId, userId));
}

export async function getActiveStrategies(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(quantitativeStrategies)
    .where(
      and(
        eq(quantitativeStrategies.userId, userId),
        eq(quantitativeStrategies.isActive, true)
      )
    );
}

export async function updateStrategy(
  strategyId: number,
  updates: Partial<typeof quantitativeStrategies.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(quantitativeStrategies)
    .set(updates)
    .where(eq(quantitativeStrategies.id, strategyId));
}
