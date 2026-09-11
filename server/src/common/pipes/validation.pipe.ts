import {
  ValidationPipe as NestValidationPipe,
  BadRequestException,
} from "@nestjs/common";

export const createValidationPipe = (): NestValidationPipe => {
  return new NestValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const formatted = errors.map((err) => ({
        property: err.property,
        constraints: err.constraints,
      }));
      return new BadRequestException({
        message: "Validation failed",
        errors: formatted,
      });
    },
  });
};
