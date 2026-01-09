import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRevenueWalletDto {
  @ApiProperty({
    description: '錢包名稱',
    example: '營運錢包',
  })
  @IsString({ message: '錢包名稱必須是字串' })
  name!: string;

  @ApiProperty({
    description: 'TRON 錢包地址',
    example: 'TXxx...',
  })
  @IsString({ message: '錢包地址必須是字串' })
  @Matches(/^T[A-Za-z1-9]{33}$/, {
    message: '無效的 TRON 地址格式（應為 T 開頭，34 個字符）',
  })
  address!: string;

  @ApiProperty({
    description: '分潤比例 (%)',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({}, { message: '分潤比例必須是數字' })
  @Min(0, { message: '分潤比例不能小於 0' })
  @Max(100, { message: '分潤比例不能大於 100' })
  percentage!: number;

  @ApiProperty({
    description: '是否啟用',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'isActive 必須是布林值' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: '錢包描述',
    example: '主要營運資金',
    required: false,
  })
  @IsString({ message: '描述必須是字串' })
  @IsOptional()
  description?: string;
}
