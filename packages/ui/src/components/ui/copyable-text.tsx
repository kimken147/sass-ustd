"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";
import { cn } from "../../lib/utils";

export interface CopyableTextProps {
  /** 完整的文本内容 */
  text: string;
  /** 显示的文本（可选，默认使用 text） */
  displayText?: string;
  /** 是否截断显示 */
  truncate?: boolean;
  /** 截断时前面保留的字符数 */
  prefixLength?: number;
  /** 截断时后面保留的字符数 */
  suffixLength?: number;
  /** 额外的 className */
  className?: string;
  /** 字体样式 */
  fontMono?: boolean;
  /** 字体大小 */
  textSize?: "xs" | "sm" | "base";
}

export function CopyableText({
  text,
  displayText,
  truncate = true,
  prefixLength = 8,
  suffixLength = 6,
  className,
  fontMono = true,
  textSize = "sm",
}: CopyableTextProps) {
  const [copied, setCopied] = React.useState(false);

  // 计算显示文本
  const shownText = React.useMemo(() => {
    if (displayText) return displayText;
    if (!truncate || !text) return text;
    if (text.length <= prefixLength + suffixLength + 3) return text;
    return `${text.slice(0, prefixLength)}...${text.slice(-suffixLength)}`;
  }, [text, displayText, truncate, prefixLength, suffixLength]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!text) {
    return <span className="text-muted-foreground">-</span>;
  }

  const textSizeClass = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
  }[textSize];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 group cursor-pointer",
            "hover:text-primary transition-colors",
            "text-left",
            fontMono && "font-mono",
            textSizeClass,
            className
          )}
        >
          <span className="truncate">{shownText}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-md">
        <div className="space-y-1">
          <p className={cn("break-all", fontMono && "font-mono", "text-xs")}>
            {text}
          </p>
          <p className="text-muted-foreground text-xs">点击复制</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

CopyableText.displayName = "CopyableText";
