import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRevenueWalletDto } from './create-revenue-wallet.dto';

export class SetRevenueWalletsDto {
  @ApiProperty({
    description: '分潤錢包列表',
    type: [CreateRevenueWalletDto],
    example: [
      {
        name: '營運錢包',
        address: 'TXxx...',
        percentage: 60,
        isActive: true,
        description: '主要營運資金',
      },
      {
        name: '技術錢包',
        address: 'TYyy...',
        percentage: 30,
        isActive: true,
      },
      {
        name: '儲備錢包',
        address: 'TZzz...',
        percentage: 10,
        isActive: true,
      },
    ],
  })
  @IsArray({ message: '錢包列表必須是陣列' })
  @ArrayMinSize(1, { message: '至少需要一個錢包' })
  @ValidateNested({ each: true })
  @Type(() => CreateRevenueWalletDto)
  wallets!: CreateRevenueWalletDto[];
}
