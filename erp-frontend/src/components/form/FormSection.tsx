import type { LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  /** تعداد ستون در دسکتاپ؛ در موبایل همیشه یک ستون */
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}

const GRID = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
} as const;

/** بخش کارتی فرم با شبکه یکسان فیلدها. برای فیلد تمام‌عرض از className="sm:col-span-full" استفاده کنید. */
export function FormSection({
  title,
  icon,
  action,
  columns = 2,
  className,
  children,
}: FormSectionProps) {
  return (
    <SectionCard title={title} icon={icon} action={action} className={className}>
      <div className={cn("grid gap-4 p-4", GRID[columns])}>{children}</div>
    </SectionCard>
  );
}
