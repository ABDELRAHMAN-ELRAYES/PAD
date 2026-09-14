import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateArtifactDto {
  @ApiProperty({ description: "Artifact file content" })
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiProperty({ required: false, description: "Changelog description" })
  @IsOptional()
  @IsString()
  changelog?: string;
}
