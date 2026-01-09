import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, EntityManager } from "@mikro-orm/postgresql";
import {
  SystemWallet,
  SystemWalletStatus,
  SystemWalletChain,
  SystemWalletType,
} from "@saas-platform/database";
import { EncryptionService } from "@saas-platform/auth";
import { CreateSystemWalletDto } from "./dto/create-system-wallet.dto";
import { UpdateSystemWalletDto } from "./dto/update-system-wallet.dto";
import { SystemWalletResponseDto } from "./dto/system-wallet-response.dto";

@Injectable()
export class SystemWalletsService {
  constructor(
    @InjectRepository(SystemWallet)
    private readonly walletRepository: EntityRepository<SystemWallet>,
    private readonly em: EntityManager,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * 創建系統商錢包
   */
  async create(
    createDto: CreateSystemWalletDto
  ): Promise<SystemWalletResponseDto> {
    // 檢查地址是否已存在
    const existing = await this.walletRepository.findOne({
      address: createDto.address,
      chain: createDto.chain || SystemWalletChain.TRON,
    });

    if (existing) {
      throw new ConflictException(
        `錢包地址 "${createDto.address}" 已存在於 ${createDto.chain} 鏈上`
      );
    }

    // 如果是執行合約類型，必須提供私鑰
    if (
      createDto.type === SystemWalletType.CONTRACT_EXECUTION &&
      !createDto.privateKey
    ) {
      throw new BadRequestException(
        "執行合約類型的錢包必須提供私鑰"
      );
    }

    // 如果不是執行合約類型，不應該提供私鑰
    if (
      createDto.type !== SystemWalletType.CONTRACT_EXECUTION &&
      createDto.privateKey
    ) {
      throw new BadRequestException(
        "只有執行合約類型的錢包需要提供私鑰"
      );
    }

    // 處理私鑰加密（如果是執行合約類型）
    let encryptedPrivateKey: string | undefined;
    if (
      createDto.type === SystemWalletType.CONTRACT_EXECUTION &&
      createDto.privateKey
    ) {
      // 檢查是否已經加密（避免重複加密）
      if (!this.encryptionService.isEncrypted(createDto.privateKey)) {
        encryptedPrivateKey = this.encryptionService.encrypt(
          createDto.privateKey
        );
      } else {
        encryptedPrivateKey = createDto.privateKey;
      }
    }

    // 創建錢包
    const wallet = this.em.create(SystemWallet, {
      name: createDto.name,
      address: createDto.address,
      type: createDto.type,
      chain: createDto.chain || SystemWalletChain.TRON,
      status: createDto.status || SystemWalletStatus.ACTIVE,
      description: createDto.description,
      privateKey: encryptedPrivateKey,
    });

    await this.em.flush();

    return SystemWalletResponseDto.fromEntity(wallet);
  }

  /**
   * 查詢所有系統商錢包
   */
  async findAll(
    type?: SystemWalletType,
    chain?: SystemWalletChain,
    status?: SystemWalletStatus
  ): Promise<SystemWalletResponseDto[]> {
    const query: any = {};
    if (type) {
      query.type = type;
    }
    if (chain) {
      query.chain = chain;
    }
    if (status) {
      query.status = status;
    }

    const wallets = await this.walletRepository.find(query, {
      orderBy: { createdAt: "DESC" },
    });

    return wallets.map((wallet) => SystemWalletResponseDto.fromEntity(wallet));
  }

  /**
   * 根據 ID 查詢
   */
  async findOne(id: number): Promise<SystemWalletResponseDto> {
    const wallet = await this.walletRepository.findOne({ id });

    if (!wallet) {
      throw new NotFoundException(`系統商錢包 ID ${id} 不存在`);
    }

    return SystemWalletResponseDto.fromEntity(wallet);
  }

  /**
   * 根據地址查詢
   */
  async findByAddress(
    address: string,
    chain: SystemWalletChain = SystemWalletChain.TRON
  ): Promise<SystemWalletResponseDto> {
    const wallet = await this.walletRepository.findOne({ address, chain });

    if (!wallet) {
      throw new NotFoundException(
        `系統商錢包地址 "${address}" 在 ${chain} 鏈上不存在`
      );
    }

    return SystemWalletResponseDto.fromEntity(wallet);
  }

  /**
   * 更新系統商錢包
   */
  async update(
    id: number,
    updateDto: UpdateSystemWalletDto
  ): Promise<SystemWalletResponseDto> {
    const wallet = await this.walletRepository.findOne({ id });

    if (!wallet) {
      throw new NotFoundException(`系統商錢包 ID ${id} 不存在`);
    }

    // 如果更新地址，檢查是否衝突
    if (updateDto.address && updateDto.address !== wallet.address) {
      const existing = await this.walletRepository.findOne({
        address: updateDto.address,
        chain: updateDto.chain || wallet.chain,
      });
      if (existing) {
        throw new ConflictException(`錢包地址 "${updateDto.address}" 已存在`);
      }
    }

    // 如果更新私鑰（僅執行合約類型），加密存儲
    if (
      updateDto.privateKey &&
      wallet.type === SystemWalletType.CONTRACT_EXECUTION
    ) {
      // 檢查是否已經加密（避免重複加密）
      if (!this.encryptionService.isEncrypted(updateDto.privateKey)) {
        updateDto.privateKey = this.encryptionService.encrypt(
          updateDto.privateKey
        );
      }
    } else if (
      updateDto.privateKey &&
      wallet.type !== SystemWalletType.CONTRACT_EXECUTION
    ) {
      throw new BadRequestException(
        "只有執行合約類型的錢包需要提供私鑰"
      );
    }

    // 更新錢包
    this.em.assign(wallet, updateDto);
    await this.em.flush();

    return SystemWalletResponseDto.fromEntity(wallet);
  }

  /**
   * 刪除系統商錢包（軟刪除）
   */
  async remove(id: number): Promise<void> {
    const wallet = await this.walletRepository.findOne({ id });

    if (!wallet) {
      throw new NotFoundException(`系統商錢包 ID ${id} 不存在`);
    }

    // 軟刪除
    wallet.status = SystemWalletStatus.INACTIVE;
    await this.em.flush();
  }

  /**
   * 驗證錢包地址
   */
  async verify(id: number, txHash: string): Promise<SystemWalletResponseDto> {
    const wallet = await this.walletRepository.findOne({ id });

    if (!wallet) {
      throw new NotFoundException(`系統商錢包 ID ${id} 不存在`);
    }

    wallet.verified = true;
    wallet.verifiedAt = new Date();
    wallet.verificationTxHash = txHash;
    await this.em.flush();

    return SystemWalletResponseDto.fromEntity(wallet);
  }
}
