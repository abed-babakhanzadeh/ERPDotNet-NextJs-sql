"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  Box,
  Layers,
  Component,
  AlertTriangle,
} from "lucide-react";

export interface BOMTreeNodeDto {
  key: string;
  productId: number;
  productName: string;
  productCode: string;
  quantity: number;
  totalQuantity: number;
  wastePercentage: number;
  unitName: string;
  type?: string;
  children?: BOMTreeNodeDto[];
}

interface BOMTreeTableProps {
  data: BOMTreeNodeDto;
}

interface FlatNode extends BOMTreeNodeDto {
  level: number;
  hasChildren: boolean;
  path: string;
  parentPath: string;
}

export default function BOMTreeTable({ data }: BOMTreeTableProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["root"])
  );

  const flatData = useMemo(() => {
    const result: FlatNode[] = [];

    const traverse = (
      node: BOMTreeNodeDto,
      level: number,
      path: string,
      parentPath: string
    ) => {
      const hasChildren = !!node.children && node.children.length > 0;

      result.push({
        ...node,
        level,
        hasChildren,
        path,
        parentPath,
      });

      if (hasChildren) {
        node.children!.forEach((child, index) => {
          traverse(child, level + 1, `${path}-${index}`, path);
        });
      }
    };

    traverse(data, 0, "root", "");
    return result;
  }, [data]);

  React.useEffect(() => {
    const allPaths = new Set<string>();
    flatData.forEach((node) => {
      if (node.hasChildren) allPaths.add(node.path);
    });
    setExpandedPaths(allPaths);
  }, [flatData]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getLevelStyle = (level: number) => {
    const colors = [
      "bg-slate-800 text-white border-slate-900", // Level 0
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      "bg-pink-100 text-pink-700 border-pink-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-lime-100 text-lime-700 border-lime-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
    ];
    return colors[Math.min(level, 10)];
  };

  const getLevelIcon = (level: number, hasChildren: boolean) => {
    if (level === 0) return <Box className="w-3.5 h-3.5" />;
    if (hasChildren) return <Layers className="w-3.5 h-3.5" />;
    return <Component className="w-3.5 h-3.5" />;
  };

  const isVisible = (node: FlatNode) => {
    if (node.level === 0) return true;
    let currentPath = node.parentPath;
    while (currentPath) {
      if (!expandedPaths.has(currentPath)) return false;
      const lastDash = currentPath.lastIndexOf("-");
      if (lastDash === -1) {
        if (currentPath === "root" && !expandedPaths.has("root")) return false;
        break;
      }
      currentPath = currentPath.substring(0, lastDash);
    }
    if (currentPath === "root" && !expandedPaths.has("root")) return false;
    return true;
  };

  return (
    <div className="flex flex-col h-full w-full" dir="rtl">
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          {/* --- هدر جدول (اصلاح شده: مات کردن پس‌زمینه) --- */}
          <thead className="bg-muted/90 backdrop-blur-md sticky top-0 z-10 text-xs font-medium text-muted-foreground border-b shadow-sm supports-[backdrop-filter]:bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-right w-[40%]">ساختار محصول</th>
              <th className="px-4 py-3 text-right w-[10%]">نوع</th>
              <th className="px-4 py-3 text-left w-[12%] font-mono">
                کد محصول
              </th>
              <th className="px-4 py-3 text-center w-[10%]">مقدار پایه</th>
              <th className="px-4 py-3 text-center w-[8%]">ضایعات</th>
              <th className="px-4 py-3 text-center w-[12%]">تعداد کل</th>
              <th className="px-4 py-3 text-center w-[8%]">واحد</th>
            </tr>
          </thead>

          {/* --- بدنه جدول --- */}
          <tbody className="divide-y divide-border bg-white dark:bg-card">
            {flatData.map((row) => {
              if (!isVisible(row)) return null;

              const isExpanded = expandedPaths.has(row.path);

              return (
                <tr
                  key={row.path}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* ستون ساختار محصول */}
                  <td className="px-4 py-2 relative">
                    <div
                      className="flex items-center"
                      style={{ paddingRight: `${row.level * 28}px` }}
                    >
                      {/* خط راهنما */}
                      {row.level > 0 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 border-r border-dashed border-slate-200"
                          style={{ right: `${row.level * 28 - 14}px` }}
                        />
                      )}

                      {/* دکمه باز/بسته */}
                      <button
                        onClick={() => toggleExpand(row.path)}
                        disabled={!row.hasChildren}
                        className={cn(
                          "w-5 h-5 flex items-center justify-center ml-1 rounded hover:bg-slate-200 text-slate-500 transition-colors",
                          !row.hasChildren && "invisible"
                        )}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronLeft size={14} />
                        )}
                      </button>

                      {/* بج سطح و نام */}
                      <div className="flex items-center gap-2 py-1">
                        <div
                          className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-md border shadow-sm flex-shrink-0 transition-all cursor-default select-none",
                            getLevelStyle(row.level)
                          )}
                        >
                          <span className="text-[10px] font-bold font-mono">
                            {row.level}
                          </span>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            row.level === 0
                              ? "font-bold text-slate-800"
                              : "text-slate-700"
                          )}
                        >
                          {getLevelIcon(row.level, row.hasChildren)}
                          <span className="truncate" title={row.productName}>
                            {row.productName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ستون نوع */}
                  <td className="px-4 py-2 text-right">
                    <span className="text-[11px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {row.type || (row.hasChildren ? "ساختنی" : "خریدنی")}
                    </span>
                  </td>

                  {/* ستون کد محصول */}
                  <td className="px-4 py-2 text-left">
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {row.productCode}
                    </span>
                  </td>

                  {/* ستون مقدار پایه */}
                  <td className="px-4 py-2 text-center">
                    <div className="font-mono font-medium text-slate-700 dir-ltr inline-block text-xs">
                      {Number(row.quantity).toLocaleString()}
                    </div>
                  </td>

                  {/* ستون ضایعات */}
                  <td className="px-4 py-2 text-center">
                    {row.wastePercentage > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {row.wastePercentage}%
                        </span>
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      </div>
                    ) : (
                      <span className="text-slate-300 text-[10px]">-</span>
                    )}
                  </td>

                  {/* ستون تعداد کل (انفجار) */}
                  <td className="px-4 py-2 text-center">
                    <div
                      className={cn(
                        "font-mono font-bold text-xs px-2 py-1 rounded shadow-sm dir-ltr inline-block min-w-[60px]",
                        getLevelStyle(row.level)
                      )}
                    >
                      {Number(row.totalQuantity).toLocaleString()}
                    </div>
                  </td>

                  {/* ستون واحد */}
                  <td className="px-4 py-2 text-center">
                    <span className="text-[11px] text-muted-foreground">
                      {row.unitName}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
