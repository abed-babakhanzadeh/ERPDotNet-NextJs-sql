"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/StatusMessage";

/** خطای پیش‌بینی‌نشده در یک صفحه داشبورد؛ منو و تب‌ها سر جایشان می‌مانند */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon={AlertTriangle}
      tone="danger"
      title="نمایش این صفحه با خطا مواجه شد"
      description="اطلاعات شما از بین نرفته است. دوباره تلاش کنید؛ اگر خطا تکرار شد، کد پیگیری را به پشتیبانی اعلام کنید."
      detail={error.digest ? `کد پیگیری: ${error.digest}` : undefined}
      actions={
        <Button onClick={reset}>
          <RotateCcw className="ml-2 h-4 w-4" />
          تلاش دوباره
        </Button>
      }
    />
  );
}
