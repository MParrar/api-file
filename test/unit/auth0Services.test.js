jest.mock('../../src/services/auth0Services', () => {
    return {
      auth0: {
        domain: 'mock-domain',
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        scope: 'update:users',
      },
    };
  });
  
  const { auth0 } = require('../../src/services/auth0Services');
  
  describe('Auth0 ManagementClient Configuration', () => {
    it('should have the correct domain', () => {
      expect(auth0.domain).toBe('mock-domain');
    });
  
    it('should have the correct clientId', () => {
      expect(auth0.clientId).toBe('mock-client-id');
    });
  
    it('should have the correct clientSecret', () => {
      expect(auth0.clientSecret).toBe('mock-client-secret');
    });
  
    it('should have the correct scope', () => {
      expect(auth0.scope).toContain('update:users');
    });
  });
  