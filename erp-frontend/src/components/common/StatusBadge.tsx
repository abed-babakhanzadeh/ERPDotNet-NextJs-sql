import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_ICON: Record<StatusTone, LucideIcon> = {
  neutral: CircleDashed,
  info: Clock,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: XCircle,
};

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  /** آیکون پیش‌فرض هر رنگ را عوض می‌کند؛ `false` یعنی بدون آیکون */
  icon?: LucideIcon | false;
  className?: string;
}

/** نشان وضعیت واحد برای فهرست، فرم، کارتابل و داشبورد (رنگ و آیکون ثابت برای هر نوع) */
export function StatusBadge({ tone, label, icon, className }: StatusBadgeProps) {
  const Icon = icon === false ? null : (icon ?? TONE_ICON[tone]);
  return (
    <Badge variant={tone} className={cn("font-medium", className)}>
      {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
      {label}
    </Badge>
  );
}

/** نشان فعال/غیرفعال */
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <StatusBadge tone="success" label="فعال" />
  ) : (
    <StatusBadge tone="neutral" label="غیرفعال" icon={XCircle} />
  );
}
