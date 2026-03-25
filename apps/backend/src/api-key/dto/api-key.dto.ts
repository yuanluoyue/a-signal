import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  rateLimit?: number;
}

export class ApiKeyResponseDto {
  id: string;
  name: string;
  status: string;
  rateLimit: number;
  createdAt: Date;
}

export class ApiKeyWithKeyResponseDto extends ApiKeyResponseDto {
  key: string;
}
