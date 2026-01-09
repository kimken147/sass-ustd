import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SystemWallet,
  SystemWalletChain,
  SystemWalletStatus,
  SystemWalletType,
} from "@saas-platform/database";

export class SystemWalletResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ enum: SystemWalletChain })
  chain!: SystemWalletChain;

  @ApiProperty({ enum: SystemWalletType })
  type!: SystemWalletType;

  @ApiProperty({ enum: SystemWalletStatus })
  status!: SystemWalletStatus;

  @ApiProperty()
  verified!: boolean;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  verificationTxHash?: string;

  @ApiProperty()
  totalRevenue!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(wallet: SystemWallet): SystemWalletResponseDto {
    return {
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      chain: wallet.chain,
      type: wallet.type,
      status: wallet.status,
      verified: wallet.verified,
      verifiedAt: wallet.verifiedAt,
      verificationTxHash: wallet.verificationTxHash,
      totalRevenue: wallet.totalRevenue,
      description: wallet.description,
      lastUsedAt: wallet.lastUsedAt,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
