import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();

  function mockContext(statusCode = 200): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
        getRequest: () => ({ originalUrl: '/test', url: '/test' }),
      }),
    } as unknown as ExecutionContext;
  }

  it('wraps JSON payloads in the standard envelope', async () => {
    const next: CallHandler = { handle: () => of({ id: 1 }) };
    const result = await firstValueFrom(
      interceptor.intercept(mockContext(), next),
    );

    expect(result).toMatchObject({
      success: true,
      statusCode: 200,
      data: { id: 1 },
    });
  });

  it('passes StreamableFile through without JSON wrapping', async () => {
    const file = new StreamableFile(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const next: CallHandler = { handle: () => of(file) };
    const result = await firstValueFrom(
      interceptor.intercept(mockContext(), next),
    );

    expect(result).toBe(file);
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
