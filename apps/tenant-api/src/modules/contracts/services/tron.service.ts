import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "@saas-platform/auth";

/**
 * TRON 網路類型
 */
export enum TronNetwork {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  SHASHA = "shasta", // TRON 測試網
}

/**
 * TRON 服務
 * 用於與 TRON 區塊鏈交互，執行 USDT 轉帳
 */
@Injectable()
export class TronService {
  private readonly logger = new Logger(TronService.name);
  private tronWeb: any;
  private network: TronNetwork;
  private contractExecutionWalletAddress: string;
  private contractExecutionWalletPrivateKey: string;
  private usdtTokenAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService
  ) {
    this.initialize();
  }

  /**
   * 初始化 TRON 服務
   */
  private async initialize() {
    try {
      // 動態導入 TronWeb（如果未安裝則使用模擬模式）
      let TronWeb: any;
      try {
        const tronwebModule = require("tronweb");
        TronWeb = tronwebModule.TronWeb || tronwebModule.default?.TronWeb || tronwebModule;
      } catch (error) {
        this.logger.warn(
          "TronWeb 未安裝，將使用模擬模式。請執行: pnpm add tronweb"
        );
        return;
      }

      // 從環境變數獲取網路配置
      const networkEnv =
        this.configService.get<string>("TRON_NETWORK") || "testnet";
      this.network =
        networkEnv === "mainnet"
          ? TronNetwork.MAINNET
          : networkEnv === "shasta"
            ? TronNetwork.SHASHA
            : TronNetwork.TESTNET;

      // 設定 TRON 網路端點
      const fullNode =
        this.network === TronNetwork.MAINNET
          ? "https://api.trongrid.io"
          : this.network === TronNetwork.SHASHA
            ? "https://api.shasta.trongrid.io"
            : "https://api.nileex.io"; // Nile 測試網

      const solidityNode = fullNode;
      const eventServer = fullNode;

      // 獲取執行合約的錢包地址和私鑰
      this.contractExecutionWalletAddress =
        this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS") ||
        "";
      let rawPrivateKey =
        this.configService.get<string>(
          "CONTRACT_EXECUTION_WALLET_PRIVATE_KEY"
        ) || "";

      // 如果私鑰是加密的，先解密（用於環境變數中的私鑰）
      if (rawPrivateKey && this.encryptionService.isEncrypted(rawPrivateKey)) {
        try {
          rawPrivateKey = this.encryptionService.decrypt(rawPrivateKey);
        } catch (error) {
          this.logger.error("解密環境變數中的私鑰失敗", error);
          rawPrivateKey = "";
        }
      }
      this.contractExecutionWalletPrivateKey = rawPrivateKey;

      // 獲取 USDT Token 地址
      this.usdtTokenAddress =
        this.configService.get<string>("TRON_USDT_TOKEN_ADDRESS") ||
        "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // 主網 USDT

      if (this.network === TronNetwork.TESTNET || this.network === TronNetwork.SHASHA) {
        // 測試網 USDT 地址（如果有的話，否則使用主網地址）
        this.usdtTokenAddress =
          this.configService.get<string>("TRON_USDT_TOKEN_ADDRESS_TESTNET") ||
          this.usdtTokenAddress;
      }

      // 初始化 TronWeb（使用已解密的私鑰）
      if (this.contractExecutionWalletPrivateKey) {
        this.tronWeb = new TronWeb({
          fullHost: fullNode,
          solidityNode: solidityNode,
          eventServer: eventServer,
          privateKey: this.contractExecutionWalletPrivateKey,
        });
      }

      // 驗證配置
      if (!this.contractExecutionWalletAddress) {
        this.logger.warn(
          "未設定 CONTRACT_EXECUTION_WALLET_ADDRESS，將使用模擬模式"
        );
      }

      if (!this.contractExecutionWalletPrivateKey) {
        this.logger.warn(
          "未設定 CONTRACT_EXECUTION_WALLET_PRIVATE_KEY，將使用模擬模式"
        );
      }

      this.logger.log(
        `TRON 服務已初始化 - 網路: ${this.network}, 執行錢包: ${this.contractExecutionWalletAddress || "未設定"}`
      );
    } catch (error) {
      this.logger.error("初始化 TRON 服務失敗", error);
      this.logger.warn("將使用模擬模式");
    }
  }

  /**
   * 轉帳 USDT（使用 transferFrom）
   * @param fromAddress 從哪個地址轉帳（已授權的會員錢包）
   * @param toAddress 轉到哪個地址
   * @param amount 轉帳金額（USDT，會自動轉換為最小單位）
   * @param contractAddress 合約地址（可選，如果提供則使用該合約）
   * @param privateKey 執行合約的錢包私鑰（可選，如果提供則使用該私鑰，否則使用初始化時的私鑰）
   * @returns 交易 hash
   */
  async transferUSDT(
    fromAddress: string,
    toAddress: string,
    amount: number,
    contractAddress?: string,
    privateKey?: string
  ): Promise<string> {
    // 使用提供的私鑰或初始化時的私鑰
    let walletPrivateKey = privateKey || this.contractExecutionWalletPrivateKey;
    const walletAddress = this.contractExecutionWalletAddress;

    // 如果私鑰是加密的，先解密
    if (walletPrivateKey && this.encryptionService.isEncrypted(walletPrivateKey)) {
      try {
        walletPrivateKey = this.encryptionService.decrypt(walletPrivateKey);
      } catch (error) {
        this.logger.error("解密私鑰失敗", error);
        throw new BadRequestException("無法解密私鑰");
      }
    }

    // 只有在完全沒有私鑰時才使用模擬模式（DB 傳入的私鑰優先於 env var）
    if (!walletPrivateKey) {
      return this.mockTransfer(fromAddress, toAddress, amount);
    }

    try {
      // 驗證地址格式
      if (!this.isValidTronAddress(fromAddress)) {
        throw new BadRequestException(`無效的發送地址: ${fromAddress}`);
      }
      if (!this.isValidTronAddress(toAddress)) {
        throw new BadRequestException(`無效的接收地址: ${toAddress}`);
      }

      // 創建 TronWeb 實例（使用已解密的私鑰）
      // 如果提供了不同的私鑰，創建新實例；否則使用初始化時的實例
      let tronWebInstance = this.tronWeb;
      if (privateKey && privateKey !== this.contractExecutionWalletPrivateKey) {
        // 使用提供的私鑰創建新的 TronWeb 實例（此時 walletPrivateKey 已經解密）
        const tronwebMod = require("tronweb");
        const TronWeb = tronwebMod.TronWeb || tronwebMod.default?.TronWeb || tronwebMod;
        const fullNode =
          this.network === TronNetwork.MAINNET
            ? "https://api.trongrid.io"
            : this.network === TronNetwork.SHASHA
              ? "https://api.shasta.trongrid.io"
              : "https://api.nileex.io";
        tronWebInstance = new TronWeb({
          fullHost: fullNode,
          solidityNode: fullNode,
          eventServer: fullNode,
          privateKey: walletPrivateKey, // 使用已解密的私鑰
        });
      } else if (!this.tronWeb && walletPrivateKey) {
        // 如果初始化時沒有創建 TronWeb，現在創建（使用已解密的私鑰）
        const tronwebMod = require("tronweb");
        const TronWeb = tronwebMod.TronWeb || tronwebMod.default?.TronWeb || tronwebMod;
        const fullNode =
          this.network === TronNetwork.MAINNET
            ? "https://api.trongrid.io"
            : this.network === TronNetwork.SHASHA
              ? "https://api.shasta.trongrid.io"
              : "https://api.nileex.io";
        tronWebInstance = new TronWeb({
          fullHost: fullNode,
          solidityNode: fullNode,
          eventServer: fullNode,
          privateKey: walletPrivateKey, // 使用已解密的私鑰
        });
      }

      // 使用提供的合約地址或預設的 USDT Token 地址
      const tokenAddress = contractAddress || this.usdtTokenAddress;

      // 獲取 USDT 合約實例
      const contract = await tronWebInstance.contract().at(tokenAddress);

      // 將金額轉換為最小單位（USDT 是 6 位小數）
      const amountInSun = tronWebInstance.toBigNumber(amount).times(1e6).toFixed(0);

      // 調用 transferFrom
      // transferFrom(from, to, amount)
      // 注意：執行合約的錢包必須有權限調用 transferFrom（會員已授權）
      const transaction = await contract
        .transferFrom(fromAddress, toAddress, amountInSun)
        .send({
          feeLimit: 100_000_000, // 100 TRX (最大手續費)
          callValue: 0,
          shouldPollResponse: false,
        });

      // 獲取交易 hash
      const txHash = transaction;
      this.logger.log(
        `USDT 轉帳成功: ${amount} USDT from ${fromAddress} to ${toAddress} (txHash: ${txHash})`
      );

      return txHash;
    } catch (error) {
      this.logger.error(
        `USDT 轉帳失敗: ${amount} USDT from ${fromAddress} to ${toAddress}`,
        error
      );
      throw new BadRequestException(
        `轉帳失敗: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 驗證 TRON 地址格式
   */
  private isValidTronAddress(address: string): boolean {
    if (!address || typeof address !== "string") {
      return false;
    }
    // TRON 地址格式：T 開頭，34 個字符
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }

  /**
   * 模擬轉帳（用於開發和測試）
   */
  private mockTransfer(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): string {
    const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`;
    this.logger.warn(
      `[模擬轉帳] ${amount} USDT from ${fromAddress} → ${toAddress} (txHash: ${mockTxHash})`
    );
    return mockTxHash;
  }

  /**
   * 獲取當前網路
   */
  getNetwork(): TronNetwork {
    return this.network;
  }

  /**
   * 獲取執行合約的錢包地址
   */
  getExecutionWalletAddress(): string {
    return this.contractExecutionWalletAddress;
  }

  /**
   * 檢查是否為模擬模式
   */
  isMockMode(): boolean {
    // 只有 env var 沒設定才是 mock，DB 傳入的私鑰不影響這個判斷
    return !this.contractExecutionWalletPrivateKey && !this.contractExecutionWalletAddress;
  }

  /**
   * 獲取錢包的 USDT 餘額
   * @param walletAddress 錢包地址
   * @param tokenAddress USDT Token 地址（可選）
   * @returns 餘額（USDT 單位，已轉換）
   */
  async getUSDTBalance(walletAddress: string, tokenAddress?: string): Promise<number> {
    // 如果沒有初始化 TronWeb，嘗試動態建立（用於 env 沒設定但需要查餘額的情況）
    let tronWebInstance = this.tronWeb;
    if (!tronWebInstance) {
      try {
        const tronwebMod = require("tronweb");
        const TronWeb = tronwebMod.TronWeb || tronwebMod.default?.TronWeb || tronwebMod;
        const fullNode =
          this.network === TronNetwork.MAINNET
            ? "https://api.trongrid.io"
            : this.network === TronNetwork.SHASHA
              ? "https://api.shasta.trongrid.io"
              : "https://api.nileex.io";
        tronWebInstance = new TronWeb({ fullHost: fullNode });
      } catch {
        this.logger.warn('[模擬模式] 無法建立 TronWeb，返回模擬餘額 1000 USDT');
        return 1000;
      }
    }

    try {
      const token = tokenAddress || this.usdtTokenAddress;
      const contract = await tronWebInstance.contract().at(token);
      const balance = await contract.balanceOf(walletAddress).call();

      // USDT 是 6 位小數
      const balanceInUsdt = tronWebInstance.toBigNumber(balance).div(1e6).toNumber();
      this.logger.log(`錢包 ${walletAddress} USDT 餘額: ${balanceInUsdt}`);

      return balanceInUsdt;
    } catch (error) {
      this.logger.error(`獲取 USDT 餘額失敗: ${walletAddress}`, error);
      throw new BadRequestException('無法獲取 USDT 餘額');
    }
  }

  /**
   * 獲取 USDT Token 地址
   */
  getUsdtTokenAddress(): string {
    return this.usdtTokenAddress;
  }
}
