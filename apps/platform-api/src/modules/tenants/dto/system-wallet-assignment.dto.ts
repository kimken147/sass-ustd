import { IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SystemWalletAssignmentDto {
  @ApiProperty({
    description: "系統商錢包 ID",
    example: 1,
  })
  @IsInt({ message: "錢包 ID 必須是整數" })
  walletId!: number;

  @ApiProperty({
    description: "分潤比例（整數，%）",
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsInt({ message: "比例必須是整數" })
  @Min(1, { message: "比例至少為 1%" })
  @Max(100, { message: "比例最多為 100%" })
  percentage!: number;
}
