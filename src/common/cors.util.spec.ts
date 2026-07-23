import {
  corsOriginDelegate,
  isCorsOriginAllowed,
  parseCorsOrigins,
} from './cors.util';

describe('cors.util', () => {
  it('parses comma-separated origins', () => {
    expect(
      parseCorsOrigins(' http://localhost:5173 , https://app.example.com '),
    ).toEqual(['http://localhost:5173', 'https://app.example.com']);
  });

  it('allows requests without an Origin header', () => {
    expect(isCorsOriginAllowed(undefined, ['http://localhost:5173'])).toBe(
      true,
    );
  });

  it('rejects origins outside the whitelist', () => {
    const callback = jest.fn();
    process.env.CORS_ORIGINS = 'http://localhost:5173';

    corsOriginDelegate('https://evil.example.com', callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });
});
