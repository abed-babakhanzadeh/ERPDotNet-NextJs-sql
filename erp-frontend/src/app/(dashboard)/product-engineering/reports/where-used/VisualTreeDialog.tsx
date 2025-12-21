"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import apiClient from "@/services/apiClient";
import {
  Loader2,
  Box,
  Layers,
  Component,
  AlertCircle,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BOMTreeNode {
  key: string;
  productId: number;
  productName: string;
  productCode: string;
  quantity: number;
  totalQuantity: number;
  type: string;
  children: BOMTreeNode[];
}

interface VisualTreeDialogProps {
  open: boolean;
  onClose: () => void;
  bomId: number;
  highlightProductId: number | null;
  rootProductName: string;
}

export default function VisualTreeDialog({
  open,
  onClose,
  bomId,
  highlightProductId,
  rootProductName,
}: VisualTreeDialogProps) {
  const [data, setData] = useState<BOMTreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- States for Zoom & Pan ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Mouse Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch Pinch/Drag State
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !bomId) return;

    setLoading(true);
    setError(null);
    setData(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });

    apiClient
      .get(`/ProductEngineering/BOMs/${bomId}/tree`)
      .then((res) => {
        if (res.data) setData(res.data);
        else setError("داده‌ای یافت نشد");
      })
      .catch((err) => {
        console.error(err);
        setError("خطا در دریافت ساختار درختی");
      })
      .finally(() => setLoading(false));
  }, [open, bomId]);

  const handleFitToScreen = () => {
    if (!containerRef.current || !contentRef.current) return;

    const contentWidth = contentRef.current.offsetWidth;
    const contentHeight = contentRef.current.offsetHeight;
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    if (contentWidth === 0 || contentHeight === 0) return;

    const scaleX = (containerWidth - 100) / contentWidth;
    const scaleY = (containerHeight - 100) / contentHeight;

    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (data && !loading) {
      const timer = setTimeout(() => {
        handleFitToScreen();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, loading]);

  // --- Mouse Events (Desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(5, scale + delta));
    setScale(newScale);
  };

  // --- Touch Events (Mobile) ---

  // محاسبه فاصله بین دو انگشت
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // حالت حرکت (Pan) با یک انگشت
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      // حالت زوم (Pinch) با دو انگشت
      const dist = getTouchDistance(e.touches);
      setLastPinchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // جلوگیری از اسکرول شدن صفحه مرورگر هنگام کار با نمودار
    // e.preventDefault() اینجا ممکن است اخطار passive event بدهد،
    // بهتر است در css با touch-action: none کنترل شود (که در پایین اعمال کردیم)

    if (e.touches.length === 1 && isDragging) {
      // انجام حرکت
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    } else if (e.touches.length === 2 && lastPinchDistance) {
      // انجام زوم
      const newDist = getTouchDistance(e.touches);
      const zoomFactor = newDist / lastPinchDistance;
      // محدود کردن سرعت زوم و بازه زوم
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);

      setScale(newScale);
      setLastPinchDistance(newDist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastPinchDistance(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[75vw] w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden z-20 flex-shrink-0">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
              نمایش گرافیکی ساختار کالا/قلم/قلم
            </span>
          </DialogTitle>
          <DialogDescription className="text-base mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            ساختار درختی کالا/قلم/قلم{" "}
            <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
              {rootProductName}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="absolute top-24 right-8 z-30 flex flex-col gap-2 bg-white/90 backdrop-blur border rounded-lg p-1.5 shadow-xl ring-1 ring-slate-900/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(s + 0.2, 5))}
            title="بزرگنمایی"
          >
            <ZoomIn className="w-5 h-5 text-slate-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(s - 0.2, 0.1))}
            title="کوچک‌نمایی"
          >
            <ZoomOut className="w-5 h-5 text-slate-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFitToScreen}
            title="Fit to Screen"
          >
            <Maximize className="w-5 h-5 text-slate-700" />
          </Button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className={cn(
            "flex-1 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ touchAction: "none" }} // مهم: جلوگیری از اسکرول مرورگر در موبایل
          dir="ltr"
          // Mouse Events
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          // Touch Events (New)
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              transform: `translate(${position.x % 16}px, ${
                position.y % 16
              }px)`,
            }}
          />

          {loading ? (
            <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground relative z-10">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                <div className="absolute inset-0 w-12 h-12 animate-ping opacity-20">
                  <Loader2 className="w-12 h-12 text-purple-500" />
                </div>
              </div>
              <span className="text-lg font-medium">
                در حال ترسیم نمودار...
              </span>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center flex-col gap-3 relative z-10">
              <div className="p-4 bg-red-50 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <span className="text-lg font-semibold text-red-700">
                {error}
              </span>
            </div>
          ) : data ? (
            <div
              className="w-full h-full flex items-center justify-center origin-center transition-transform duration-75 ease-out will-change-transform"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
            >
              <div ref={contentRef} className="inline-block p-20">
                <TreeNode
                  node={data}
                  highlightId={highlightProductId}
                  level={0}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground relative z-10">
              <div className="text-center">
                <Box className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg">اطلاعاتی برای نمایش وجود ندارد</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm" />
              <span>قطعه مورد نظر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-300 shadow-sm" />
              <span>سایر قطعات</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              درگ برای جابجایی • اسکرول برای زوم
            </span>
            <span className="sm:hidden">لمس برای حرکت • دو انگشت برای زوم</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TreeNode = ({
  node,
  highlightId,
  level,
}: {
  node: BOMTreeNode;
  highlightId: number | null;
  level: number;
}) => {
  const isTarget = highlightId ? node.productId === highlightId : false;
  const hasChildren = node.children && node.children.length > 0;
  const NodeIcon = level === 0 ? Box : hasChildren ? Layers : Component;

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl px-5 py-4 min-w-[160px] transition-all duration-500 z-10 backdrop-blur-sm",
          isTarget
            ? "bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100 border-2 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] scale-110 ring-4 ring-yellow-300/50 animate-pulse"
            : level === 0
            ? "bg-gradient-to-br from-purple-100 via-white to-blue-100 border-2 border-purple-300 shadow-xl hover:shadow-2xl hover:scale-105 hover:border-purple-400"
            : "bg-white/90 border-2 border-slate-200 shadow-lg hover:shadow-xl hover:scale-105 hover:border-blue-300"
        )}
      >
        <div
          className={cn(
            "mb-3 p-2 rounded-lg transition-all duration-300",
            isTarget
              ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-lg"
              : level === 0
              ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md"
              : hasChildren
              ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md"
              : "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-md"
          )}
        >
          <NodeIcon className="w-5 h-5" />
        </div>

        <span
          className={cn(
            "font-bold text-sm text-center mb-2 leading-tight",
            isTarget
              ? "text-yellow-900"
              : level === 0
              ? "text-purple-900"
              : "text-slate-800"
          )}
        >
          {node.productName}
        </span>

        <span
          className={cn(
            "text-[10px] font-mono px-2 py-1 rounded-md border shadow-sm",
            isTarget
              ? "bg-yellow-200 text-yellow-800 border-yellow-300"
              : "bg-slate-100 text-slate-600 border-slate-200"
          )}
        >
          {node.productCode}
        </span>

        {level > 0 && (
          <div
            className={cn(
              "mt-3 text-[11px] px-3 py-1 rounded-full font-semibold shadow-md border",
              isTarget
                ? "bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900 border-yellow-400"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400"
            )}
          >
            تعداد: {Number(node.quantity).toLocaleString()}
          </div>
        )}

        {isTarget && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-amber-400/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {hasChildren && (
        <div
          className={cn(
            "w-0.5 h-10 relative",
            isTarget
              ? "bg-gradient-to-b from-yellow-400 to-yellow-300"
              : "bg-gradient-to-b from-slate-300 to-slate-400"
          )}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 shadow-sm" />
        </div>
      )}

      {hasChildren && (
        <div className="flex gap-10 relative pt-2">
          {node.children.length > 1 && (
            <div
              className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent"
              style={{
                left: "50%",
                right: "50%",
                transform: "translateX(-50%)",
                width: `calc(100% - ${100 / node.children.length}%)`,
              }}
            />
          )}

          {node.children.map((child, idx) => (
            <div key={idx} className="flex flex-col items-center relative">
              <div className="w-0.5 h-8 bg-gradient-to-b from-slate-300 to-transparent mb-2" />
              <TreeNode
                node={child}
                highlightId={highlightId}
                level={level + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
