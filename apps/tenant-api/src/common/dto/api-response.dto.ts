import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto<T> {
  @ApiProperty({ description: "請求是否成功", example: true })
  success!: boolean;

  @ApiProperty({ description: "響應數據" })
  data!: T;

  @ApiProperty({
    description: "響應消息（可選）",
    example: "操作成功",
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: "響應時間戳",
    example: "2025-01-24T10:00:00.000Z",
  })
  timestamp!: string;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T> {
  @ApiProperty({ description: "總筆數", example: 100 })
  total?: number;

  @ApiProperty({ description: "當前頁碼", example: 1 })
  page?: number;

  @ApiProperty({ description: "每頁筆數", example: 20 })
  limit?: number;

  @ApiProperty({ description: "總頁數", example: 5 })
  totalPages?: number;
}