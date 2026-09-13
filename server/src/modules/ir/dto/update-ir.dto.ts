import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ProjectIRSchema } from "../types/ir.types";

export class UpdateIRDto {
  @ApiProperty({ description: "Structured Project IR schema data" })
  @IsNotEmpty()
  schemaData!: ProjectIRSchema;

  @ApiProperty({ required: false, description: "Changelog for manual modification" })
  @IsOptional()
  @IsString()
  changelog?: string;
}
