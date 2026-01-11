/**
 * Investment Agent Service
 * 负责监控市场、生成投资信号和管理投资组合
 */

import { invokeLLM } from "../_core/llm";
import {
  createInvestmentSignal,
  getPortfolioByUser,
  createSystemMessage,
  logAgentExecution,
  getActiveInvestmentSignals,
} from "../db";
import { notifyOwner } from "../_core/notification";

interface MarketData {
  symbol: string;
  assetType: "us_stock" | "crypto";
  currentPrice: number;
  change24h: number;
  volume: number;
  marketCap?: number;
}

interface InvestmentSignal {
  symbol: string;
  assetType: "us_stock" | "crypto";
  signal: "buy" | "sell" | "hold" | "watch";
  reason: string;
  targetPrice: number;
  stopLoss: number;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
}

/**
 * 获取市场数据
 * 这是一个示例实现，实际使用需要集成真实的市场数据 API
 */
async function fetchMarketData(
  symbols: string[],
  assetType: "us_stock" | "crypto"
): Promise<MarketData[]> {
  try {
    // 示例：这里应该调用真实的 API
    // 如 Alpha Vantage (美股), CoinGecko (加密货币)
    const marketData: MarketData[] = [];

    for (const symbol of symbols) {
      if (assetType === "crypto") {
        // 示例：从 CoinGecko 获取加密货币数据
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
              marketCap: priceData.usd_market_cap || 0,
            });
          }
        } catch (error) {
          console.error(`Failed to fetch crypto data for ${symbol}:`, error);
        }
      } else {
        // 美股数据需要 API 密钥
        console.log(`US Stock data for ${symbol} requires API key`);
      }
    }

    return marketData;
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    return [];
  }
}

/**
 * 分析市场数据并生成投资信号
 */
async function analyzeAndGenerateSignals(
  marketData: MarketData[]
): Promise<InvestmentSignal[]> {
  try {
    const signals: InvestmentSignal[] = [];

    for (const data of marketData) {
      const prompt = `
你是一位专业的投资分析师。请基于以下市场数据生成投资建议。

资产: ${data.symbol} (${data.assetType})
当前价格: $${data.currentPrice}
24小时涨跌: ${data.change24h.toFixed(2)}%
市值: $${data.marketCap || "N/A"}

请返回一个 JSON 对象：
{
  "signal": "buy" | "sell" | "hold" | "watch",
  "reason": "投资建议的原因（100-150字）",
  "targetPrice": 目标价格,
  "stopLoss": 止损价格,
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0.0-1.0 之间的置信度
}

要求：
1. 基于技术面和基本面分析
2. 考虑风险因素
3. 提供具体的目标价格和止损价格
4. 置信度应该反映分析的确定性

只返回 JSON，不要其他内容。
      `;

      try {
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

        signals.push({
          symbol: data.symbol,
          assetType: data.assetType,
          signal: result.signal || "hold",
          reason: result.reason || "",
          targetPrice: result.targetPrice || data.currentPrice * 1.1,
          stopLoss: result.stopLoss || data.currentPrice * 0.9,
          riskLevel: result.riskLevel || "medium",
          confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
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

/**
 * 生成投资报告
 */
async function generateInvestmentReport(
  signals: InvestmentSignal[]
): Promise<string> {
  try {
    const buySignals = signals.filter((s) => s.signal === "buy");
    const sellSignals = signals.filter((s) => s.signal === "sell");
    const watchSignals = signals.filter((s) => s.signal === "watch");

    const prompt = `
请基于以下投资信号生成一份简洁的投资报告（不超过 300 字）。

买入信号 (${buySignals.length}):
${buySignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

卖出信号 (${sellSignals.length}):
${sellSignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

观察信号 (${watchSignals.length}):
${watchSignals.map((s) => `- ${s.symbol}: ${s.reason}`).join("\n")}

请提供：
1. 今日市场概览
2. 主要投资机会
3. 风险提示
4. 建议行动
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
    console.error("Failed to generate investment report:", error);
    return "投资报告生成失败";
  }
}

/**
 * 运行投资 Agent
 */
export async function runInvestmentAgent(userId: number): Promise<void> {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let errorMessage: string | null = null;

  try {
    console.log(`[Investment Agent] Starting for user ${userId}`);

    // 获取用户的投资组合
    const portfolio = await getPortfolioByUser(userId);

    if (portfolio.length === 0) {
      console.log(
        `[Investment Agent] No portfolio found for user ${userId}, skipping`
      );
      return;
    }

    // 提取符号
    const symbols = portfolio.map((p) => p.symbol);
    const cryptoSymbols = symbols.filter(
      (s) => portfolio.find((p) => p.symbol === s)?.assetType === "crypto"
    );
    const stockSymbols = symbols.filter(
      (s) => portfolio.find((p) => p.symbol === s)?.assetType === "us_stock"
    );

    // 获取市场数据
    const cryptoData = await fetchMarketData(cryptoSymbols, "crypto");
    const stockData = await fetchMarketData(stockSymbols, "us_stock");
    const allMarketData = [...cryptoData, ...stockData];

    itemsProcessed = allMarketData.length;

    // 生成投资信号
    const signals = await analyzeAndGenerateSignals(allMarketData);

    // 保存投资信号
    for (const signal of signals) {
      try {
        await createInvestmentSignal({
          userId,
          symbol: signal.symbol,
          assetType: signal.assetType,
          signal: signal.signal,
          reason: signal.reason,
          targetPrice: signal.targetPrice.toString() as any,
          stopLoss: signal.stopLoss.toString() as any,
          riskLevel: signal.riskLevel,
          confidence: signal.confidence.toString() as any,
        });
      } catch (error) {
        console.error(`Failed to save signal for ${signal.symbol}:`, error);
        itemsFailed++;
      }
    }

    // 生成投资报告
    const report = await generateInvestmentReport(signals);

    // 创建系统消息
    await createSystemMessage({
      userId,
      messageType: "investment_signal",
      title: "💰 投资决策报告",
      content: report,
      metadata: {
        signalCount: signals.length,
        buyCount: signals.filter((s) => s.signal === "buy").length,
        sellCount: signals.filter((s) => s.signal === "sell").length,
      } as any,
    });

    // 记录执行日志
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "investment",
      status: "success",
      itemsProcessed,
      itemsFailed,
      executionTime,
    });

    console.log(
      `[Investment Agent] Completed for user ${userId} in ${executionTime}ms`
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Investment Agent] Error:", error);

    // 记录失败的执行
    const executionTime = Date.now() - startTime;
    await logAgentExecution({
      userId,
      agentName: "investment",
      status: "failed",
      itemsProcessed,
      itemsFailed,
      errorMessage,
      executionTime,
    });

    // 通知所有者
    await notifyOwner({
      title: "Investment Agent 执行失败",
      content: `用户 ${userId} 的投资 Agent 执行失败: ${errorMessage}`,
    });
  }
}
