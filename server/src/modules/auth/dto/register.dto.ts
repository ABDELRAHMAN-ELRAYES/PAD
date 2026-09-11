import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: "johndoe" })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phone?: string;
}
