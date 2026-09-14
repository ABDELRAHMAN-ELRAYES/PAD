import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { WorkflowStepStatus } from "../types/IWorkflow";

export class UpdateWorkflowStepDto {
  @ApiProperty({ required: false, description: "Step title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: "Step description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: "Technical step instructions" })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({
    required: false,
    enum: ["pending", "in_progress", "completed", "blocked", "failed"],
    description: "Step status",
  })
  @IsOptional()
  @IsEnum(["pending", "in_progress", "completed", "blocked", "failed"])
  status?: WorkflowStepStatus;

  @ApiProperty({ required: false, description: "Changelog description" })
  @IsOptional()
  @IsString()
  changelog?: string;
}
