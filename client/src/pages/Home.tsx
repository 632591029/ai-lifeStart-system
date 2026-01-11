import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, BarChart3, Brain, Code, Eye, Layers, Terminal, Zap } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 模拟数据
const agentActivityData = [
  { name: "00:00", nox: 12, email: 5, health: 8 },
  { name: "04:00", nox: 8, email: 2, health: 95 },
  { name: "08:00", nox: 45, email: 80, health: 15 },
  { name: "12:00", nox: 65, email: 45, health: 20 },
  { name: "16:00", nox: 55, email: 30, health: 10 },
  { name: "20:00", nox: 30, email: 10, health: 5 },
];

const efficiencyData = [
  { name: "人工处理", value: 100, color: "#333" },
  { name: "Agent 辅助", value: 850, color: "var(--primary)" },
];

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header / Status Bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-primary">
            <Terminal className="h-4 w-4" />
            <span>MOLLY_AGENT_RESEARCH_V1.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="hidden sm:inline-block">STATUS: ONLINE</span>
            <span className="hidden sm:inline-block">UPTIME: 99.9%</span>
            <span className="animate-pulse text-primary">● LIVE</span>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-12">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter font-mono">
              THE PERSONAL <br />
              <span className="text-primary">PANOPTICON</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              深度解析 Molly Cantillon 如何利用 AI Agent 构建"生活操作系统"，将不可见变为可见，从被动应对转向主动掌控。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cyber-card group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground group-hover:text-primary transition-colors">核心理念</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">反转全景监控</div>
                <p className="text-xs text-muted-foreground mt-1">塔楼属于你，而不是监视者</p>
              </CardContent>
            </Card>
            <Card className="cyber-card group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground group-hover:text-primary transition-colors">技术架构</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8个并行 Agent</div>
                <p className="text-xs text-muted-foreground mt-1">独立运作，显式交接</p>
              </CardContent>
            </Card>
            <Card className="cyber-card group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground group-hover:text-primary transition-colors">关键价值</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">主动性 (Proactivity)</div>
                <p className="text-xs text-muted-foreground mt-1">从"等待指令"到"预测需求"</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px] bg-muted/50 p-1">
            <TabsTrigger value="overview" className="font-mono text-xs">概览</TabsTrigger>
            <TabsTrigger value="architecture" className="font-mono text-xs">系统架构</TabsTrigger>
            <TabsTrigger value="philosophy" className="font-mono text-xs">设计哲学</TabsTrigger>
            <TabsTrigger value="takeaways" className="font-mono text-xs">实践启示</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  从盲目到可见
                </h2>
                <div className="prose prose-invert max-w-none text-muted-foreground">
                  <p>
                    Molly 提出了一个深刻的观察：我们是历史上被测量最多的人类，但对自己却最不透明。数千条消息分散在二十个收件箱。通知让你永久处于勿扰状态。
                  </p>
                  <blockquote className="border-l-2 border-primary pl-4 italic text-foreground my-4">
                    "你是历史上被测量最多的人，但对自己却最不透明... 一个全景监控，但塔楼属于你。"
                  </blockquote>
                  <p>
                    她的解决方案不是另一个待办事项应用，而是一个完整的"生活操作系统"，通过 AI agent 持续监控、分析并代表她采取行动。
                  </p>
                </div>
                
                <div className="bg-card border border-border p-6 rounded-lg">
                  <h3 className="text-sm font-mono text-muted-foreground mb-4">效率对比模拟</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={efficiencyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fill: 'var(--muted-foreground)', fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)'}}
                          cursor={{fill: 'var(--muted)/20'}}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {efficiencyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">处理信息量 / 单位时间</p>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  产品演进路径
                </h2>
                <div className="relative border-l border-border ml-3 space-y-8 py-2">
                  <div className="ml-6 relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background"></span>
                    <h3 className="font-bold text-lg">阶段 1: 硬件思维 (NOX V1)</h3>
                    <p className="text-sm text-muted-foreground mt-1">腕戴式录音设备。试图捕捉一切。</p>
                    <div className="mt-2 text-xs bg-destructive/20 text-destructive px-2 py-1 inline-block rounded">失败教训: 硬件过热，电池耗尽</div>
                  </div>
                  <div className="ml-6 relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background"></span>
                    <h3 className="font-bold text-lg">阶段 2: 软件转型</h3>
                    <p className="text-sm text-muted-foreground mt-1">利用 OpenAI 模型。从"记录"转向"行动"。</p>
                    <div className="mt-2 text-xs bg-primary/20 text-primary px-2 py-1 inline-block rounded">关键洞察: 价值在于代表用户执行</div>
                  </div>
                  <div className="ml-6 relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-primary shadow-[0_0_10px_var(--primary)]"></span>
                    <h3 className="font-bold text-lg">阶段 3: 个人全景监控</h3>
                    <p className="text-sm text-muted-foreground mt-1">8个并行 Agent。生活操作系统。</p>
                    <div className="mt-2 text-xs bg-primary/20 text-primary px-2 py-1 inline-block rounded">当前状态: 全面自动化</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  系统拓扑图
                </h2>
                <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['~/nox', '~/metrics', '~/email', '~/growth', '~/trades', '~/health', '~/writing', '~/personal'].map((agent) => (
                      <div key={agent} className="border border-border bg-background/50 p-4 rounded flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-default group">
                        <Terminal className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="font-mono text-sm font-bold">{agent}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Active</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 border-t border-border pt-6">
                    <h3 className="font-mono text-sm font-bold mb-4">系统活动监控 (模拟)</h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={agentActivityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)'}}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="nox" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                          <Line type="monotone" dataKey="email" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="health" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  技术栈解密
                </h2>
                <div className="space-y-4">
                  <Card className="cyber-card">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-mono">核心引擎</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 text-sm text-muted-foreground">
                      Claude Code (Anthropic) + OpenAI Models
                    </CardContent>
                  </Card>
                  <Card className="cyber-card">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-mono">状态管理</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 text-sm text-muted-foreground">
                      文件系统 (File System) - 简单、持久、可读
                    </CardContent>
                  </Card>
                  <Card className="cyber-card">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-mono">自动化策略</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 text-sm text-muted-foreground">
                      API 优先 → 降级为桌面 UI 自动化 (注入鼠标/键盘事件)
                    </CardContent>
                  </Card>
                  <Card className="cyber-card">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-mono">保持唤醒</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 text-sm text-muted-foreground">
                      <code>caffeinate -i</code> + Cron Jobs
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Philosophy Tab */}
          <TabsContent value="philosophy" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="cyber-card border-primary/50">
                <CardHeader>
                  <CardTitle className="font-mono text-primary">01. 可见性 (Legibility)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    可见性是治理的前提。如果你看不见自己的数据，你就无法管理自己的生活。
                  </p>
                  <div className="bg-muted/30 p-4 rounded border border-border font-mono text-xs">
                    &gt; 整合所有数据源<br/>
                    &gt; 建立统一本体论<br/>
                    &gt; 使数据可查询
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardHeader>
                  <CardTitle className="font-mono">02. 主动性 (Proactivity)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    真正的 Agent 不等待指令。它观察、预测并行动。
                  </p>
                  <div className="flex justify-between items-center text-xs font-mono mt-4">
                    <span className="text-muted-foreground">被动助手</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-primary font-bold">主动 Agent</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="cyber-card">
                <CardHeader>
                  <CardTitle className="font-mono">03. 元认知 (Meta-cognition)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    人类应该在循环中，但不是在执行层，而是在元层级。
                  </p>
                  <p className="text-sm italic">
                    "与简报争论数天，注意到指标何时变成了游戏。"
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card">
                <CardHeader>
                  <CardTitle className="font-mono">04. 生产性不可读性</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    并非一切都需要被优化。保留"暗光纤"——那些未被测量的自我部分。
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Takeaways Tab */}
          <TabsContent value="takeaways" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                如何构建你自己的系统
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary/20 font-mono">01</div>
                  <h3 className="font-bold">从痛点开始</h3>
                  <p className="text-sm text-muted-foreground">不要为了 AI 而 AI。Molly 从解决自己的消息过载开始 (RPLY)。</p>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary/20 font-mono">02</div>
                  <h3 className="font-bold">降级策略</h3>
                  <p className="text-sm text-muted-foreground">API 是首选，但如果不存在，不要放弃——使用 UI 自动化。</p>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary/20 font-mono">03</div>
                  <h3 className="font-bold">降低门槛</h3>
                  <p className="text-sm text-muted-foreground">Molly 为父母设置了简单的 `c` 命令。自然语言是最好的界面。</p>
                </div>
              </div>

              <div className="mt-12 p-6 border border-primary/30 bg-primary/5 rounded-lg">
                <h3 className="font-mono font-bold text-primary mb-2">未来展望</h3>
                <p className="text-muted-foreground">
                  Molly 的系统代表了一个趋势：从应用程序到操作系统。未来的个人计算不再是"打开不同的应用程序"，而是"告诉 AI 你想要什么，它协调所有必要的系统来实现"。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur py-8 mt-12">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground font-mono">
            RESEARCHED & BUILT BY MANUS
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" size="sm" className="text-xs font-mono" onClick={() => window.open('https://x.com/mollycantillon', '_blank')}>
              SOURCE: @MOLLYCANTILLON
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
