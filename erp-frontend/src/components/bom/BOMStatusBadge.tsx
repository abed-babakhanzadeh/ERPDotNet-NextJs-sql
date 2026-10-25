import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { XCircle } from "lucide-react";

// API عنوان فارسی وضعیت را برمی‌گرداند؛ نام انگلیسی فقط برای سازگاری با داده قدیمی نگاشت می‌شود
const BOM_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  "پیش‌نویس": { label: "پیش‌نویس", tone: "neutral" },
  Draft: { label: "پیش‌نویس", tone: "neutral" },
  "تایید شده": { label: "تایید شده", tone: "info" },
  Approved: { label: "تایید شده", tone: "info" },
  "فعال": { label: "فعال", tone: "success" },
  Active: { label: "فعال", tone: "success" },
  "منسوخ": { label: "منسوخ", tone: "danger" },
  Obsolete: { label: "منسوخ", tone: "danger" },
};

export function BOMStatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) return <StatusBadge tone="neutral" label="غیرفعال" icon={XCircle} />;
  const meta = BOM_STATUS[status?.trim()] ?? { label: status || "نامشخص", tone: "neutral" as const };
  return <StatusBadge tone={meta.tone} label={meta.label} />;
}
