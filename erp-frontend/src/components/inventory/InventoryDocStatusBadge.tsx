import { StatusBadge } from "@/components/common/StatusBadge";
import { InventoryDocStatus, InventoryDocStatusMap } from "@/types/inventory";

export function InventoryDocStatusBadge({ status }: { status: InventoryDocStatus }) {
  const meta = InventoryDocStatusMap[status];
  return meta ? (
    <StatusBadge tone={meta.tone} label={meta.label} />
  ) : (
    <StatusBadge tone="neutral" label="نامشخص" />
  );
}
