import {
  buildContainsOr,
  containsFilter,
  equalsFilter,
  escapeLikePattern,
  foldDiacritics,
  normalizeEnumParam,
  prepareSearchTerm,
  trimQueryValue,
} from './search.util';

describe('search.util', () => {
  it('trims and collapses whitespace', () => {
    expect(trimQueryValue('  hello   world  ')).toBe('hello world');
    expect(trimQueryValue('   ')).toBeUndefined();
  });

  it('escapes LIKE wildcards', () => {
    expect(escapeLikePattern('100%_test')).toBe('100\\%\\_test');
    expect(escapeLikePattern('path\\to')).toBe('path\\\\to');
  });

  it('prepares search terms safely', () => {
    expect(prepareSearchTerm('  Café  ')).toBe('Café');
    expect(prepareSearchTerm('%_')).toBe('\\%\\_');
  });

  it('folds French diacritics', () => {
    expect(foldDiacritics('Éléphant')).toBe('Elephant');
    expect(foldDiacritics('façade')).toBe('facade');
  });

  it('normalizes enum params', () => {
    expect(normalizeEnumParam(' en production ')).toBe('EN_PRODUCTION');
    expect(normalizeEnumParam('émise')).toBe('EMISE');
    expect(normalizeEnumParam('b2b')).toBe('B2B');
  });

  it('builds insensitive Prisma filters', () => {
    expect(containsFilter('test')).toEqual({
      contains: 'test',
      mode: 'insensitive',
    });
    expect(equalsFilter('ABC')).toEqual({
      equals: 'ABC',
      mode: 'insensitive',
    });
  });

  it('builds OR contains filters for multiple fields', () => {
    expect(buildContainsOr(['name', 'email'], 'abc')).toEqual([
      { name: { contains: 'abc', mode: 'insensitive' } },
      { email: { contains: 'abc', mode: 'insensitive' } },
    ]);
  });
});
