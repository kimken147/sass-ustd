import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsDateString, IsString } from "class-validator";
import { Type } from "class-transformer";
import { TimeType, AuthorizationStatus } from "@saas-platform/shared-types";

// 重新匯出 enum 供 Swagger 使用
export { TimeType, AuthorizationStatus };

/**
 * 站點列表查詢 DTO
 */
export class SiteListQueryDto {
  @ApiPropertyOptional({
    description: "訂單時間範圍（開始時間）",
    example: "2025-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: "訂單時間範圍（結束時間）",
    example: "2025-01-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

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
    enum: AuthorizationStatus,
    default: AuthorizationStatus.ALL,
  })
  @IsOptional()
  @IsEnum(AuthorizationStatus)
  authorizationStatus?: AuthorizationStatus = AuthorizationStatus.ALL;

  @ApiPropertyOptional({
    description: "頁碼",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每頁數量",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
