import { readAccessPayload } from './jwt';

describe('readAccessPayload', () => {
  it('reads handle from a JWT payload', () => {
    const payload = btoa(JSON.stringify({ sub: 'abc', handle: 'blake', role: 'member' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(readAccessPayload(`hdr.${payload}.sig`)).toEqual({
      sub: 'abc',
      handle: 'blake',
      role: 'member',
    });
  });
});
