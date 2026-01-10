import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsDateString, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TimeType } from "@saas-platform/shared-types";
import { CustomerAuthorizationStatus } from "@saas-platform/shared-types";

// 重新匯出 enum 供 Swagger 使用
export { TimeType, CustomerAuthorizationStatus };

/**
 * 會員列表查詢 DTO
 */
export class CustomerListQueryDto {
  @ApiPropertyOptional({
    description: "開始時間（ISO 8601 格式）",
    example: "2025-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString({}, { message: "開始時間格式錯誤" })
  startDate?: string;

  @ApiPropertyOptional({
    description: "結束時間（ISO 8601 格式）",
    example: "2025-01-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString({}, { message: "結束時間格式錯誤" })
  endDate?: string;

  @ApiPropertyOptional({
    description: "時間類型",
    enum: TimeType,
    default: TimeType.AUTHORIZATION_TIME,
  })
  @IsOptional()
  @IsEnum(TimeType)
  timeType?: TimeType = TimeType.AUTHORIZATION_TIME;

  @ApiPropertyOptional({
    description: "授權狀態",
    enum: CustomerAuthorizationStatus,
    default: CustomerAuthorizationStatus.ALL,
  })
  @IsOptional()
  @IsEnum(CustomerAuthorizationStatus)
  authorizationStatus?: CustomerAuthorizationStatus = CustomerAuthorizationStatus.ALL;

  @ApiPropertyOptional({
    description: "錢包地址（模糊查詢）",
    example: "TQn9Y2khEsLJ",
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "頁碼（從 1 開始）",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "頁碼必須是整數" })
  @Min(1, { message: "頁碼必須大於 0" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每頁筆數",
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "每頁筆數必須是整數" })
  @Min(1, { message: "每頁筆數必須大於 0" })
  @Max(100, { message: "每頁筆數不能超過 100" })
  limit?: number = 20;
}
