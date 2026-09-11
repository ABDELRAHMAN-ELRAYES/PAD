import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class RefineIdeaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refinedText?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  answers?: { question: string; answer: string }[];
}
