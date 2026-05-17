import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../../../modules/auth/auth.service.js';
import {
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/index.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Request } from 'express';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, { ipAddress: ip, userAgent });
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, { ipAddress: ip, userAgent });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户资料' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Put('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
