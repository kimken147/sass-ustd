import { ApiProperty } from '@nestjs/swagger';
import { RevenueWalletResponseDto } from './revenue-wallet-response.dto';

export class RevenueWalletListResponseDto {
  @ApiProperty({
    description: '錢包列表',
    type: [RevenueWalletResponseDto],
  })
  data!: RevenueWalletResponseDto[];

  @ApiProperty({
    description: '總數量',
    example: 10,
  })
  total!: number;
}
