import { useEffect } from "react";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";

export default function DashboardPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "仪表板 - 租户管理后台";
  }, []);
  return (
    <ListView>
      <ListViewHeader title="仪表板" />
      <Card>
        <CardHeader>
          <CardTitle>欢迎使用租户管理后台</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            这里将显示租户的数据统计和管理功能。
          </p>
        </CardContent>
      </Card>
    </ListView>
  );
}
