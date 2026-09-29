# مرزهای پیاده‌سازی

در مراحل ۳ و ۴، فرم، APIهای آزمون، موتور خالص تطبیق، ثبت snapshot و گزارش وب پیاده شده‌اند. قراردادهای عمومی در [معماری](../docs/architecture.md) و اجرای فعلی در [راهنمای Matching](../docs/matching-stage4.md) آمده‌اند. اتصال Supabase میزبانی‌شده هنوز آزمایش نشده است.

- `app`: صفحات و Route Handlerهای Next.js.
- `components`: اجزای عمومی رابط.
- `features/assessment` و `features/results`: تجربه آزمون و نمایش نتیجه.
- `domain/assessment`، `domain/matching` و `domain/reporting`: مدل‌ها و محاسبات مستقل از فریم‌ورک.
- `server/services`: هماهنگی عملیات، احراز هویت و مجوز.
- `server/repositories`: قرارداد ذخیره‌سازی.
- `infrastructure/catalog`، `infrastructure/supabase` و `infrastructure/pdf`: اتصال قراردادها به ابزارها.

وابستگی دامنه به زیرساخت یا رابط ممنوع است. ماژول‌های سرور هنگام پیاده‌سازی با مرز `server-only` محافظت می‌شوند. هیچ کلید سرور یا منطق ممتاز وارد کد مرورگر نمی‌شود.
