import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  REQUEST_ID_HEADER,
  type RequestWithId,
} from '../middleware/request-id.middleware';

type ApiErrorResponse = {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  requestId?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId =
      request.requestId ?? request.header(REQUEST_ID_HEADER) ?? undefined;

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);
    const error = this.resolveErrorCode(exception, statusCode);

    if (!(exception instanceof HttpException)) {
      this.logger.error({
        msg: 'Unhandled exception',
        requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        error:
          exception instanceof Error
            ? { name: exception.name, message: exception.message, stack: exception.stack }
            : { message: String(exception) },
      });
    } else if (statusCode >= 500) {
      this.logger.error({
        msg: 'HTTP 5xx exception',
        requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        error,
        message,
      });
    }

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      error,
      message,
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };

    if (requestId) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

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
