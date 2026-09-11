import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateIdeaDto {
  @ApiProperty({ example: "Build an AI-powered project architecture platform..." })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  rawText!: string;
}
