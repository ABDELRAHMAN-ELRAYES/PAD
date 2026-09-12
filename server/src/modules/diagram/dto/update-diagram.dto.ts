import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { DiagramStatus } from "../types/IDiagram";

export class UpdateDiagramDto {
  @ApiProperty({ required: false, description: "Diagram title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: "Mermaid diagram code" })
  @IsOptional()
  @IsString()
  mermaidCode?: string;

  @ApiProperty({ required: false, enum: ["draft", "published", "repair_failed"], description: "Diagram status" })
  @IsOptional()
  @IsEnum(["draft", "published", "repair_failed"])
  status?: DiagramStatus;

  @ApiProperty({ required: false, description: "Changelog for this version" })
  @IsOptional()
  @IsString()
  changelog?: string;

  @ApiProperty({ required: false, description: "Tier 1 high-level Mermaid code" })
  @IsOptional()
  @IsString()
  tier1Code?: string | null;

  @ApiProperty({ required: false, description: "Tier 2 mid-level Mermaid code" })
  @IsOptional()
  @IsString()
  tier2Code?: string | null;

  @ApiProperty({ required: false, description: "Tier 3 detailed Mermaid code" })
  @IsOptional()
  @IsString()
  tier3Code?: string | null;

  @ApiProperty({ required: false, description: "Active tier number" })
  @IsOptional()
  @IsNumber()
  activeTier?: number | null;

  @ApiProperty({ required: false, description: "Validation error message if any" })
  @IsOptional()
  @IsString()
  validationError?: string | null;
}
