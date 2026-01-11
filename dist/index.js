// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var informationSources = mysqlTable("information_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceType: varchar("sourceType", { length: 50 }).notNull(),
  // 'twitter', 'hackernews', 'producthunt', 'rss', etc.
  name: varchar("name", { length: 255 }).notNull(),
  config: json("config"),
  // 存储源特定的配置（如 RSS URL、Twitter 关键词等）
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceId: int("sourceId"),
  // 关联到 informationSources
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  content: text("content"),
  url: varchar("url", { length: 1e3 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1e3 }),
  source: varchar("source", { length: 200 }).notNull(),
  // 来源名称
  category: varchar("category", { length: 100 }),
  // 'ai_breakthrough', 'productivity_tool', 'investment', 'other'
  relevanceScore: decimal("relevanceScore", { precision: 3, scale: 2 }),
  // 0.00 - 1.00
  isSaved: boolean("isSaved").default(false).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var dailySummaries = mysqlTable("daily_summaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  // YYYY-MM-DD 格式
  summary: text("summary").notNull(),
  topArticleIds: json("topArticleIds"),
  // 存储 top articles 的 ID 列表
  generatedAt: timestamp("generatedAt").defaultNow().notNull()
});
var learningContent = mysqlTable("learning_content", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  // YYYY-MM-DD 格式
  topic: varchar("topic", { length: 255 }).notNull(),
  // 学习主题
  category: varchar("category", { length: 50 }).notNull(),
  // 'web3', 'us_stocks', 'quantitative'
  explanation: text("explanation"),
  // 概念解释
  caseStudy: text("caseStudy"),
  // 案例分析
  keyPoints: json("keyPoints"),
  // 关键要点列表
  resources: json("resources"),
  // 推荐资源列表
  nextTopic: varchar("nextTopic", { length: 255 }),
  // 下一个学习主题
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var portfolio = mysqlTable("portfolio", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // 股票或加密货币代码
  assetType: varchar("assetType", { length: 50 }).notNull(),
  // 'us_stock', 'crypto', 'other'
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 8 }),
  totalValue: decimal("totalValue", { precision: 18, scale: 8 }),
  gainLoss: decimal("gainLoss", { precision: 18, scale: 8 }),
  gainLossPercent: decimal("gainLossPercent", { precision: 5, scale: 2 }),
  purchasedAt: timestamp("purchasedAt"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var investmentSignals = mysqlTable("investment_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("assetType", { length: 50 }).notNull(),
  // 'us_stock', 'crypto'
  signal: varchar("signal", { length: 50 }).notNull(),
  // 'buy', 'sell', 'hold', 'watch'
  reason: text("reason").notNull(),
  targetPrice: decimal("targetPrice", { precision: 18, scale: 8 }),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }),
  riskLevel: varchar("riskLevel", { length: 20 }),
  // 'low', 'medium', 'high'
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  // 0.00 - 1.00
  isActioned: boolean("isActioned").default(false).notNull(),
  actionedAt: timestamp("actionedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var tradeHistory = mysqlTable("trade_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("assetType", { length: 50 }).notNull(),
  tradeType: varchar("tradeType", { length: 20 }).notNull(),
  // 'buy', 'sell'
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 18, scale: 8 }).notNull(),
  reason: text("reason"),
  // 交易原因
  signalId: int("signalId"),
  // 关联的投资信号
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var quantitativeStrategies = mysqlTable("quantitative_strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  strategyType: varchar("strategyType", { length: 100 }).notNull(),
  // 'moving_average', 'momentum', 'mean_reversion', etc.
  parameters: json("parameters"),
  // 策略参数
  backtestResults: json("backtestResults"),
  // 回测结果
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var systemMessages = mysqlTable("system_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageType: varchar("messageType", { length: 50 }).notNull(),
  // 'daily_summary', 'learning_task', 'investment_signal', 'alert'
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  // 存储额外的元数据
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var agentExecutionLogs = mysqlTable("agent_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentName: varchar("agentName", { length: 50 }).notNull(),
  // 'information', 'learning', 'investment'
  status: varchar("status", { length: 20 }).notNull(),
  // 'success', 'failed', 'partial'
  itemsProcessed: int("itemsProcessed").default(0).notNull(),
  itemsFailed: int("itemsFailed").default(0).notNull(),
  errorMessage: text("errorMessage"),
  executionTime: int("executionTime"),
  // 执行时间（毫秒）
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  interests: json("interests"),
  // 用户兴趣列表 ['AI', 'Web3', 'Productivity']
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  notificationEnabled: boolean("notificationEnabled").default(true).notNull(),
  summaryTime: varchar("summaryTime", { length: 5 }),
  // HH:MM 格式，每日摘要时间
  learningTime: varchar("learningTime", { length: 5 }),
  // 学习任务时间
  investmentCheckTime: varchar("investmentCheckTime", { length: 5 }),
  // 投资检查时间
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  theme: varchar("theme", { length: 20 }).default("light").notNull(),
  // 'light', 'dark'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createArticle(article) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(article);
  return result;
}
async function getArticlesByUser(userId, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(articles).where(eq(articles.userId, userId)).orderBy(desc(articles.createdAt)).limit(limit).offset(offset);
}
async function getArticlesByCategory(userId, category, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(articles).where(and(eq(articles.userId, userId), eq(articles.category, category))).orderBy(desc(articles.relevanceScore)).limit(limit);
}
async function createDailySummary(summary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(dailySummaries).values(summary);
}
async function getLatestDailySummaries(userId, days = 7) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dailySummaries).where(eq(dailySummaries.userId, userId)).orderBy(desc(dailySummaries.date)).limit(days);
}
async function createLearningContent(content) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(learningContent).values(content);
}
async function getLearningContentByUser(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(learningContent).where(eq(learningContent.userId, userId)).orderBy(desc(learningContent.date)).limit(limit);
}
async function getTodayLearningContent(userId, date) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(learningContent).where(
    and(eq(learningContent.userId, userId), eq(learningContent.date, date))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function markLearningAsCompleted(contentId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(learningContent).set({ isCompleted: true, completedAt: /* @__PURE__ */ new Date() }).where(eq(learningContent.id, contentId));
}
async function getPortfolioByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(portfolio).where(eq(portfolio.userId, userId)).orderBy(desc(portfolio.totalValue));
}
async function createInvestmentSignal(signal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(investmentSignals).values(signal);
}
async function getInvestmentSignalsByUser(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(investmentSignals).where(eq(investmentSignals.userId, userId)).orderBy(desc(investmentSignals.createdAt)).limit(limit);
}
async function createTradeRecord(trade) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(tradeHistory).values(trade);
}
async function getTradeHistoryByUser(userId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tradeHistory).where(eq(tradeHistory.userId, userId)).orderBy(desc(tradeHistory.executedAt)).limit(limit);
}
async function createSystemMessage(message) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(systemMessages).values(message);
}
async function getUnreadMessages(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemMessages).where(
    and(eq(systemMessages.userId, userId), eq(systemMessages.isRead, false))
  ).orderBy(desc(systemMessages.sentAt));
}
async function markMessageAsRead(messageId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(systemMessages).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq(systemMessages.id, messageId));
}
async function logAgentExecution(log) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(agentExecutionLogs).values(log);
}
async function getAgentExecutionLogs(userId, agentName, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agentExecutionLogs).where(
    and(
      eq(agentExecutionLogs.userId, userId),
      eq(agentExecutionLogs.agentName, agentName)
    )
  ).orderBy(desc(agentExecutionLogs.executedAt)).limit(limit);
}
async function getUserPreferences(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertUserPreferences(prefs) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserPreferences(prefs.userId);
  if (existing) {
    return await db.update(userPreferences).set(prefs).where(eq(userPreferences.userId, prefs.userId));
  } else {
    return await db.insert(userPreferences).values(prefs);
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routes/alpha.ts
import { z as z2 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/services/informationAgent.ts
async function fetchFromHackerNews() {
  try {
    const response = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    const storyIds = await response.json();
    const articles2 = [];
    for (const id of storyIds.slice(0, 20)) {
      try {
        const storyResponse = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        const story = await storyResponse.json();
        if (story.title && story.url) {
          articles2.push({
            title: story.title,
            url: story.url,
            source: "HackerNews",
            publishedAt: new Date(story.time * 1e3)
          });
        }
      } catch (error) {
        console.error(`Failed to fetch HN story ${id}:`, error);
      }
    }
    return articles2;
  } catch (error) {
    console.error("Failed to fetch from HackerNews:", error);
    return [];
  }
}
async function fetchFromProductHunt() {
  try {
    const apiKey = process.env.PRODUCT_HUNT_API_KEY;
    if (!apiKey) {
      console.log("Product Hunt API key not configured, skipping");
      return [];
    }
    const response = await fetch("https://api.producthunt.com/v2/posts", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const data = await response.json();
    const articles2 = (data.data || []).map((post) => ({
      title: post.name,
      description: post.tagline,
      url: post.url,
      imageUrl: post.thumbnail?.image_url,
      source: "ProductHunt",
      publishedAt: new Date(post.created_at)
    }));
    return articles2;
  } catch (error) {
    console.error("Failed to fetch from Product Hunt:", error);
    return [];
  }
}
async function classifyAndScoreArticle(article, userInterests) {
  try {
    const prompt = `
\u4F60\u662F\u4E00\u4E2A\u4FE1\u606F\u5206\u7C7B\u4E13\u5BB6\u3002\u8BF7\u5206\u6790\u4EE5\u4E0B\u6587\u7AE0\uFF0C\u5E76\u6839\u636E\u7528\u6237\u7684\u5174\u8DA3\u8FDB\u884C\u5206\u7C7B\u548C\u8BC4\u5206\u3002

\u7528\u6237\u5174\u8DA3: ${userInterests.join(", ")}

\u6587\u7AE0\u6807\u9898: ${article.title}
\u6587\u7AE0\u63CF\u8FF0: ${article.description || "\u65E0"}
\u6765\u6E90: ${article.source}

\u8BF7\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
{
  "category": "ai_breakthrough" | "productivity_tool" | "investment" | "other",
  "relevanceScore": 0.0-1.0 \u4E4B\u95F4\u7684\u6570\u5B57\uFF0C\u8868\u793A\u4E0E\u7528\u6237\u5174\u8DA3\u7684\u76F8\u5173\u6027,
  "reason": "\u7B80\u77ED\u7684\u5206\u7C7B\u539F\u56E0"
}

\u53EA\u8FD4\u56DE JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\u3002
    `;
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content = response.choices[0].message.content;
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      category: result.category || "other",
      relevanceScore: Math.min(Math.max(result.relevanceScore || 0.5, 0), 1),
      reason: result.reason || ""
    };
  } catch (error) {
    console.error("Failed to classify article:", error);
    return {
      category: "other",
      relevanceScore: 0.5,
      reason: "\u5206\u7C7B\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C"
    };
  }
}
async function generateDailySummary(articles2) {
  try {
    const topArticles = articles2.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
    const articlesText = topArticles.map(
      (a) => `- [${a.category}] ${a.title} (\u76F8\u5173\u6027: ${(a.relevanceScore * 100).toFixed(0)}%)`
    ).join("\n");
    const prompt = `
\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u6587\u7AE0\u751F\u6210\u4E00\u4EFD\u7B80\u6D01\u7684\u6BCF\u65E5\u6458\u8981\uFF08\u4E0D\u8D85\u8FC7 300 \u5B57\uFF09\u3002
\u5F3A\u8C03\u6700\u91CD\u8981\u7684\u4FE1\u606F\u548C\u8D8B\u52BF\u3002

\u6587\u7AE0\u5217\u8868\uFF1A
${articlesText}

\u8BF7\u63D0\u4F9B\uFF1A
1. \u4ECA\u65E5\u8981\u70B9\uFF083-5 \u4E2A\u5173\u952E\u70B9\uFF09
2. \u8D8B\u52BF\u5206\u6790
3. \u6295\u8D44\u673A\u4F1A\uFF08\u5982\u679C\u6709\uFF09
    `;
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to generate daily summary:", error);
    return "\u6458\u8981\u751F\u6210\u5931\u8D25";
  }
}
async function runInformationAgent(userId) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage = null;
  try {
    console.log(`[Information Agent] Starting for user ${userId}`);
    const userPrefs = await getUserPreferences(userId);
    const userInterests = userPrefs?.interests || [
      "AI",
      "Technology",
      "Productivity"
    ];
    const articles2 = [];
    try {
      const hnArticles = await fetchFromHackerNews();
      articles2.push(...hnArticles);
      itemsProcessed += hnArticles.length;
    } catch (error) {
      console.error("HackerNews fetch failed:", error);
      itemsFailed++;
    }
    try {
      const phArticles = await fetchFromProductHunt();
      articles2.push(...phArticles);
      itemsProcessed += phArticles.length;
    } catch (error) {
      console.error("Product Hunt fetch failed:", error);
      itemsFailed++;
    }
    console.log(`[Information Agent] Fetched ${articles2.length} articles`);
    const classifiedArticles = [];
    for (const article of articles2) {
      try {
        const classification = await classifyAndScoreArticle(
          article,
          userInterests
        );
        const classifiedArticle = {
          ...article,
          ...classification
        };
        await createArticle({
          userId,
          title: article.title,
          description: article.description,
          url: article.url,
          imageUrl: article.imageUrl,
          source: article.source,
          category: classification.category,
          relevanceScore: classification.relevanceScore.toString(),
          publishedAt: article.publishedAt
        });
        classifiedArticles.push(classifiedArticle);
      } catch (error) {
        console.error(`Failed to process article ${article.title}:`, error);
        itemsFailed++;
      }
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const summary = await generateDailySummary(classifiedArticles);
    await createDailySummary({
      userId,
      date: today,
      summary,
      topArticleIds: classifiedArticles.slice(0, 10).map((_, i) => i).toString()
    });
    await createSystemMessage({
      userId,
      messageType: "daily_summary",
      title: "\u{1F4F0} \u4ECA\u65E5\u4FE1\u606F\u6458\u8981",
      content: summary
    });
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "information",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime
    });
    console.log(
      `[Information Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Information Agent] Error:", error);
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "information",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime
    });
    await notifyOwner({
      title: "Information Agent \u6267\u884C\u5931\u8D25",
      content: `\u7528\u6237 ${userId} \u7684\u4FE1\u606F\u83B7\u53D6 Agent \u6267\u884C\u5931\u8D25: ${errorMessage}`
    });
  }
}

// server/services/learningAgent.ts
async function generateLearningPlan(userId, category) {
  try {
    const categoryDescriptions = {
      web3: "\u533A\u5757\u94FE\u3001\u52A0\u5BC6\u8D27\u5E01\u3001DeFi\u3001NFT \u7B49 Web3 \u6280\u672F",
      us_stocks: "\u7F8E\u56FD\u80A1\u5E02\u57FA\u7840\u3001\u516C\u53F8\u5206\u6790\u3001\u6295\u8D44\u7B56\u7565",
      quantitative: "\u91CF\u5316\u6295\u8D44\u3001\u7B97\u6CD5\u4EA4\u6613\u3001\u6570\u636E\u5206\u6790"
    };
    const prompt = `
\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u6295\u8D44\u6559\u80B2\u4E13\u5BB6\u3002\u8BF7\u4E3A\u4E00\u4F4D\u521D\u5B66\u8005\u751F\u6210\u4E00\u4EFD\u5173\u4E8E"${categoryDescriptions[category]}"\u7684\u5B66\u4E60\u5185\u5BB9\u3002

\u8BF7\u751F\u6210\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
{
  "topic": "\u4ECA\u5929\u7684\u5B66\u4E60\u4E3B\u9898",
  "explanation": "\u8BE6\u7EC6\u7684\u6982\u5FF5\u89E3\u91CA\uFF08200-300\u5B57\uFF09",
  "caseStudy": "\u771F\u5B9E\u7684\u6848\u4F8B\u5206\u6790\uFF08200-300\u5B57\uFF09",
  "keyPoints": ["\u5173\u952E\u70B91", "\u5173\u952E\u70B92", "\u5173\u952E\u70B93", "\u5173\u952E\u70B94"],
  "resources": [
    {"title": "\u8D44\u6E90\u6807\u9898", "url": "https://example.com", "type": "article|video|course"},
    ...
  ],
  "nextTopic": "\u4E0B\u4E00\u4E2A\u5B66\u4E60\u4E3B\u9898\u7684\u5EFA\u8BAE"
}

\u8981\u6C42\uFF1A
1. \u5185\u5BB9\u5E94\u8BE5\u5FAA\u5E8F\u6E10\u8FDB\uFF0C\u4ECE\u57FA\u7840\u5230\u8FDB\u9636
2. \u5305\u542B\u5B9E\u9645\u7684\u4F8B\u5B50\u548C\u6848\u4F8B
3. \u8D44\u6E90\u5E94\u8BE5\u662F\u771F\u5B9E\u5B58\u5728\u7684\u3001\u9AD8\u8D28\u91CF\u7684
4. \u8BED\u8A00\u5E94\u8BE5\u6E05\u6670\u6613\u61C2

\u53EA\u8FD4\u56DE JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\u3002
    `;
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content = response.choices[0].message.content;
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      topic: result.topic || "\u672A\u77E5\u4E3B\u9898",
      category,
      explanation: result.explanation || "",
      caseStudy: result.caseStudy || "",
      keyPoints: result.keyPoints || [],
      resources: result.resources || [],
      nextTopic: result.nextTopic || ""
    };
  } catch (error) {
    console.error("Failed to generate learning plan:", error);
    throw error;
  }
}
function decideLearningCategory(dayOfWeek) {
  const categories = [
    "web3",
    "us_stocks",
    "quantitative"
  ];
  return categories[dayOfWeek % 3];
}
async function generateLearningSummary(plan) {
  try {
    const prompt = `
\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5B66\u4E60\u5185\u5BB9\u751F\u6210\u4E00\u4EFD\u7B80\u6D01\u7684\u5B66\u4E60\u603B\u7ED3\uFF08\u4E0D\u8D85\u8FC7 150 \u5B57\uFF09\u3002

\u4E3B\u9898: ${plan.topic}
\u7C7B\u522B: ${plan.category}

\u5173\u952E\u70B9:
${plan.keyPoints.map((p) => `- ${p}`).join("\n")}

\u8BF7\u63D0\u4F9B\uFF1A
1. \u4ECA\u65E5\u5B66\u4E60\u7684\u6838\u5FC3\u8981\u70B9
2. \u4E3A\u4EC0\u4E48\u8FD9\u5F88\u91CD\u8981
3. \u5982\u4F55\u5E94\u7528\u5230\u5B9E\u9645\u6295\u8D44\u4E2D
    `;
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to generate learning summary:", error);
    return "\u5B66\u4E60\u603B\u7ED3\u751F\u6210\u5931\u8D25";
  }
}
async function runLearningAgent(userId) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage = null;
  try {
    console.log(`[Learning Agent] Starting for user ${userId}`);
    const today = /* @__PURE__ */ new Date();
    const dayOfWeek = today.getDay();
    const category = decideLearningCategory(dayOfWeek);
    const todayStr = today.toISOString().split("T")[0];
    const existingContent = await getTodayLearningContent(userId, todayStr);
    if (existingContent) {
      console.log(`[Learning Agent] Learning content already exists for today`);
      return;
    }
    const plan = await generateLearningPlan(userId, category);
    itemsProcessed++;
    const summary = await generateLearningSummary(plan);
    await createLearningContent({
      userId,
      date: todayStr,
      topic: plan.topic,
      category,
      explanation: plan.explanation,
      caseStudy: plan.caseStudy,
      keyPoints: plan.keyPoints,
      resources: plan.resources,
      nextTopic: plan.nextTopic
    });
    await createSystemMessage({
      userId,
      messageType: "learning_task",
      title: `\u{1F4DA} \u4ECA\u65E5\u5B66\u4E60: ${plan.topic}`,
      content: summary,
      metadata: {
        category,
        keyPoints: plan.keyPoints
      }
    });
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "learning",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime
    });
    console.log(
      `[Learning Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Learning Agent] Error:", error);
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "learning",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime
    });
    await notifyOwner({
      title: "Learning Agent \u6267\u884C\u5931\u8D25",
      content: `\u7528\u6237 ${userId} \u7684\u5B66\u4E60 Agent \u6267\u884C\u5931\u8D25: ${errorMessage}`
    });
  }
}

// server/services/investmentAgent.ts
async function fetchMarketData(symbols, assetType) {
  try {
    const marketData = [];
    for (const symbol of symbols) {
      if (assetType === "crypto") {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
          );
          const data = await response.json();
          if (data[symbol.toLowerCase()]) {
            const priceData = data[symbol.toLowerCase()];
            marketData.push({
              symbol,
              assetType,
              currentPrice: priceData.usd || 0,
              change24h: priceData.usd_24h_change || 0,
              volume: 0,
              marketCap: priceData.usd_market_cap || 0
            });
          }
        } catch (error) {
          console.error(`Failed to fetch crypto data for ${symbol}:`, error);
        }
      } else {
        console.log(`US Stock data for ${symbol} requires API key`);
      }
    }
    return marketData;
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    return [];
  }
}
async function analyzeAndGenerateSignals(marketData) {
  try {
    const signals = [];
    for (const data of marketData) {
      const prompt = `
\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u6295\u8D44\u5206\u6790\u5E08\u3002\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5E02\u573A\u6570\u636E\u751F\u6210\u6295\u8D44\u5EFA\u8BAE\u3002

\u8D44\u4EA7: ${data.symbol} (${data.assetType})
\u5F53\u524D\u4EF7\u683C: $${data.currentPrice}
24\u5C0F\u65F6\u6DA8\u8DCC: ${data.change24h.toFixed(2)}%
\u5E02\u503C: $${data.marketCap || "N/A"}

\u8BF7\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A
{
  "signal": "buy" | "sell" | "hold" | "watch",
  "reason": "\u6295\u8D44\u5EFA\u8BAE\u7684\u539F\u56E0\uFF08100-150\u5B57\uFF09",
  "targetPrice": \u76EE\u6807\u4EF7\u683C,
  "stopLoss": \u6B62\u635F\u4EF7\u683C,
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0.0-1.0 \u4E4B\u95F4\u7684\u7F6E\u4FE1\u5EA6
}

\u8981\u6C42\uFF1A
1. \u57FA\u4E8E\u6280\u672F\u9762\u548C\u57FA\u672C\u9762\u5206\u6790
2. \u8003\u8651\u98CE\u9669\u56E0\u7D20
3. \u63D0\u4F9B\u5177\u4F53\u7684\u76EE\u6807\u4EF7\u683C\u548C\u6B62\u635F\u4EF7\u683C
4. \u7F6E\u4FE1\u5EA6\u5E94\u8BE5\u53CD\u6620\u5206\u6790\u7684\u786E\u5B9A\u6027

\u53EA\u8FD4\u56DE JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\u3002
      `;
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        });
        const content = response.choices[0].message.content;
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        const result = JSON.parse(contentStr);
        signals.push({
          symbol: data.symbol,
          assetType: data.assetType,
          signal: result.signal || "hold",
          reason: result.reason || "",
          targetPrice: result.targetPrice || data.currentPrice * 1.1,
          stopLoss: result.stopLoss || data.currentPrice * 0.9,
          riskLevel: result.riskLevel || "medium",
          confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1)
        });
      } catch (error) {
        console.error(`Failed to analyze ${data.symbol}:`, error);
      }
    }
    return signals;
  } catch (error) {
    console.error("Failed to generate signals:", error);
    return [];
  }
}
async function generateInvestmentReport(signals) {
  try {
    const buySignals = signals.filter((s) => s.signal === "buy");
    const sellSignals = signals.filter((s) => s.signal === "sell");
    const watchSignals = signals.filter((s) => s.signal === "watch");
    const prompt = `
\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u6295\u8D44\u4FE1\u53F7\u751F\u6210\u4E00\u4EFD\u7B80\u6D01\u7684\u6295\u8D44\u62A5\u544A\uFF08\u4E0D\u8D85\u8FC7 300 \u5B57\uFF09\u3002

\u4E70\u5165\u4FE1\u53F7 (${buySignals.length}):
${buySignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

\u5356\u51FA\u4FE1\u53F7 (${sellSignals.length}):
${sellSignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

\u89C2\u5BDF\u4FE1\u53F7 (${watchSignals.length}):
${watchSignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

\u8BF7\u63D0\u4F9B\uFF1A
1. \u4ECA\u65E5\u5E02\u573A\u6982\u89C8
2. \u4E3B\u8981\u6295\u8D44\u673A\u4F1A
3. \u98CE\u9669\u63D0\u793A
4. \u5EFA\u8BAE\u884C\u52A8
    `;
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to generate investment report:", error);
    return "\u6295\u8D44\u62A5\u544A\u751F\u6210\u5931\u8D25";
  }
}
async function runInvestmentAgent(userId) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage = null;
  try {
    console.log(`[Investment Agent] Starting for user ${userId}`);
    const portfolio2 = await getPortfolioByUser(userId);
    if (portfolio2.length === 0) {
      console.log(
        `[Investment Agent] No portfolio found for user ${userId}, skipping`
      );
      return;
    }
    const symbols = portfolio2.map((p) => p.symbol);
    const cryptoSymbols = symbols.filter(
      (s) => portfolio2.find((p) => p.symbol === s)?.assetType === "crypto"
    );
    const stockSymbols = symbols.filter(
      (s) => portfolio2.find((p) => p.symbol === s)?.assetType === "us_stock"
    );
    const cryptoData = await fetchMarketData(cryptoSymbols, "crypto");
    const stockData = await fetchMarketData(stockSymbols, "us_stock");
    const allMarketData = [...cryptoData, ...stockData];
    itemsProcessed = allMarketData.length;
    const signals = await analyzeAndGenerateSignals(allMarketData);
    for (const signal of signals) {
      try {
        await createInvestmentSignal({
          userId,
          symbol: signal.symbol,
          assetType: signal.assetType,
          signal: signal.signal,
          reason: signal.reason,
          targetPrice: signal.targetPrice.toString(),
          stopLoss: signal.stopLoss.toString(),
          riskLevel: signal.riskLevel,
          confidence: signal.confidence.toString()
        });
      } catch (error) {
        console.error(`Failed to save signal for ${signal.symbol}:`, error);
        itemsFailed++;
      }
    }
    const report = await generateInvestmentReport(signals);
    await createSystemMessage({
      userId,
      messageType: "investment_signal",
      title: "\u{1F4B0} \u6295\u8D44\u51B3\u7B56\u62A5\u544A",
      content: report,
      metadata: {
        signalCount: signals.length,
        buyCount: signals.filter((s) => s.signal === "buy").length,
        sellCount: signals.filter((s) => s.signal === "sell").length
      }
    });
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "investment",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime
    });
    console.log(
      `[Investment Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Investment Agent] Error:", error);
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "investment",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime
    });
    await notifyOwner({
      title: "Investment Agent \u6267\u884C\u5931\u8D25",
      content: `\u7528\u6237 ${userId} \u7684\u6295\u8D44 Agent \u6267\u884C\u5931\u8D25: ${errorMessage}`
    });
  }
}

// server/routes/alpha.ts
var alphaRouter = router({
  // ============================================
  // Information Agent Procedures
  // ============================================
  /**
   * 获取用户的所有文章
   */
  articles: protectedProcedure.input(
    z2.object({
      category: z2.string().optional(),
      limit: z2.number().default(50),
      offset: z2.number().default(0)
    })
  ).query(async ({ ctx, input }) => {
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
  summaries: protectedProcedure.input(
    z2.object({
      days: z2.number().default(7)
    })
  ).query(async ({ ctx, input }) => {
    return await getLatestDailySummaries(ctx.user.id, input.days);
  }),
  /**
   * 手动运行信息 Agent
   */
  runInformationAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
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
  learning: protectedProcedure.input(
    z2.object({
      limit: z2.number().default(50)
    })
  ).query(async ({ ctx, input }) => {
    return await getLearningContentByUser(ctx.user.id, input.limit);
  }),
  /**
   * 标记学习完成
   */
  markLearningComplete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
    await markLearningAsCompleted(input.id);
    return { success: true, message: "Learning marked as completed" };
  }),
  /**
   * 手动运行学习 Agent
   */
  runLearningAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
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
  signals: protectedProcedure.input(
    z2.object({
      limit: z2.number().default(50)
    })
  ).query(async ({ ctx, input }) => {
    return await getInvestmentSignalsByUser(ctx.user.id, input.limit);
  }),
  /**
   * 获取交易历史
   */
  trades: protectedProcedure.input(
    z2.object({
      limit: z2.number().default(100)
    })
  ).query(async ({ ctx, input }) => {
    return await getTradeHistoryByUser(ctx.user.id, input.limit);
  }),
  /**
   * 记录交易
   */
  recordTrade: protectedProcedure.input(
    z2.object({
      symbol: z2.string(),
      assetType: z2.enum(["us_stock", "crypto"]),
      tradeType: z2.enum(["buy", "sell"]),
      quantity: z2.number(),
      price: z2.number(),
      reason: z2.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const totalAmount = input.quantity * input.price;
    await createTradeRecord({
      userId: ctx.user.id,
      symbol: input.symbol,
      assetType: input.assetType,
      tradeType: input.tradeType,
      quantity: input.quantity.toString(),
      price: input.price.toString(),
      totalAmount: totalAmount.toString(),
      reason: input.reason
    });
    return { success: true, message: "Trade recorded" };
  }),
  /**
   * 手动运行投资 Agent
   */
  runInvestmentAgent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
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
  markMessageRead: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
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
  updatePreferences: protectedProcedure.input(
    z2.object({
      interests: z2.array(z2.string()).optional(),
      notificationEmail: z2.string().optional(),
      summaryTime: z2.string().optional(),
      learningTime: z2.string().optional(),
      investmentCheckTime: z2.string().optional(),
      timezone: z2.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    await upsertUserPreferences({
      userId: ctx.user.id,
      interests: input.interests,
      notificationEmail: input.notificationEmail,
      summaryTime: input.summaryTime,
      learningTime: input.learningTime,
      investmentCheckTime: input.investmentCheckTime,
      timezone: input.timezone
    });
    return { success: true, message: "Preferences updated" };
  }),
  // ============================================
  // Agent Execution Logs Procedures
  // ============================================
  /**
   * 获取 Agent 执行日志
   */
  agentLogs: protectedProcedure.input(
    z2.object({
      agentName: z2.string(),
      limit: z2.number().default(50)
    })
  ).query(async ({ ctx, input }) => {
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
    const articles2 = await getArticlesByUser(userId, 1);
    const summaries = await getLatestDailySummaries(userId, 1);
    const learning = await getLearningContentByUser(userId, 1);
    const portfolio2 = await getPortfolioByUser(userId);
    const signals = await getInvestmentSignalsByUser(userId, 1);
    const messages = await getUnreadMessages(userId);
    return {
      articlesCount: articles2.length,
      summariesCount: summaries.length,
      learningCount: learning.length,
      portfolioCount: portfolio2.length,
      signalsCount: signals.length,
      unreadMessagesCount: messages.length
    };
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  alpha: alphaRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
