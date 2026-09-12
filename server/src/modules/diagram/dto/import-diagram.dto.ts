import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ImportDiagramDto {
  @ApiProperty({ description: "Custom Mermaid code to import" })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ required: false, description: "Diagram title" })
  @IsOptional()
  @IsString()
  title?: string;
}
