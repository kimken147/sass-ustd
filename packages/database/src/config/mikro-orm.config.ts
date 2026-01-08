import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Agent } from '../entities/agent.entity';

const config: Options = {
  driver: PostgreSqlDriver,
  entities: [Tenant, User, Agent],
  dbName: process.env.DB_NAME || 'saas_platform',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // 開發環境設置
  debug: process.env.NODE_ENV !== 'production',
  
  // 自動發現實體（開發環境）
  discovery: {
    warnWhenNoEntities: true,
    requireEntitiesArray: false,
    alwaysAnalyseProperties: false,
  },
  
  // 遷移設置
  migrations: {
    path: './migrations',
    pathTs: './migrations',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    emit: 'ts',
  },
  
  // Seeder 設置
  seeder: {
    path: './seeders',
    pathTs: './seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
    emit: 'ts',
  },
};

export default config;
