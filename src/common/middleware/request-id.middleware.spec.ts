import { randomUUID } from 'crypto';
import type { Response } from 'express';
import {
  REQUEST_ID_HEADER,
  requestIdMiddleware,
  type RequestWithId,
} from './request-id.middleware';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

describe('requestIdMiddleware', () => {
  it('reuses incoming x-request-id', () => {
    const req = {
      header: jest.fn().mockReturnValue('client-id'),
    } as unknown as RequestWithId;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('client-id');
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'client-id');
    expect(next).toHaveBeenCalled();
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('generates a uuid when header is missing', () => {
    const req = {
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as RequestWithId;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('generated-uuid');
    expect(res.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      'generated-uuid',
    );
  });
});
