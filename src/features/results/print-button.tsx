"use client";

export function PrintButton() {
  return <button className="secondary-button print-button" type="button" onClick={() => window.print()}>چاپ یا ذخیره PDF ↓</button>;
}
