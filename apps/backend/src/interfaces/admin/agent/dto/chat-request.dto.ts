import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
