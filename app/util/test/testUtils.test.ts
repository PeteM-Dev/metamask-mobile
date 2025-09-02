import { isQa } from './utils';

describe('testUtils', () => {
  describe('isQa', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('returns true when METAMASK_BUILD_TYPE is qa', () => {
      process.env.METAMASK_BUILD_TYPE = 'qa';
      expect(isQa).toBe(true);
    });

    it('returns true when NODE_ENV is e2e', () => {
      process.env.NODE_ENV = 'e2e';
      expect(isQa).toBe(true);
    });

    it('returns false for production environment', () => {
      process.env.METAMASK_BUILD_TYPE = 'production';
      process.env.NODE_ENV = 'production';
      expect(isQa).toBe(false);
    });

    it('returns false when neither qa nor e2e conditions are met', () => {
      process.env.METAMASK_BUILD_TYPE = 'development';
      process.env.NODE_ENV = 'development';
      expect(isQa).toBe(false);
    });

    it('handles undefined environment variables', () => {
      const testEnv = { ...process.env };
      process.env = {
        NODE_ENV: undefined,
        METAMASK_BUILD_TYPE: undefined,
      } as unknown as NodeJS.ProcessEnv;

      expect(isQa).toBe(false);

      process.env = testEnv;
    });
  });
});
