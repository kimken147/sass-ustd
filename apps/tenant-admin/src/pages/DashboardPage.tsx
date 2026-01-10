import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";

export default function DashboardPage() {
  return (
    <ListView>
      <ListViewHeader title="儀表板" />
      <Card>
        <CardHeader>
          <CardTitle>歡迎使用租戶管理後台</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            這裡將顯示租戶的數據統計和管理功能。
          </p>
        </CardContent>
      </Card>
    </ListView>
  );
}
