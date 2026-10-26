import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";

// هم‌ترتیب با ProductionOrderStatus در بک‌اند
export const PRODUCTION_ORDER_STATUS = {
  draft: 1,
  released: 2,
  inProgress: 3,
  completed: 4,
  cancelled: 5,
} as const;

const TONES: Record<number, StatusTone> = {
  1: "neutral",
  2: "info",
  3: "warning",
  4: "success",
  5: "danger",
};

export default function ProductionOrderStatusBadge({ statusId, title }: { statusId: number; title: string }) {
  return <StatusBadge tone={TONES[statusId] ?? "neutral"} label={title} />;
}
