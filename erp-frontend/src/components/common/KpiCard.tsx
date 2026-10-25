import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  hint?: string;
  isLoading?: boolean;
  error?: string | null;
  onClick?: () => void;
  tone?: "primary" | "success" | "warning" | "info";
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

const fa = new Intl.NumberFormat("fa-IR");

/** کارت عدد کلیدی (KPI) برای داشبورد و گزارش‌ها */
export function KpiCard({ label, value, icon: Icon, hint, isLoading, error, onClick, tone = "primary" }: KpiCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-start shadow-sm transition-colors sm:p-4",
        onClick && "hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className={cn("hidden size-10 shrink-0 items-center justify-center rounded-lg sm:flex", TONE[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        {isLoading ? (
          <span className="mt-2 block h-7 w-16 animate-pulse rounded bg-muted" />
        ) : error ? (
          <span className="mt-1 block text-sm text-destructive" title={error}>
            دریافت نشد
          </span>
        ) : (
          <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">
            {typeof value === "number" ? fa.format(value) : (value ?? "—")}
          </span>
        )}
        {hint && <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{hint}</span>}
      </span>
      {onClick && (
        <ArrowLeft className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      )}
    </Comp>
  );
}
