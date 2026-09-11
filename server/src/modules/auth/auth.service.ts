import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRepository } from "../user/user.repository";
import { UserService } from "../user/user.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgetPasswordDto } from "./dto/forget-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { IUserProfile } from "../user/types/user.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: IUserProfile; token: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    if (dto.username) {
      const existingUsername = await this.userRepo.findByUsernameOrEmail(dto.username);
      if (existingUsername) {
        throw new ConflictException("Username is already taken");
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      username: dto.username,
      phone: dto.phone,
      role: "CLIENT",
    });

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.userService.toProfile(user),
      token,
    };
  }

  async login(dto: LoginDto): Promise<{ user: IUserProfile; token: string }> {
    const user = await this.userRepo.findByUsernameOrEmail(dto.usernameOrEmail);
    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid credentials. Please try again.");
    }

    if (!user.active) {
      throw new UnauthorizedException("Your account is deactivated. Please contact support.");
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials. Please try again.");
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.userService.toProfile(user),
      token,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.password) {
      throw new UnauthorizedException("User not found");
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException("Current password does not match");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepo.updatePassword(userId, hashedPassword);
  }

  async forgetPassword(dto: ForgetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      return { message: "If an account exists with this email, a reset link has been dispatched." };
    }

    // In production, dispatch reset email with token
    return { message: "If an account exists with this email, a reset link has been dispatched." };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const email = payload.email;
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    await this.userRepo.updatePassword(user.id, hashedPassword);
  }
}
