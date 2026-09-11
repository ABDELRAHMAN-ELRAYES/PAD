import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "reset-jwt-token-string" })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: "NewSecurePassword123!" })
  @IsString()
  @MinLength(6)
  password!: string;
}
