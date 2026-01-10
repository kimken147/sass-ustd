import { Outlet } from "react-router";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-2xl font-bold">儀表板</h1>
        <p className="text-muted-foreground mt-2">歡迎來到平台管理後台</p>
        <Outlet />
      </div>
    </div>
  );
}
