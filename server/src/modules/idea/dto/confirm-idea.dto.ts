import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class ConfirmIdeaDto {
  @ApiPropertyOptional({ example: ["BRD", "PRD", "SRS"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedDocuments?: string[];

  @ApiPropertyOptional({ example: ["SYSTEM_ARCHITECTURE", "DATABASE_ERD", "USER_FLOW"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedDiagrams?: string[];
}
