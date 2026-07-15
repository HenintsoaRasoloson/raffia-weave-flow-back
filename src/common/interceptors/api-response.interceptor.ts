import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ApiSuccessResponse<T> = {
  success: true;
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
  data: T;
};

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    const httpCtx = context.switchToHttp();
    const response = httpCtx.getResponse<Response>();
    const request = httpCtx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        // Binary downloads must stay raw (Content-Type image/*, PDF, etc.).
        if (data instanceof StreamableFile) {
          return data;
        }

        if (this.isAlreadyWrapped(data)) {
          return data;
        }

        const statusCode = response.statusCode;

        if (statusCode === 204) {
          return undefined as unknown as T;
        }

        return {
          success: true,
          statusCode,
          message: this.resolveStatusLabel(statusCode),
          path: request.originalUrl ?? request.url,
          timestamp: new Date().toISOString(),
          data,
        };
      }),
    );
  }

  private isAlreadyWrapped(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      'statusCode' in data &&
      'timestamp' in data
    );
  }

  private resolveStatusLabel(statusCode: number): string {
    if (statusCode === 201) {
      return 'Created.';
    }

    if (statusCode === 204) {
      return 'No content.';
    }

    return 'Success.';
  }
}
