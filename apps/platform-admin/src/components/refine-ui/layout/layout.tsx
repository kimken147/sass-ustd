"use client";

import type { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset } from "src/components/ui/sidebar";
import { Sidebar } from "src/components/refine-ui/layout/sidebar";
import { Header } from "src/components/refine-ui/layout/header";
import { ThemeProvider } from "src/components/refine-ui/theme/theme-provider";
import { cn } from "src/lib/utils";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset>
          <Header />
          <main
            className={cn(
              "@container/main",
              "container",
              "mx-auto",
              "relative",
              "w-full",
              "flex",
              "flex-col",
              "flex-1",
              "px-2",
              "pt-4",
              "md:p-4",
              "lg:px-6",
              "lg:pt-6",
            )}
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
