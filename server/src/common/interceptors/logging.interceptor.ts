import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const correlationId = req.headers["x-correlation-id"] || "-";
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = res.statusCode;
          this.logger.log(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const statusCode = err.status || 500;
          this.logger.error(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms : ${err.message}`,
          );
        },
      }),
    );
  }
}
