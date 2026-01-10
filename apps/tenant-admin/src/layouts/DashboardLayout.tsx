import { Outlet } from "react-router";
import { Layout } from "@saas-platform/ui";

/**
 * DashboardLayout - 使用 Refine 官方的 Layout 01 組件
 *
 * 這個組件已經包含了：
 * - 側邊欄導航（使用 Refine 的 useMenu hook）
 * - 頂部標頭（用戶信息、主題切換、登出）
 * - 響應式設計（移動端適配）
 * - 主題支持（明暗模式）
 */
export default function DashboardLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
