import { Refine, Authenticated } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
  CatchAllNavigate,
} from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useTranslation } from "react-i18next";
import { authProvider } from "./providers/authProvider";
import { dataProvider } from "./providers/dataProvider";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { Toaster } from "./components/refine-ui/notification/toaster";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CreateSitePage from "./pages/CreateSitePage";
import WalletsPage from "./pages/WalletsPage";
import CreateWalletPage from "./pages/CreateWalletPage";
import DashboardLayout from "./layouts/DashboardLayout";
import { createPlatformApiClient } from "@saas-platform/api-client";
import "./i18n";

// 初始化 API 客户端
const apiUrl = import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
createPlatformApiClient(apiUrl);

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
  const { i18n, t } = useTranslation();

  const i18nProvider = {
    translate: (key: string, params?: any, defaultMessage?: string) => {
      const result = t(key, { ...params, defaultValue: defaultMessage || key });
      return result as string;
    },
    changeLocale: (lang: string) => {
      i18n.changeLanguage(lang);
      return Promise.resolve();
    },
    getLocale: () => {
      return i18n.language;
    },
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          notificationProvider={useNotificationProvider()}
          i18nProvider={i18nProvider}
          resources={[
            {
              name: "sites",
              list: "/",
              create: "/sites/create",
              meta: {
                label: "站点列表",
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
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
              },
            },
            {
              name: "wallets",
              list: "/wallets",
              create: "/wallets/create",
              meta: {
                label: "钱包管理",
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
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            // 设置应用标题和图标（用于 Sidebar Header）
            title: {
              text: "系统商后台",
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
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M12 8v8" />
                  <path d="m8 12 4-4 4 4" />
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
                <Route path="/sites/create" element={<CreateSitePage />} />
                <Route path="/wallets" element={<WalletsPage />} />
                <Route path="/wallets/create" element={<CreateWalletPage />} />
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
