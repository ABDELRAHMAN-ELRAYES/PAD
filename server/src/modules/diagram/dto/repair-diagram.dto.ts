import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RepairDiagramDto {
  @ApiProperty({ description: "Mermaid code to repair" })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ required: false, description: "Parser error message" })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
