import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // 获取系统状态
  const statusQuery = trpc.alpha.status.useQuery();

  // 获取消息
  const messagesQuery = trpc.alpha.messages.useQuery();

  // 获取摘要
  const summariesQuery = trpc.alpha.summaries.useQuery({ days: 7 });

  // 获取学习内容
  const learningQuery = trpc.alpha.learning.useQuery({ limit: 5 });

  // 获取投资信号
  const signalsQuery = trpc.alpha.signals.useQuery({ limit: 10 });

  // 获取投资组合
  const portfolioQuery = trpc.alpha.portfolio.useQuery();

  // Agent 运行 mutations
  const runInfoAgent = trpc.alpha.runInformationAgent.useMutation();
  const runLearningAgent = trpc.alpha.runLearningAgent.useMutation();
  const runInvestmentAgent = trpc.alpha.runInvestmentAgent.useMutation();

  // 标记消息为已读
  const markMessageRead = trpc.alpha.markMessageRead.useMutation();

  const handleRunAgent = async (agentType: "information" | "learning" | "investment") => {
    try {
      if (agentType === "information") {
        await runInfoAgent.mutateAsync();
      } else if (agentType === "learning") {
        await runLearningAgent.mutateAsync();
      } else if (agentType === "investment") {
        await runInvestmentAgent.mutateAsync();
      }
    } catch (error) {
      console.error("Failed to run agent:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ALPHA System</h1>
          <p className="text-slate-400">Your AI-powered life management system</p>
        </div>

        {/* Status Overview */}
        {statusQuery.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.articlesCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.summariesCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.learningCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.portfolioCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.signalsCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statusQuery.data.unreadMessagesCount}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="information">📰 Information</TabsTrigger>
            <TabsTrigger value="learning">📚 Learning</TabsTrigger>
            <TabsTrigger value="investment">💰 Investment</TabsTrigger>
            <TabsTrigger value="messages">💬 Messages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Information Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Automatically fetch and categorize information from multiple sources
                  </p>
                  <Button
                    onClick={() => handleRunAgent("information")}
                    disabled={runInfoAgent.isPending}
                    className="w-full"
                  >
                    {runInfoAgent.isPending ? "Running..." : "Run Now"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Learning Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Generate daily learning content for Web3, US Stocks, and Quantitative Trading
                  </p>
                  <Button
                    onClick={() => handleRunAgent("learning")}
                    disabled={runLearningAgent.isPending}
                    className="w-full"
                  >
                    {runLearningAgent.isPending ? "Running..." : "Run Now"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Investment Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Monitor markets and generate investment signals
                  </p>
                  <Button
                    onClick={() => handleRunAgent("investment")}
                    disabled={runInvestmentAgent.isPending}
                    className="w-full"
                  >
                    {runInvestmentAgent.isPending ? "Running..." : "Run Now"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Information Tab */}
          <TabsContent value="information" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Latest Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                {summariesQuery.data && summariesQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {summariesQuery.data.map((summary: any) => (
                      <div key={summary.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="text-sm text-slate-400 mb-2">{summary.date}</div>
                        <p className="text-white text-sm line-clamp-3">{summary.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No summaries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Tab */}
          <TabsContent value="learning" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Learning Content</CardTitle>
              </CardHeader>
              <CardContent>
                {learningQuery.data && learningQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {learningQuery.data.map((content: any) => (
                      <div key={content.id} className="border border-slate-700 rounded p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-white font-semibold">{content.topic}</h3>
                          <Badge variant="outline" className="text-slate-300">
                            {content.category}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm mb-3">{content.explanation}</p>
                        <div className="text-xs text-slate-500">{content.date}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No learning content yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investment Tab */}
          <TabsContent value="investment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  {portfolioQuery.data && portfolioQuery.data.length > 0 ? (
                    <div className="space-y-3">
                      {portfolioQuery.data.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-slate-700 pb-2">
                          <div>
                            <div className="text-white font-semibold">{item.symbol}</div>
                            <div className="text-xs text-slate-400">{item.assetType}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white">${item.totalValue}</div>
                            <div className={`text-xs ${(item.gainLossPercent as any) > 0 ? "text-green-400" : "text-red-400"}`}>
                              {(item.gainLossPercent as any) > 0 ? "+" : ""}{item.gainLossPercent}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No portfolio items</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Investment Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  {signalsQuery.data && signalsQuery.data.length > 0 ? (
                    <div className="space-y-3">
                      {signalsQuery.data.slice(0, 5).map((signal: any) => (
                        <div key={signal.id} className="border-l-4 border-green-500 pl-3 py-2">
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-white font-semibold">{signal.symbol}</div>
                            <Badge
                              variant="outline"
                              className={
                                signal.signal === "buy"
                                  ? "text-green-400"
                                  : signal.signal === "sell"
                                    ? "text-red-400"
                                    : "text-yellow-400"
                              }
                            >
                              {signal.signal.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{signal.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No signals yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Unread Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {messagesQuery.data && messagesQuery.data.length > 0 ? (
                  <div className="space-y-3">
                    {messagesQuery.data.map((message: any) => (
                      <div
                        key={message.id}
                        className="border border-slate-700 rounded p-3 hover:bg-slate-700/50 transition cursor-pointer"
                        onClick={() => markMessageRead.mutate({ id: message.id })}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-white font-semibold">{message.title}</h3>
                          <Badge variant="outline" className="text-slate-300 text-xs">
                            {message.messageType}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-2">{message.content}</p>
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(message.sentAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No unread messages</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
