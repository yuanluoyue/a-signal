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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      this.logger.log(`Registering user with email: ${input.email}`);

      const existingUser = await this.usersService.findByEmail(input.email);
      if (existingUser) {
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

      return {
        user: userWithoutPassword as Omit<User, 'password'>,
        accessToken,
      };
    } catch (error) {
      this.logger.error(`Register failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;

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
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await this.usersService.updatePassword(userId, { password: hashedPassword });

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
