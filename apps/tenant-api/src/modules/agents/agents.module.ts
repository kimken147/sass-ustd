import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User, Agent, TenantConfig } from '@saas-platform/database';
import { PasswordService } from '@saas-platform/auth';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MikroOrmModule.forFeature([User, Agent, TenantConfig]), AuthModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    {
      provide: PasswordService,
      useFactory: () => new PasswordService(10),
    },
  ],
  exports: [AgentsService],
})
export class AgentsModule {}
