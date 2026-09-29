export type ExamGroup = "experimental" | "mathematics";

export type StartInput = {
  displayName: string;
  examYear: number;
  examGroup: ExamGroup;
};

export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function parseStartInput(value: unknown): StartInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("اطلاعات اولیه معتبر نیست.");
  }
  const data = value as Record<string, unknown>;
  if (typeof data.displayName !== "string") {
    throw new Error("نام خود را وارد کنید.");
  }
  const displayName = data.displayName.normalize("NFC").trim().replace(/\s+/g, " ");
  if (displayName.length < 1 || displayName.length > 80 || /[\u0000-\u001f\u007f]/.test(displayName)) {
    throw new Error("نام باید بین ۱ تا ۸۰ نویسه باشد.");
  }
  const yearText = typeof data.examYear === "number"
    ? String(data.examYear)
    : typeof data.examYear === "string" ? normalizeDigits(data.examYear.trim()) : "";
  if (!/^\d{4}$/.test(yearText)) {
    throw new Error("سال کنکور را با چهار رقم وارد کنید.");
  }
  const examYear = Number(yearText);
  if (examYear < 1400 || examYear > 1500) {
    throw new Error("سال کنکور معتبر نیست.");
  }
  if (data.examGroup !== "experimental" && data.examGroup !== "mathematics") {
    throw new Error("گروه دبیرستان را انتخاب کنید.");
  }
  return { displayName, examYear, examGroup: data.examGroup };
}
