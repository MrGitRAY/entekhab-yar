import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "انتخاب‌یار | آزمون شناخت مسیر تحصیلی",
  description: "آزمون اکتشافی برای شناخت علاقه‌ها و ترجیح‌های تحصیلی داوطلبان تجربی و ریاضی",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
