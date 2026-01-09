import { IsOptional, IsDateString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryTransactionsDto {
  @ApiProperty({
    description: "開始時間（ISO 8601 格式），預設為當天 00:00",
    example: "2025-01-01T00:00:00Z",
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: "開始時間格式錯誤" })
  startDate?: string;

  @ApiProperty({
    description: "結束時間（ISO 8601 格式）",
    example: "2025-01-31T23:59:59Z",
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: "結束時間格式錯誤" })
  endDate?: string;

  @ApiProperty({
    description: "頁碼（從 1 開始）",
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "頁碼必須是整數" })
  @Min(1, { message: "頁碼必須大於 0" })
  page?: number = 1;

  @ApiProperty({
    description: "每頁筆數",
    example: 20,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "每頁筆數必須是整數" })
  @Min(1, { message: "每頁筆數必須大於 0" })
  @Max(100, { message: "每頁筆數不能超過 100" })
  limit?: number = 20;
}
