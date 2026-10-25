import { Badge } from "@/components/ui/badge";

// هم‌ترتیب با StockCountStatus در بک‌اند
export const STOCK_COUNT_FINALIZED = 2;

export default function StockCountStatusBadge({
  statusId,
  title,
}: {
  statusId: number;
  title: string;
}) {
  return statusId === STOCK_COUNT_FINALIZED ? (
    <Badge className="bg-success hover:bg-success/90">{title}</Badge>
  ) : (
    <Badge variant="secondary">{title}</Badge>
  );
}
