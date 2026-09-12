import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { DocumentStatus } from "../types/IDocument";

export class UpdateDocumentDto {
  @ApiProperty({ required: false, description: "Document title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: "HTML/Markdown document content" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false, enum: ["draft", "published"], description: "Document status" })
  @IsOptional()
  @IsEnum(["draft", "published"])
  status?: DocumentStatus;

  @ApiProperty({ required: false, description: "Changelog description for this version" })
  @IsOptional()
  @IsString()
  changelog?: string;
}
