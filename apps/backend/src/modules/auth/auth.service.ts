import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { User } from '../../core/db/schema.js';

export interface RegisterInput {
  nickname: string;
  email: string;
  password: string;
  avatarSeed?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  nickname?: string;
  avatarSeed?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
  ) {}

  async register(input: RegisterInput, ctx?: RequestContext): Promise<AuthResponse> {
    try {
      this.logger.log(`Registering user with email: ${input.email}`);

      const existingUser = await this.usersService.findByEmail(input.email);
      if (existingUser) {
        await this.auditLogService.log({
          action: 'user.register',
          resource: 'user',
          detail: { email: input.email, reason: 'email_already_registered' },
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
          status: 'failure',
        });
        throw new ConflictException('Email already registered');
      }

      this.logger.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(input.password, 10);

      this.logger.log('Creating user in database...');
      const user = await this.usersService.create({
        nickname: input.nickname,
        email: input.email,
        password: hashedPassword,
        avatarSeed: input.avatarSeed,
      });

      this.logger.log(`User created with id: ${user.id}`);
      const accessToken = this.generateToken(user);
      const { password, ...userWithoutPassword } = user;

      await this.auditLogService.log({
        userId: user.id,
        action: 'user.register',
        resource: 'user',
        resourceId: user.id,
        detail: { email: input.email, nickname: input.nickname },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
        status: 'success',
      });

      return {
        user: userWithoutPassword as Omit<User, 'password'>,
        accessToken,
      };
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        await this.auditLogService.log({
          action: 'user.register',
          resource: 'user',
          detail: { email: input.email, reason: error.message },
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
          status: 'failure',
        });
      }
      this.logger.error(`Register failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(input: LoginInput, ctx?: RequestContext): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      await this.auditLogService.log({
        action: 'user.login',
        resource: 'user',
        detail: { email: input.email, reason: 'user_not_found' },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
        status: 'failure',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.password,
    );
    if (!isPasswordValid) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'user.login',
        resource: 'user',
        resourceId: user.id,
        detail: { email: input.email, reason: 'invalid_password' },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
        status: 'failure',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;

    await this.auditLogService.log({
      userId: user.id,
      action: 'user.login',
      resource: 'user',
      resourceId: user.id,
      detail: { email: input.email },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      status: 'success',
    });

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      accessToken,
    };
  }

  async getMe(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password'>;
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.update(userId, input);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.auditLogService.log({
      userId,
      action: 'user.update_profile',
      resource: 'user',
      resourceId: userId,
      detail: { updatedFields: Object.keys(input) },
      status: 'success',
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password'>;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      input.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      await this.auditLogService.log({
        userId,
        action: 'user.change_password',
        resource: 'user',
        resourceId: userId,
        detail: { reason: 'current_password_incorrect' },
        status: 'failure',
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await this.usersService.updatePassword(userId, { password: hashedPassword });

    await this.auditLogService.log({
      userId,
      action: 'user.change_password',
      resource: 'user',
      resourceId: userId,
      status: 'success',
    });

    return { message: 'Password changed successfully' };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }
}
