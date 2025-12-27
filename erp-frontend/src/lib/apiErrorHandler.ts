import { toast } from "sonner";

export const handleApiError = (
  error: any,
  defaultMessage: string = "خطایی در عملیات رخ داده است"
) => {
  // لاگ کردن برای دیباگ
  console.error("API Error Object:", error);

  if (!error.response) {
    toast.error("خطا در برقراری ارتباط با سرور. اتصال اینترنت را بررسی کنید.");
    return;
  }

  const { status, data } = error.response;

  // 1. خطاهای ولیدیشن (400)
  if (status === 400) {
    if (data.errors) {
      // فرمت استاندارد ValidationProblemDetails
      const messages = Object.values(data.errors).flat();
      messages.forEach((msg: any) => toast.error(msg));
      return;
    }
    if (typeof data === "string") {
      toast.error(data);
      return;
    }
  }

  // 2. خطاهای بیزنس لاجیک که ممکن است در 'detail' باشند
  if (data?.detail) {
    toast.error(data.detail);
    return;
  }

  // 3. خطاهای خاص
  if (status === 401) {
    toast.error("نشست کاربری منقضی شده است. لطفا مجدد وارد شوید.");
    return;
  }
  if (status === 403) {
    toast.error("شما مجوز انجام این عملیات را ندارید.");
    return;
  }
  if (status === 409) {
    toast.error(
      "تداخل داده (Concurrency). رکورد توسط شخص دیگری ویرایش شده است."
    );
    return;
  }

  // 4. مدیریت خطای 500 (مهم برای مشکل شما)
  if (status === 500) {
    // تلاش برای پیدا کردن پیام خطا در دل پاسخ 500
    // گاهی سرور پیام Exception را در data.Message یا خود data می‌فرستد
    if (data && typeof data === "string" && data.length < 500) {
      // اگر پیام کوتاه بود احتمالا متن خطاست (مثل Duplicate Key)
      // البته متن‌های SQL انگلیسی هستند، می‌توانیم ترجمه کنیم یا نمایش دهیم
      if (data.includes("duplicate") || data.includes("unique")) {
        toast.error("این کد کالا قبلا ثبت شده است. لطفا کد دیگری انتخاب کنید.");
        return;
      }
      toast.error(`خطای سرور: ${data}`);
      return;
    }

    // فرمت‌های جیسون مختلف برای خطا
    if (data?.Message) {
      toast.error(data.Message);
      return;
    }

    toast.error("خطای داخلی سرور رخ داده است. لطفا با پشتیبانی تماس بگیرید.");
    return;
  }

  // پیش‌فرض
  toast.error(defaultMessage);
};
