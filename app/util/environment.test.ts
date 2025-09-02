import { isProduction } from './environment';

describe('environment utils', () => {
  describe('isProduction', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('returns true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('returns false when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      expect(isProduction()).toBe(false);
    });

    it('returns false when NODE_ENV is undefined', () => {
      const testEnv = { ...process.env };
      process.env = { NODE_ENV: undefined } as unknown as NodeJS.ProcessEnv;
      expect(isProduction()).toBe(false);
      process.env = testEnv;
    });

    it('handles edge case with empty NODE_ENV', () => {
      process.env.NODE_ENV = '';
      expect(isProduction()).toBe(false);
    });
  });
});
