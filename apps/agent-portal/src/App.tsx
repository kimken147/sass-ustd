import { useState, useEffect } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
  CatchAllNavigate,
} from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { authProvider } from "./providers/authProvider";
import { dataProvider } from "./providers/dataProvider";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { Toaster } from "./components/refine-ui/notification/toaster";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WalletPage from "./pages/WalletPage";
import SubAgentsPage from "./pages/SubAgentsPage";
import CreateSubAgentPage from "./pages/CreateSubAgentPage";
import EditSubAgentPage from "./pages/EditSubAgentPage";
import DashboardLayout from "./layouts/DashboardLayout";
import { TenantContext, createTenantApiClient } from "@saas-platform/api-client";

const platformApiUrl = import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
const tenantApiUrl = import.meta.env.VITE_TENANT_API_URL || "http://localhost:3001";

// 建立 QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. 初始化租戶 Context
        await TenantContext.init(platformApiUrl);

        // 2. 初始化 API 客戶端
        createTenantApiClient(tenantApiUrl);

        setReady(true);
      } catch (err) {
        console.error('Failed to initialize tenant:', err);
        setError(err instanceof Error ? err.message : 'Failed to identify tenant');
      }
    };

    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">無法識別租戶</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-gray-500 mt-2 text-sm">
            請確認域名設定正確，或聯繫系統管理員。
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          notificationProvider={useNotificationProvider()}
          resources={[
            {
              name: "dashboard",
              list: "/",
              meta: {
                label: "仪表板",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                ),
              },
            },
            {
              name: "wallet",
              list: "/wallet",
              meta: {
                label: "收款钱包",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="12" x="2" y="6" rx="2" />
                    <circle cx="16" cy="12" r="1" />
                  </svg>
                ),
              },
            },
            {
              name: "sub-agents",
              list: "/sub-agents",
              create: "/sub-agents/create",
              edit: "/sub-agents/edit/:id",
              meta: {
                label: "下级代理",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
              },
            },
          ]}
          options={{
            syncWithLocation: true,
            // 設置應用標題和圖標（用於 Sidebar Header）
            title: {
              text: "代理商后台",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
          }}
        >
          <Routes>
            <Route
              element={
                <Authenticated
                  key="authenticated-layout"
                  fallback={<CatchAllNavigate to="/login" />}
                >
                  <Outlet />
                </Authenticated>
              }
            >
              <Route element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/sub-agents" element={<SubAgentsPage />} />
                <Route
                  path="/sub-agents/create"
                  element={<CreateSubAgentPage />}
                />
                <Route
                  path="/sub-agents/edit/:id"
                  element={<EditSubAgentPage />}
                />
                {/* 其他路由將在後續添加 */}
              </Route>
            </Route>
            <Route
              element={
                <Authenticated key="authenticated-auth" fallback={<Outlet />}>
                  <Navigate to="/" />
                </Authenticated>
              }
            >
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
          <UnsavedChangesNotifier />
          <DocumentTitleHandler />
        </Refine>
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
