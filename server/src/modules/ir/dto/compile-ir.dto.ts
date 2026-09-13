import { ApiProperty } from "@nestjs/swagger";
import { IsArray } from "class-validator";
import { DiagramType } from "../../diagram/types/IDiagram";

export class CompileIRDto {
  @ApiProperty({
    type: [String],
    description: "Array of diagram types to compile from IR",
    example: ["SYSTEM_ARCHITECTURE", "DATABASE_ERD", "USER_FLOW"],
  })
  @IsArray()
  selectedDiagrams!: DiagramType[];
}
