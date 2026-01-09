import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access Token 過期時間（秒）',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: '用戶資訊',
  })
  user!: {
    id: number;
    email: string;
    name: string;
    role: string;
    tenantId?: number;
    agentId?: number; // 如果是代理登入，會包含代理 ID
  };
}
