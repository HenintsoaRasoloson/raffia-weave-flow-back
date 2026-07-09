import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ApiErrorResponse = {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);
    const error = this.resolveErrorCode(exception, statusCode);

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      error,
      message,
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(payload);
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error.';
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return exception.message || 'Unexpected error.';
  }

  private resolveErrorCode(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (response && typeof response === 'object') {
        const error = (response as { error?: unknown }).error;
        if (typeof error === 'string' && error.trim().length > 0) {
          return this.normalizeError(error);
        }
      }
    }

    const statusLabel = HttpStatus[statusCode];
    if (typeof statusLabel === 'string') {
      return this.normalizeError(statusLabel);
    }

    return 'INTERNAL_SERVER_ERROR';
  }

  private normalizeError(value: string): string {
    return value.trim().replace(/\s+/g, '_').toUpperCase();
  }
}
