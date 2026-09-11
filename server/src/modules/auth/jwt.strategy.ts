import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../user/user.repository";
import { IUser } from "../user/types/user.interface";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userRepo: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.jwt || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || process.env.JWT_SECRET || "default_jwt_secret",
    });
  }

  async validate(payload: { id: string; sub?: string }): Promise<IUser> {
    const userId = payload.id || payload.sub;
    if (!userId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user.active) {
      throw new UnauthorizedException("User account is inactive or not found");
    }

    return user;
  }
}
