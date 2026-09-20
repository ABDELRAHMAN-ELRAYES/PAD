import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateIterationMessageDto {
  @ApiProperty({
    description: "Message content or feedback from the user",
    example: "Add an audit log table with user_id, action, and timestamp",
  })
  @IsNotEmpty({ message: "Message content is required" })
  @IsString()
  content!: string;
}
