import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsDateString, IsNumber } from "class-validator";
import { Type } from "class-transformer";

/**
 * 代理列表查詢 DTO
 */
export class QueryAgentsDto {
  @ApiPropertyOptional({ description: "名稱（模糊搜尋）" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "建立時間開始（ISO 格式）" })
  @IsOptional()
  @IsDateString()
  createdAtStart?: string;

  @ApiPropertyOptional({ description: "建立時間結束（ISO 格式）" })
  @IsOptional()
  @IsDateString()
  createdAtEnd?: string;

  @ApiPropertyOptional({ description: "頁碼" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: "每頁數量" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
