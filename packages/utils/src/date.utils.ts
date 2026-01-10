import dayjs from "dayjs";
import "dayjs/locale/zh-tw";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";

// 載入 dayjs 插件
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// 設定預設語言為繁體中文
dayjs.locale("zh-tw");

/**
 * 格式化日期時間
 * @param date - 日期（可以是 Date 對象、ISO 字串、或 dayjs 可解析的格式）
 * @param format - 格式化模板（預設：YYYY-MM-DD HH:mm:ss）
 * @returns 格式化後的日期字串
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  format: string = "YYYY-MM-DD HH:mm:ss"
): string {
  if (!date) return "";

  const dayjsDate = dayjs(date);
  if (!dayjsDate.isValid()) return "";

  return dayjsDate.format(format);
}

/**
 * 格式化日期（僅日期部分）
 * @param date - 日期
 * @param format - 格式化模板（預設：YYYY-MM-DD）
 * @returns 格式化後的日期字串
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: string = "YYYY-MM-DD"
): string {
  return formatDateTime(date, format);
}

/**
 * 格式化時間（僅時間部分）
 * @param date - 日期
 * @param format - 格式化模板（預設：HH:mm:ss）
 * @returns 格式化後的時間字串
 */
export function formatTime(
  date: Date | string | null | undefined,
  format: string = "HH:mm:ss"
): string {
  return formatDateTime(date, format);
}

/**
 * 格式化為本地化的日期時間字串（繁體中文格式）
 * @param date - 日期
 * @returns 本地化格式的日期時間字串（例如：2025/01/15 14:30:25）
 */
export function formatDateTimeLocalized(
  date: Date | string | null | undefined
): string {
  return formatDateTime(date, "YYYY/MM/DD HH:mm:ss");
}

/**
 * 格式化為相對時間（例如：3 分鐘前、2 小時前）
 * @param date - 日期
 * @returns 相對時間字串
 */
export function formatRelativeTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  const dayjsDate = dayjs(date);
  if (!dayjsDate.isValid()) return "";

  // 使用類型斷言，因為 relativeTime 插件已經通過 extend 載入
  return dayjsDate.fromNow();
}

/**
 * 檢查日期是否有效
 * @param date - 日期
 * @returns 是否為有效日期
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return dayjs(date).isValid();
}

/**
 * 獲取本地時間今天的 00:00，格式為 datetime-local 輸入框需要的格式
 * @returns 格式化的日期時間字串（例如：2025-01-24T00:00）
 */
export function getTodayStartLocal(): string {
  const today = dayjs().startOf("day");
  return today.format("YYYY-MM-DDTHH:mm");
}

/**
 * 獲取指定日期的 00:00，格式為 datetime-local 輸入框需要的格式
 * @param date - 日期（可選，預設為今天）
 * @returns 格式化的日期時間字串（例如：2025-01-24T00:00）
 */
export function getDateStartLocal(date?: Date | string): string {
  const targetDate = date ? dayjs(date).startOf("day") : dayjs().startOf("day");
  return targetDate.format("YYYY-MM-DDTHH:mm");
}
