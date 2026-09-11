import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsString()
  @IsNotEmpty()
  usernameOrEmail!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
