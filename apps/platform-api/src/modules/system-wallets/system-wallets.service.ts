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
import { CreateSystemWalletDto } from "./dto/create-system-wallet.dto";
import { UpdateSystemWalletDto } from "./dto/update-system-wallet.dto";
import { SystemWalletResponseDto } from "./dto/system-wallet-response.dto";

@Injectable()
export class SystemWalletsService {
  constructor(
    @InjectRepository(SystemWallet)
    private readonly walletRepository: EntityRepository<SystemWallet>,
    private readonly em: EntityManager
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

    // 創建錢包
    const wallet = this.em.create(SystemWallet, {
      name: createDto.name,
      address: createDto.address,
      type: createDto.type,
      chain: createDto.chain || SystemWalletChain.TRON,
      status: createDto.status || SystemWalletStatus.ACTIVE,
      description: createDto.description,
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
