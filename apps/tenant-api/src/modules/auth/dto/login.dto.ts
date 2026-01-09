import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '登入帳號（username）',
    example: 'admin',
  })
  @IsString({ message: '帳號必須是字串' })
  @MinLength(3, { message: '帳號長度至少為 3 個字元' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '帳號只能包含英文字母、數字和底線',
  })
  username!: string;

  @ApiProperty({
    description: '密碼',
    example: 'SecurePassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '密碼長度至少為 6 個字元' })
  password!: string;
}
