"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { cn } from "../../../lib/utils";
import { useIsMobile } from "../../../hooks/use-mobile";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // 服务端分页
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  // 加载状态
  isLoading?: boolean;
  // 空状态
  emptyMessage?: string;
  // 样式
  className?: string;
  // 是否显示分页
  showPagination?: boolean;
  // 分页模式：client（客户端）或 server（服务端）
  paginationMode?: "client" | "server";
  // 总记录数（服务端分页时使用）
  total?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount: controlledPageCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize = 20,
  onPaginationChange,
  isLoading = false,
  emptyMessage = "暂无数据",
  className,
  showPagination = true,
  paginationMode = "client",
  total,
}: DataTableProps<TData, TValue>) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // 分页状态
  const [{ pageIndex, pageSize }, setPagination] =
    React.useState<PaginationState>({
      pageIndex: controlledPageIndex ?? 0,
      pageSize: controlledPageSize,
    });

  // 同步外部控制的分页状态
  React.useEffect(() => {
    if (controlledPageIndex !== undefined) {
      setPagination((prev) => ({ ...prev, pageIndex: controlledPageIndex }));
    }
  }, [controlledPageIndex]);

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: controlledPageCount ?? -1,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginationMode === "client"
      ? { getPaginationRowModel: getPaginationRowModel() }
      : { manualPagination: true }),
  });

  const currentPageStart = pageIndex * pageSize + 1;
  const currentPageEnd = Math.min((pageIndex + 1) * pageSize, total ?? data.length);
  const totalRecords = total ?? data.length;

  // 渲染移动端卡片视图
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            载入中...
          </CardContent>
        </Card>
      );
    }

    if (!table.getRowModel().rows?.length) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {table.getRowModel().rows.map((row) => (
          <Card key={row.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-2">
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header;
                const headerText =
                  typeof header === "string"
                    ? header
                    : typeof header === "function"
                      ? null // 跳过复杂 header
                      : null;

                return (
                  <div
                    key={cell.id}
                    className="flex items-start justify-between gap-2 py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground shrink-0">
                      {headerText || cell.column.id}
                    </span>
                    <span className="text-sm text-right">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // 渲染桌面端表格视图
  const renderDesktopView = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                <div className="text-muted-foreground">载入中...</div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                <div className="text-muted-foreground">{emptyMessage}</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className={cn("w-full space-y-4", className)}>
      {isMobile ? renderMobileView() : renderDesktopView()}

      {showPagination && !isLoading && totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            显示第 {currentPageStart} - {currentPageEnd} 笔，共 {totalRecords}{" "}
            笔
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一页
            </Button>
            <span className="hidden sm:inline-flex items-center gap-2">
              {renderPageNumbers(table, pageIndex, controlledPageCount ?? Math.ceil(totalRecords / pageSize))}
            </span>
            <span className="sm:hidden text-sm text-muted-foreground">
              {pageIndex + 1} / {controlledPageCount ?? Math.ceil(totalRecords / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 渲染页码按钮
function renderPageNumbers<TData>(
  table: ReturnType<typeof useReactTable<TData>>,
  currentPage: number,
  totalPages: number
) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];

  // 始终显示第一页
  pages.push(0);

  // 计算要显示的页码范围
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages - 2, currentPage + 1);

  // 如果第一页和当前页之间有间隔，添加省略号
  if (start > 1) {
    pages.push("ellipsis");
  }

  // 添加中间页码
  for (let i = start; i <= end; i++) {
    if (i !== 0 && i !== totalPages - 1) {
      pages.push(i);
    }
  }

  // 如果当前页和最后一页之间有间隔，添加省略号
  if (end < totalPages - 2) {
    pages.push("ellipsis");
  }

  // 始终显示最后一页（如果多于一页）
  if (totalPages > 1) {
    pages.push(totalPages - 1);
  }

  return pages.map((page, index) => {
    if (page === "ellipsis") {
      return (
        <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
          ...
        </span>
      );
    }

    return (
      <Button
        key={page}
        variant={page === currentPage ? "default" : "outline"}
        size="sm"
        onClick={() => table.setPageIndex(page)}
      >
        {page + 1}
      </Button>
    );
  });
}

DataTable.displayName = "DataTable";
