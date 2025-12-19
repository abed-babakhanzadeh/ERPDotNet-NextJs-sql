-- این فایل فقط اولین بار که دیتابیس ساخته می‌شود اجرا خواهد شد

-- 1. فعال‌سازی اکستنشن‌های احتمالی مورد نیاز (اختیاری)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ساختن Collation مخصوص فارسی (Case Insensitive - حساس نبودن به حروف بزرگ و کوچک)
-- این روش جدیدترین و استانداردترین روش در پستگرس 15 به بالا است

CREATE COLLATION IF NOT EXISTS "numeric" (PROVIDER = icu, LOCALE = 'en-u-kn-true');



-- 2. ساختن Collation مخصوص فارسی (Case Insensitive - حساس نبودن به حروف بزرگ و کوچک)
-- این روش جدیدترین و استانداردترین روش در پستگرس 15 به بالا است
--این کد، یک Collation (روش مرتب‌سازی) مخصوص زبان فارسی با استفاده از استاندارد جدید ICU می‌سازد که حروف "ک"، "گ"، "ی" و ... را درست مرتب می‌کند.
CREATE COLLATION IF NOT EXISTS "persian_ci" (
    PROVIDER = 'icu',
    LOCALE = 'fa-IR',
    DETERMINISTIC = false
);


-- مثال: اگر تنظیمات خاص دیگری هم داشتید اینجا بنویسید
-- ALTER SYSTEM SET max_connections = 200;