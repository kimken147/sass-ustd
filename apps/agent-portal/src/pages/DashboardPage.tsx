import { useList } from "@refinedev/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas-platform/ui";
import { Users, TrendingUp, DollarSign, UserPlus } from "lucide-react";

export default function DashboardPage() {
  // 獲取統計數據（這裡使用示例數據，後續可以從 API 獲取）
  const { data: statsData } = useList({
    resource: "agents/stats",
    queryOptions: {
      enabled: false, // 暫時禁用，等待 API 實現
    },
  });

  const stats = [
    {
      title: "總客戶數",
      value: "0",
      description: "所有下級客戶總數",
      icon: Users,
      trend: "+0%",
    },
    {
      title: "活躍客戶",
      value: "0",
      description: "本月活躍客戶數",
      icon: UserPlus,
      trend: "+0%",
    },
    {
      title: "總佣金",
      value: "NT$ 0",
      description: "累計獲得佣金",
      icon: DollarSign,
      trend: "+0%",
    },
    {
      title: "本月佣金",
      value: "NT$ 0",
      description: "本月獲得佣金",
      icon: TrendingUp,
      trend: "+0%",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">儀表板</h1>
        <p className="text-muted-foreground">
          查看您的代理數據和統計信息
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">{stat.trend}</span> 較上月
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 其他內容區域 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近活動</CardTitle>
            <CardDescription>查看最近的系統活動</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              暫無活動記錄
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              功能開發中...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
