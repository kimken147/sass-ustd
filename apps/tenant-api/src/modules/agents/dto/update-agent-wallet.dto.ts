import {
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAgentWalletDto {
  @ApiProperty({
    description: 'TRON 錢包地址',
    example: 'TXxx...',
    required: true,
  })
  @IsString({ message: '錢包地址必須是字串' })
  @Matches(/^T[A-Za-z1-9]{33}$/, {
    message: '無效的 TRON 地址格式（應為 T 開頭，34 個字符）',
  })
  walletAddress!: string;
}
