import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAgentDto {
  @ApiProperty({
    description: '代理名稱',
    example: '張三',
    required: false,
  })
  @IsString({ message: '代理名稱必須是字串' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '分配给该代理的全局比率 (%)，相对于总投资金额',
    example: 70,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber({}, { message: '分配比率必须是数字' })
  @Min(0, { message: '分配比率不能小于 0' })
  @Max(100, { message: '分配比率不能大于 100' })
  @IsOptional()
  allocatedRate?: number;

  @ApiProperty({
    description: 'TRON 錢包地址',
    example: 'TXxx...',
    required: false,
  })
  @IsString({ message: '錢包地址必須是字串' })
  @Matches(/^T[A-Za-z1-9]{33}$/, {
    message: '無效的 TRON 地址格式（應為 T 開頭，34 個字符）',
  })
  @IsOptional()
  walletAddress?: string;

  @ApiProperty({
    description: '是否啟用',
    example: true,
    required: false,
  })
  @IsBoolean({ message: 'status 必須是布林值' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: '備註',
    example: '重要代理',
    required: false,
  })
  @IsString({ message: '備註必須是字串' })
  @IsOptional()
  notes?: string;
}
