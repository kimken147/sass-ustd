import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { TenantConfig, RevenueWallet } from '@saas-platform/database';
import { randomUUID } from 'crypto';
import { CreateRevenueWalletDto } from './dto/create-revenue-wallet.dto';
import { UpdateRevenueWalletDto } from './dto/update-revenue-wallet.dto';
import { SetRevenueWalletsDto } from './dto/set-revenue-wallets.dto';

/**
 * 分潤錢包服務
 *
 * 使用獨立的 Tenant DB，配置存放在 tenant_config 表（只有一筆記錄）
 * 因此不需要 tenantId 參數
 */
@Injectable()
export class RevenueWalletsService {
  constructor(
    @InjectRepository(TenantConfig)
    private readonly tenantConfigRepository: EntityRepository<TenantConfig>,
    private readonly em: EntityManager,
  ) {}

  /**
   * 獲取租戶配置（只有一筆）
   */
  private async getTenantConfig(): Promise<TenantConfig> {
    // TenantConfig 只有一筆記錄，id = 1
    const config = await this.tenantConfigRepository.findOne({ id: 1 });
    if (!config) {
      throw new NotFoundException('租戶配置不存在，請先初始化');
    }
    return config;
  }

  /**
   * 獲取當前租戶的分潤錢包列表
   */
  async getRevenueWallets(): Promise<RevenueWallet[]> {
    const config = await this.getTenantConfig();
    return config.revenueWallets || [];
  }

  /**
   * 設置分潤錢包列表（替換所有）
   * 驗證：所有 isActive=true 的錢包 percentage 加總必須 = 100
   */
  async setRevenueWallets(dto: SetRevenueWalletsDto): Promise<RevenueWallet[]> {
    const config = await this.getTenantConfig();

    // 生成新的錢包列表（添加 UUID）
    const newWallets: RevenueWallet[] = dto.wallets.map((wallet) => ({
      id: randomUUID(),
      name: wallet.name,
      address: wallet.address,
      chain: 'tron' as const,
      percentage: wallet.percentage,
      isActive: wallet.isActive ?? true,
      verified: false,
      totalPaidAmount: 0,
      description: wallet.description,
    }));

    // 驗證：所有 isActive=true 的錢包 percentage 加總必須 = 100
    const activeWallets = newWallets.filter((w) => w.isActive);
    const totalPercentage = activeWallets.reduce(
      (sum, w) => sum + w.percentage,
      0,
    );

    if (activeWallets.length === 0) {
      throw new BadRequestException('至少需要一個啟用的錢包');
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      // 允許小數點誤差
      throw new BadRequestException(
        `所有啟用錢包的分潤比例總和必須等於 100%，目前為 ${totalPercentage}%`,
      );
    }

    // 更新租戶的分潤錢包
    config.revenueWallets = newWallets;
    await this.em.flush();

    return config.revenueWallets;
  }

  /**
   * 添加單個分潤錢包
   */
  async createRevenueWallet(dto: CreateRevenueWalletDto): Promise<RevenueWallet> {
    const config = await this.getTenantConfig();

    const newWallet: RevenueWallet = {
      id: randomUUID(),
      name: dto.name,
      address: dto.address,
      chain: 'tron',
      percentage: dto.percentage,
      isActive: dto.isActive ?? true,
      verified: false,
      totalPaidAmount: 0,
      description: dto.description,
    };

    // 如果新錢包是啟用的，需要驗證總和
    if (newWallet.isActive) {
      const currentWallets = config.revenueWallets || [];
      const activeWallets = [
        ...currentWallets.filter((w) => w.isActive),
        newWallet,
      ];
      const totalPercentage = activeWallets.reduce(
        (sum, w) => sum + w.percentage,
        0,
      );

      if (totalPercentage > 100.01) {
        // 允許小數點誤差
        throw new BadRequestException(
          `添加此錢包後，啟用錢包的分潤比例總和將超過 100%（${totalPercentage}%）`,
        );
      }
    }

    // 添加到錢包列表
    config.revenueWallets = [...(config.revenueWallets || []), newWallet];
    await this.em.flush();

    return newWallet;
  }

  /**
   * 更新單個分潤錢包
   */
  async updateRevenueWallet(
    walletId: string,
    dto: UpdateRevenueWalletDto,
  ): Promise<RevenueWallet> {
    const config = await this.getTenantConfig();

    const wallets = config.revenueWallets || [];
    const walletIndex = wallets.findIndex((w) => w.id === walletId);

    if (walletIndex === -1) {
      throw new NotFoundException('錢包不存在');
    }

    const wallet = wallets[walletIndex];
    const updatedWallet: RevenueWallet = {
      ...wallet,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.percentage !== undefined && { percentage: dto.percentage }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.description !== undefined && { description: dto.description }),
    };

    // 如果更新了 percentage 或 isActive，需要驗證總和
    if (
      dto.percentage !== undefined ||
      dto.isActive !== undefined ||
      dto.address !== undefined
    ) {
      // 如果地址改變，重置驗證狀態
      if (dto.address !== undefined && dto.address !== wallet.address) {
        updatedWallet.verified = false;
        updatedWallet.verifiedAt = undefined;
        updatedWallet.verificationTxHash = undefined;
      }

      // 驗證啟用錢包的總和
      const activeWallets = wallets
        .map((w, idx) => (idx === walletIndex ? updatedWallet : w))
        .filter((w) => w.isActive);

      const totalPercentage = activeWallets.reduce(
        (sum, w) => sum + w.percentage,
        0,
      );

      if (activeWallets.length === 0) {
        throw new BadRequestException('至少需要一個啟用的錢包');
      }

      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new BadRequestException(
          `所有啟用錢包的分潤比例總和必須等於 100%，目前為 ${totalPercentage}%`,
        );
      }
    }

    // 更新錢包
    wallets[walletIndex] = updatedWallet;
    config.revenueWallets = wallets;
    await this.em.flush();

    return updatedWallet;
  }

  /**
   * 刪除單個分潤錢包
   */
  async deleteRevenueWallet(walletId: string): Promise<void> {
    const config = await this.getTenantConfig();

    const wallets = config.revenueWallets || [];
    const walletIndex = wallets.findIndex((w) => w.id === walletId);

    if (walletIndex === -1) {
      throw new NotFoundException('錢包不存在');
    }

    const wallet = wallets[walletIndex];

    // 如果刪除的是啟用的錢包，需要驗證剩餘啟用錢包的總和
    if (wallet.isActive) {
      const remainingActiveWallets = wallets.filter(
        (w, idx) => idx !== walletIndex && w.isActive,
      );

      if (remainingActiveWallets.length > 0) {
        const totalPercentage = remainingActiveWallets.reduce(
          (sum, w) => sum + w.percentage,
          0,
        );

        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new BadRequestException(
            `刪除此錢包後，剩餘啟用錢包的分潤比例總和為 ${totalPercentage}%，必須等於 100%`,
          );
        }
      }
    }

    // 刪除錢包
    wallets.splice(walletIndex, 1);
    config.revenueWallets = wallets;
    await this.em.flush();
  }
}
