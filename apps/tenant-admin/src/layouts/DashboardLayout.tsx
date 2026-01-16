import { Outlet } from "react-router";
import { Layout } from "@saas-platform/ui";

/**
 * DashboardLayout - 使用 Refine 官方的 Layout 01 组件
 *
 * 这个组件已经包含了：
 * - 侧边栏导航（使用 Refine 的 useMenu hook）
 * - 顶部标头（用户信息、主题切换、登出）
 * - 响应式设计（移动端适配）
 * - 主题支持（明暗模式）
 */
export default function DashboardLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
