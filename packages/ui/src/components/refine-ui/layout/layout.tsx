"use client";

import type { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset } from "../../ui/sidebar";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ThemeProvider } from "../theme/theme-provider";
import { cn } from "../../../lib/utils";

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
