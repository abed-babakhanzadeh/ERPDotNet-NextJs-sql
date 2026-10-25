"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import ProtectedPage from "@/components/ui/ProtectedPage";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import type { StockCountDto } from "@/types/api";
import StockCountForm from "../components/StockCountForm";

export default function StockCountPage() {
  const id = Number(useParams().id);
  const [data, setData] = useState<StockCountDto | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await inventoryService.getStockCount(id));
    } catch (error) {
      handleApiError(error, "خطا در دریافت انبارگردانی");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedPage permission="Inventory.StockCounts.View">
      {data ? (
        <StockCountForm data={data} onReload={load} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </ProtectedPage>
  );
}
