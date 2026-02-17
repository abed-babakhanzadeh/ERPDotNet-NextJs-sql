import { toast } from "sonner";

export const handleApiError = (error: any, fallbackMessage: string) => {
  console.error("API Error:", error);

  if (error.response) {
    const data = error.response.data;

    // 1. ارورهای استاندارد بیزینسی (Message یا Detail)
    if (data?.message) {
      toast.error(data.message);
      return;
    }
    if (data?.detail) {
      toast.error(data.detail);
      return;
    }

    // 2. ارورهای ولیدیشن (Validation Errors)
    if (data?.errors) {
      const errors = data.errors;
      if (typeof errors === "object" && !Array.isArray(errors)) {
        // نمایش اولین خطای هر فیلد
        Object.entries(errors).forEach(([key, msgs]: any) => {
          const msg = Array.isArray(msgs) ? msgs[0] : msgs;
          toast.error(msg);
        });
      } else if (Array.isArray(errors)) {
        errors.forEach((err: string) => toast.error(err));
      }
      return;
    }

    // 3. ارور داخلی سرور (500)
    if (error.response.status === 500) {
      toast.error("خطای داخلی سرور رخ داد. لطفاً لاگ سرور را بررسی کنید.");
      return;
    }
  }

  // 4. خطای شبکه یا ناشناخته
  toast.error(fallbackMessage);
};
