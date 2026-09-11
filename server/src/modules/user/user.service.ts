import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "./user.repository";
import { IUser, IUserProfile } from "./types/user.interface";

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  toProfile(user: IUser): IUserProfile {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  async getProfile(userId: string): Promise<IUserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.toProfile(user);
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      username: string;
      phone: string;
    }>,
  ): Promise<IUserProfile> {
    const updated = await this.userRepo.update(userId, data);
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return this.toProfile(updated);
  }

  async findById(userId: string): Promise<IUser | null> {
    return this.userRepo.findById(userId);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userRepo.findByEmail(email);
  }

  async findByUsernameOrEmail(identifier: string): Promise<IUser | null> {
    return this.userRepo.findByUsernameOrEmail(identifier);
  }
}
