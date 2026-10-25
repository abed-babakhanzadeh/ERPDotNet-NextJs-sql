import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/StatusMessage";

export default function NotFound() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background">
      <StatusMessage
        icon={FileQuestion}
        title="صفحه مورد نظر پیدا نشد"
        description="ممکن است آدرس اشتباه وارد شده باشد یا این صفحه جابه‌جا شده باشد."
        actions={
          <Button asChild>
            <Link href="/">بازگشت به صفحه اصلی</Link>
          </Button>
        }
      />
    </div>
  );
}
