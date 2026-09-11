import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IUser } from "./types/user.interface";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current authenticated user profile" })
  async getMyProfile(@CurrentUser() user: IUser) {
    return this.userService.getProfile(user.id);
  }

  @Patch("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update current authenticated user profile" })
  async updateMyProfile(
    @CurrentUser() user: IUser,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      username?: string;
      phone?: string;
    },
  ) {
    return this.userService.updateProfile(user.id, body);
  }
}
