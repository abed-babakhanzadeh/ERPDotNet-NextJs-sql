import { AlarmClock } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

/** سررسید کار کارتابل؛ کار عقب‌افتاده قرمز نمایش داده می‌شود */
export default function DueDateBadge({
  dueDate,
  isOverdue,
}: {
  dueDate?: string | null;
  isOverdue?: boolean;
}) {
  if (!dueDate) return <span className="text-muted-foreground">-</span>;
  const label = new Date(dueDate).toLocaleString("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return isOverdue ? (
    <StatusBadge tone="danger" icon={AlarmClock} label={`گذشته: ${label}`} />
  ) : (
    <StatusBadge tone="info" icon={AlarmClock} label={label} />
  );
}
