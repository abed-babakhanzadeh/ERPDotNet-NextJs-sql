# تست‌های E2E

این تست‌ها روی **بک‌اند و دیتابیس واقعی** اجرا می‌شوند، نه ماک. هر تست داده خودش را با پسوند یکتا می‌سازد، پس روی یک دیتابیس چند بار پشت سر هم هم اجرا می‌شوند.

## اجرای محلی

```bash
# ۱. SQL Server و Redis
docker run -d --name erp-sql -e ACCEPT_EULA=Y -e 'MSSQL_SA_PASSWORD=E2e_Passw0rd!' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
docker run -d --name erp-redis -p 6379:6379 redis:7-alpine

# ۲. API (در شروع migration می‌زند و کاربر admin را می‌سازد)
cd ERPDotNet
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5000 \
ConnectionStrings__DefaultConnection='Server=localhost,1433;Database=ERP_E2E;User Id=sa;Password=E2e_Passw0rd!;TrustServerCertificate=True;' \
ConnectionStrings__Redis=localhost:6379 dotnet run --project ERPDotNet.API

# ۳. فرانت و تست‌ها
cd erp-frontend
NEXT_PUBLIC_API_URL=http://localhost:5000 npm run build && npx next start -p 3000 &
npx playwright install chromium   # فقط بار اول
npm run e2e
```

`E2E_BASE_URL` و `E2E_API_URL` آدرس فرانت و API را عوض می‌کنند.

## سناریوها

| فایل | چه چیزی را می‌سنجد |
|---|---|
| `auth.spec.ts` | ورود موفق و ناموفق، برگشت به صفحه ورود بدون توکن |
| `units.spec.ts` | خطای اعتبارسنجی، ذخیره ضریب تبدیل و دقت اعشار واحد فرعی، هشدار تغییرات ذخیره‌نشده |
| `products.spec.ts` | تعریف کالا با لوک‌آپ واحد، خطای کد تکراری |
| `inventory.spec.ts` | ثبت رسید از فرم، قطعی شدن و نمایش در گزارش موجودی |
| `boms.spec.ts` | ثبت BOM با چند ماده اولیه، رد شدن BOM چرخه‌ای |

مراحل تأیید و قطعی کردن سند انبار در برنامه از کارتابل گردش کار انجام می‌شوند؛ تست آن‌ها را مستقیم با API انجام می‌دهد.
