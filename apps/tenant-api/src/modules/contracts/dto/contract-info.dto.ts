import { ApiProperty } from "@nestjs/swagger";

export class ContractInfoDto {
  @ApiProperty({
    description: "投資合約地址",
    example: "TContract...",
  })
  contractAddress!: string;

  @ApiProperty({
    description: "USDT Token 地址",
    example: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  })
  usdtTokenAddress!: string;

  @ApiProperty({
    description: "執行合約的錢包地址（由 Platform 設定）",
    example: "TExecutionWallet...",
  })
  executionWalletAddress!: string;

  @ApiProperty({
    description: "最小投資金額（USDT）",
    example: 100,
  })
  minInvestment!: number;

  @ApiProperty({
    description: "最大投資金額（USDT）",
    example: 100000,
  })
  maxInvestment!: number;

  @ApiProperty({
    description: "支援的區塊鏈",
    example: ["tron"],
  })
  supportedChains!: string[];

  @ApiProperty({
    description: "支援的代幣",
    example: ["USDT", "TRX"],
  })
  supportedTokens!: string[];
}
