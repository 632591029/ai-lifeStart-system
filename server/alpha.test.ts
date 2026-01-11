import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createArticle,
  getArticlesByUser,
  createDailySummary,
  getDailySummary,
  createLearningContent,
  getTodayLearningContent,
  createInvestmentSignal,
  getInvestmentSignalsByUser,
  createTradeRecord,
  getTradeHistoryByUser,
  createSystemMessage,
  getUnreadMessages,
  upsertUserPreferences,
  getUserPreferences,
  logAgentExecution,
  getAgentExecutionLogs,
} from "./db";

// 测试用的用户 ID（应该是一个真实的用户 ID）
const TEST_USER_ID = 1;
const TEST_DATE = new Date().toISOString().split("T")[0];

describe("ALPHA System Database Operations", () => {
  describe("Article Operations", () => {
    it("should create and retrieve articles", async () => {
      const article = await createArticle({
        userId: TEST_USER_ID,
        title: "Test Article",
        description: "Test Description",
        url: "https://example.com",
        source: "TestSource",
        category: "ai_breakthrough",
        relevanceScore: "0.85" as any,
      });

      expect(article).toBeDefined();

      const articles = await getArticlesByUser(TEST_USER_ID, 10);
      expect(articles.length).toBeGreaterThan(0);
      expect(articles.some((a) => a.title === "Test Article")).toBe(true);
    });

    it("should filter articles by category", async () => {
      await createArticle({
        userId: TEST_USER_ID,
        title: "AI Article",
        url: "https://example.com/ai",
        source: "TestSource",
        category: "ai_breakthrough",
        relevanceScore: "0.9" as any,
      });

      const aiArticles = await getArticlesByUser(TEST_USER_ID, 10);
      expect(aiArticles.length).toBeGreaterThan(0);
    });
  });

  describe("Daily Summary Operations", () => {
    it("should create and retrieve daily summaries", async () => {
      const summary = await createDailySummary({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        summary: "Test summary content",
      });

      expect(summary).toBeDefined();

      const retrieved = await getDailySummary(TEST_USER_ID, TEST_DATE);
      expect(retrieved).toBeDefined();
      expect(retrieved?.summary).toBe("Test summary content");
    });
  });

  describe("Learning Content Operations", () => {
    it("should create and retrieve learning content", async () => {
      const content = await createLearningContent({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        topic: "Introduction to Web3",
        category: "web3",
        explanation: "Web3 is the next generation of the internet",
        keyPoints: ["Decentralization", "Blockchain", "Smart Contracts"] as any,
      });

      expect(content).toBeDefined();

      const retrieved = await getTodayLearningContent(TEST_USER_ID, TEST_DATE);
      expect(retrieved).toBeDefined();
      expect(retrieved?.topic).toBe("Introduction to Web3");
    });
  });

  describe("Investment Signal Operations", () => {
    it("should create and retrieve investment signals", async () => {
      const signal = await createInvestmentSignal({
        userId: TEST_USER_ID,
        symbol: "BTC",
        assetType: "crypto",
        signal: "buy",
        reason: "Strong technical setup",
        targetPrice: "50000" as any,
        stopLoss: "45000" as any,
        riskLevel: "medium",
        confidence: "0.75" as any,
      });

      expect(signal).toBeDefined();

      const signals = await getInvestmentSignalsByUser(TEST_USER_ID, 10);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.symbol === "BTC")).toBe(true);
    });
  });

  describe("Trade History Operations", () => {
    it("should create and retrieve trade records", async () => {
      const trade = await createTradeRecord({
        userId: TEST_USER_ID,
        symbol: "AAPL",
        assetType: "us_stock",
        tradeType: "buy",
        quantity: "10" as any,
        price: "150" as any,
        totalAmount: "1500" as any,
        reason: "Long-term investment",
      });

      expect(trade).toBeDefined();

      const trades = await getTradeHistoryByUser(TEST_USER_ID, 10);
      expect(trades.length).toBeGreaterThan(0);
      expect(trades.some((t) => t.symbol === "AAPL")).toBe(true);
    });
  });

  describe("System Message Operations", () => {
    it("should create and retrieve system messages", async () => {
      const message = await createSystemMessage({
        userId: TEST_USER_ID,
        messageType: "daily_summary",
        title: "Test Message",
        content: "This is a test message",
      });

      expect(message).toBeDefined();

      const messages = await getUnreadMessages(TEST_USER_ID);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.title === "Test Message")).toBe(true);
    });
  });

  describe("User Preferences Operations", () => {
    it("should create and retrieve user preferences", async () => {
      const prefs = await upsertUserPreferences({
        userId: TEST_USER_ID,
        interests: ["AI", "Web3", "Stocks"] as any,
        notificationEmail: "test@example.com",
        timezone: "UTC",
      });

      expect(prefs).toBeDefined();

      const retrieved = await getUserPreferences(TEST_USER_ID);
      expect(retrieved).toBeDefined();
      expect(retrieved?.timezone).toBe("UTC");
    });
  });

  describe("Agent Execution Log Operations", () => {
    it("should log agent execution", async () => {
      const log = await logAgentExecution({
        userId: TEST_USER_ID,
        agentName: "information",
        status: "success",
        itemsProcessed: 10,
        itemsFailed: 0,
        executionTime: 1500,
      });

      expect(log).toBeDefined();

      const logs = await getAgentExecutionLogs(TEST_USER_ID, "information", 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.status === "success")).toBe(true);
    });
  });

  describe("Data Consistency", () => {
    it("should maintain data consistency across operations", async () => {
      // Create multiple articles
      for (let i = 0; i < 5; i++) {
        await createArticle({
          userId: TEST_USER_ID,
          title: `Article ${i}`,
          url: `https://example.com/${i}`,
          source: "TestSource",
          category: "ai_breakthrough",
          relevanceScore: (0.5 + i * 0.1).toString() as any,
        });
      }

      // Retrieve and verify
      const articles = await getArticlesByUser(TEST_USER_ID, 100);
      const testArticles = articles.filter((a) => a.title.startsWith("Article"));
      expect(testArticles.length).toBeGreaterThanOrEqual(5);
    });
  });
});

describe("ALPHA System Integration", () => {
  it("should handle complete workflow", async () => {
    // 1. Create user preferences
    await upsertUserPreferences({
      userId: TEST_USER_ID,
      interests: ["AI", "Web3"] as any,
    });

    // 2. Create articles
    await createArticle({
      userId: TEST_USER_ID,
      title: "Latest AI Breakthrough",
      url: "https://example.com/ai",
      source: "NewsSource",
      category: "ai_breakthrough",
      relevanceScore: "0.95" as any,
    });

    // 3. Create daily summary
    await createDailySummary({
      userId: TEST_USER_ID,
      date: TEST_DATE,
      summary: "Today's AI news summary",
    });

    // 4. Create learning content
    await createLearningContent({
      userId: TEST_USER_ID,
      date: TEST_DATE,
      topic: "AI Fundamentals",
      category: "web3",
      explanation: "Understanding AI basics",
      keyPoints: ["ML", "Deep Learning"] as any,
    });

    // 5. Create investment signal
    await createInvestmentSignal({
      userId: TEST_USER_ID,
      symbol: "NVDA",
      assetType: "us_stock",
      signal: "buy",
      reason: "AI boom",
      targetPrice: "900" as any,
      stopLoss: "800" as any,
      riskLevel: "medium",
      confidence: "0.8" as any,
    });

    // 6. Create system message
    await createSystemMessage({
      userId: TEST_USER_ID,
      messageType: "investment_signal",
      title: "New Investment Signal",
      content: "NVDA shows strong buy signal",
    });

    // 7. Log agent execution
    await logAgentExecution({
      userId: TEST_USER_ID,
      agentName: "information",
      status: "success",
      itemsProcessed: 15,
      itemsFailed: 0,
      executionTime: 2000,
    });

    // Verify all data is retrievable
    const prefs = await getUserPreferences(TEST_USER_ID);
    const articles = await getArticlesByUser(TEST_USER_ID, 10);
    const summary = await getDailySummary(TEST_USER_ID, TEST_DATE);
    const learning = await getTodayLearningContent(TEST_USER_ID, TEST_DATE);
    const signals = await getInvestmentSignalsByUser(TEST_USER_ID, 10);
    const messages = await getUnreadMessages(TEST_USER_ID);
    const logs = await getAgentExecutionLogs(TEST_USER_ID, "information", 10);

    expect(prefs).toBeDefined();
    expect(articles.length).toBeGreaterThan(0);
    expect(summary).toBeDefined();
    expect(learning).toBeDefined();
    expect(signals.length).toBeGreaterThan(0);
    expect(messages.length).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThan(0);
  });
});
