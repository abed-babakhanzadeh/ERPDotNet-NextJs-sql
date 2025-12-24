export default function DashboardPage() {
  return (
    <div className="page-content space-y-6">
      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="text-sm font-medium text-card-foreground">
            تعداد کل کاربران
          </h3>
          <p className="mt-2 text-3xl font-bold text-foreground">1,240</p>
          <span className="text-xs text-green-500">+12% نسبت به ماه قبل</span>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="text-sm font-medium text-card-foreground">
            سندهای ثبت شده
          </h3>
          <p className="mt-2 text-3xl font-bold text-foreground">354</p>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="text-sm font-medium text-card-foreground">
            وضعیت سیستم
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-400">آنلاین</p>
        </div>
      </div>

      {/* بخش محتوا */}
      <div className="rounded-xl bg-card p-6 shadow-sm border border-border min-h-[400px]">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          گزارش فعالیت‌های اخیر
        </h2>
        <p className="text-card-foreground">
          به سامانه ERP خوش آمدید. از منوی سمت راست برای دسترسی به بخش‌ها
          استفاده کنید.
        </p>
      </div>
    </div>
  );
}
