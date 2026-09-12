import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class QuestionnaireResponseItemDto {
  @ApiProperty({ required: false, description: "Question UUID" })
  @IsOptional()
  @IsString()
  questionId?: string;

  @ApiProperty({ required: false, description: "Question key" })
  @IsOptional()
  @IsString()
  questionKey?: string;

  @ApiProperty({ required: false, description: "Question label" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: "Answer value (string, array, or object)" })
  @IsNotEmpty()
  value!: any;
}

export class SubmitQuestionnaireDto {
  @ApiProperty({
    type: [QuestionnaireResponseItemDto],
    description: "Array of question responses",
  })
  @IsArray()
  responses!: QuestionnaireResponseItemDto[];
}
