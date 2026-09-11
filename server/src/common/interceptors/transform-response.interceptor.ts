import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "../types/api-response.type";
import { Request, Response } from "express";

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | any>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If data is already an SSE stream or raw buffer, pass through
        if (req.headers.accept === "text/event-stream" || Buffer.isBuffer(data)) {
          return data;
        }

        // If response already matches ApiResponse shape
        if (data && typeof data === "object" && "success" in data && "status" in data) {
          return data;
        }

        const statusCode = res.statusCode || 200;
        const correlationId = (req.headers["x-correlation-id"] as string) || undefined;

        const transformed: ApiResponse<T> = {
          success: statusCode >= 200 && statusCode < 400,
          status: statusCode,
          data,
          timestamp: new Date().toISOString(),
          correlationId,
        };

        return transformed;
      }),
    );
  }
}
