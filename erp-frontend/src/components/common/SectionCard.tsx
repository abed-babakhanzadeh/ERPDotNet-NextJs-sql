import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** کارت بخش با عنوان و اقدام اختیاری؛ چیدمان یکسان داشبورد و صفحه‌های جزئیات */
export function SectionCard({ title, icon: Icon, action, className, children }: SectionCardProps) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border bg-card shadow-sm", className)}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
          {title}
        </h2>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

/** حالت خالی کوچک داخل یک بخش */
export function SectionEmpty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="rounded-full bg-muted p-3">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/** اسکلت بارگذاری فهرست داخل یک بخش */
export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  );
}
