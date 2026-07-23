import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  function createHost(requestId?: string) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const response = { status, setHeader, json };
    const request = {
      method: 'GET',
      originalUrl: '/demo',
      url: '/demo',
      requestId,
      header: jest.fn().mockReturnValue(requestId),
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status, setHeader };
  }

  it('includes requestId on HttpException payload', () => {
    const { host, json, status, setHeader } = createHost('req-123');

    filter.catch(new HttpException('Nope', HttpStatus.BAD_REQUEST), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'req-123');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Nope',
        requestId: 'req-123',
      }),
    );
  });

  it('sanitizes unhandled errors and keeps requestId', () => {
    const { host, json } = createHost('req-456');

    filter.catch(new Error('secret stack'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error.',
        requestId: 'req-456',
      }),
    );
  });
});
