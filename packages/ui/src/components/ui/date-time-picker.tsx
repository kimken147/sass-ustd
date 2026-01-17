"use client"

import * as React from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Input } from "./input"

interface DateTimePickerProps {
  /** 當前選中的日期時間，格式為 ISO 字串或 Date 對象 */
  value?: string | Date
  /** 日期時間變更時的回調，返回 ISO 格式字串 (YYYY-MM-DDTHH:mm) */
  onChange?: (value: string) => void
  /** 佔位符文字 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定義 className */
  className?: string
  /** 是否只選擇日期（不包含時間） */
  dateOnly?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "選擇日期時間",
  disabled = false,
  className,
  dateOnly = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // 解析 value 為 Date 對象
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // 嘗試解析 ISO 字串
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  // 獲取時間部分
  const timeValue = React.useMemo(() => {
    if (!dateValue) return "12:00"
    const hours = dateValue.getHours().toString().padStart(2, "0")
    const minutes = dateValue.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }, [dateValue])

  // 處理日期選擇
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return

    // 保留原有的時間部分
    if (dateValue) {
      selectedDate.setHours(dateValue.getHours(), dateValue.getMinutes())
    } else {
      // 如果沒有原有值，設置為當天中午 12:00
      selectedDate.setHours(12, 0, 0, 0)
    }

    const isoString = formatToLocalISO(selectedDate)
    onChange?.(isoString)

    if (dateOnly) {
      setOpen(false)
    }
  }

  // 處理時間變更
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value
    if (!timeString) return

    const [hours, minutes] = timeString.split(":").map(Number)
    const newDate = dateValue ? new Date(dateValue) : new Date()
    newDate.setHours(hours, minutes, 0, 0)

    const isoString = formatToLocalISO(newDate)
    onChange?.(isoString)
  }

  // 格式化為本地 ISO 字串 (YYYY-MM-DDTHH:mm)
  const formatToLocalISO = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // 顯示文字
  const displayText = React.useMemo(() => {
    if (!dateValue) return placeholder
    if (dateOnly) {
      return format(dateValue, "yyyy/MM/dd", { locale: zhTW })
    }
    return format(dateValue, "yyyy/MM/dd HH:mm", { locale: zhTW })
  }, [dateValue, placeholder, dateOnly])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
          initialFocus
        />
        {!dateOnly && (
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">時間:</span>
              <Input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                className="w-auto"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

DateTimePicker.displayName = "DateTimePicker"
