"use client";

import * as React from "react";
import { COLUMN_MAX_WIDTH } from "@/hooks/useColumnWidths";

const KEYBOARD_STEP = 10;
const KEYBOARD_STEP_LARGE = 50;

interface ColumnResizeHandleProps {
  label: string;
  width: number;
  minWidth: number;
  onWidthChange: (width: number) => void;
  /** دابل‌کلیک یا Enter: عرض متناسب با محتوای ستون */
  onAutoFit: () => void;
}

/**
 * دستگیره تغییر عرض ستون در لبه چپ (انتهای ستون در RTL).
 * علاوه بر درگ (react-resizable)، با کیبورد هم کار می‌کند تا درگ تنها راه نباشد:
 * چپ = پهن‌تر، راست = باریک‌تر (Shift گام بزرگ‌تر)، Home/End حداقل/حداکثر، Enter اندازه خودکار.
 */
export const ColumnResizeHandle = React.forwardRef<HTMLSpanElement, ColumnResizeHandleProps>(
  function ColumnResizeHandle({ label, width, minWidth, onWidthChange, onAutoFit }, ref) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
      const next: Record<string, number> = {
        ArrowLeft: width + step,
        ArrowRight: width - step,
        Home: minWidth,
        End: COLUMN_MAX_WIDTH,
      };
      if (e.key in next) {
        e.preventDefault();
        onWidthChange(next[e.key]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onAutoFit();
      }
    };

    return (
      <span
        ref={ref}
        role="separator"
        aria-orientation="vertical"
        aria-label={`تغییر عرض ستون ${label}`}
        aria-valuenow={Math.round(width)}
        aria-valuemin={minWidth}
        aria-valuemax={COLUMN_MAX_WIDTH}
        tabIndex={0}
        title="برای تغییر عرض بکشید؛ دابل‌کلیک = اندازه خودکار"
        onKeyDown={handleKeyDown}
        onDoubleClick={onAutoFit}
        onClick={(e) => e.stopPropagation()}
        className="column-resize-handle"
      />
    );
  },
);
