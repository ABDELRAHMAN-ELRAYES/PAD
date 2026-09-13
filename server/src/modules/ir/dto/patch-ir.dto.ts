import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PatchIRDto {
  @ApiProperty({ description: "Natural language change request prompt" })
  @IsNotEmpty()
  @IsString()
  requestText!: string;
}
