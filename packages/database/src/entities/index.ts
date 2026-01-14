export * from './base.entity';
export * from './tenant.entity';
export * from './tenant-config.entity';

// User entities (重構為繼承架構)
export * from './user-base.entity'; // BaseUser 抽象基類
export * from './user-platform.entity'; // PlatformUser (Platform DB)
export * from './user-tenant.entity'; // TenantUser (Tenant DB)
export * from './user.entity'; // 保留舊的 User entity 以向後兼容（已棄用，請使用 PlatformUser 或 TenantUser）

export * from './agent.entity';
export * from './customer.entity';
export * from './commission-payout.entity';
export * from './revenue-distribution.entity';
export * from './system-fee-distribution.entity';
export * from './system-wallet.entity';