const bcrypt = require('bcrypt')
const crypto = require('crypto')
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')

const { 
   NotFoundError,
   UnauthorizedError,
   ConflictError
} = require('@order-event-platform/shared/errors/base.errors');

const User = require('../src/models/user.model');
const RefreshToken = require('../src/models/refresh-token.model');
const createAuthService = require('../src/services/auth.service');
const { mockLogger } = require('./utils/mock_logger')


const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const authService = createAuthService({ 
   logger: mockLogger,
   config: {
      jwt: { privateKey, publicKey, expiresIn: '15m' },
      refreshToken: { expiresInDays: 7 }
   }
});

async function createUser(email, password, role) {
   const SALT_ROUNDS = 10;
   const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
   return User.create({ email, passwordHash, role });
}

async function createExpiredRefreshToken(userId) {
   const token = crypto.randomBytes(64).toString('hex');
   const expiresAt = new Date(Date.now() - 1000); // already expired
   await RefreshToken.create({ token, userId, expiresAt });
   return token;
}

async function createRevokedRefreshToken(userId) {
   const token = crypto.randomBytes(64).toString('hex');
   const expiresAt = new Date(Date.now() + 86400000);
   await RefreshToken.create({ token, userId, expiresAt, revokedAt: new Date() });
   return token;
}

describe('register', () => {

   test('register a new user and return email and userId', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "user";
      const result = await authService.register(email, password, role);
      
      expect(mongoose.Types.ObjectId.isValid(result.userId)).toBe(true);
      expect(result.email).toBe(email);

      const userDb = await User.findById(result.userId);
      //check directly on mongo
      expect(userDb.email).toBe(email); 
      expect(userDb.role).toBe(role); 
   });

   test('check that password is not stored in clear', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "user";
      const result = await authService.register(email, password, role);
      
      const userDb = await User.findById(result.userId);
      //check directly on mongo
      expect(userDb.passwordHash).not.toBe(password); 
   });

   test('throw ConflictError if email already exists, same role', async () => {
      await authService.register("test@example.com", "qwe123", "user");
      await expect(
         authService.register("test@example.com", "qwe456", "user")
      ).rejects.toThrow(ConflictError);
   });

   test('throw ConflictError if email already exists, different role', async () => {
      await authService.register("test@example.com", "qwe123", "user");
      await expect(
         authService.register("test@example.com", "qwe456", "admin")
      ).rejects.toThrow(ConflictError);
   });

   test('set role "user" as default if not specified', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const result = await authService.register(email, password);
      
      const userDb = await User.findById(result.userId);
      //check directly on mongo
      expect(userDb.role).toBe("user"); 
   });

   test('accept role "admin" if specified', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const result = await authService.register(email, password, role);
      
      const userDb = await User.findById(result.userId);
      //check directly on mongo
      expect(userDb.role).toBe("admin");
   });

   test('return ValidationError if a not valid role is specified', async () => {
      await expect(
         authService.register("test@example.com", "qwe456", "root")
      ).rejects.toThrow(mongoose.Error.ValidationError);
   });

});

describe('login', () => {
 
   test('return access_token, refresh_token and metadata', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "user";
      await createUser(email, password, role);

      const result = await authService.login(email, password);
 
      expect(result).toMatchObject({
         token_type: 'Bearer',
         expires_in: '15m',
      });
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
   });

   test('access token contains userId, email and role', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const user = await createUser(email, password, role);

      const { access_token } = await authService.login(email, password);
 
      const payload = jwt.verify(access_token, publicKey);
      expect(mongoose.Types.ObjectId.isValid(payload.userId)).toBe(true);
      expect(payload.userId).toBe(user._id.toString());
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
   });

   test('throw UnauthorizedError if user not found', async () => {
      await expect(
         authService.login('nobody@example.com', 'qwe123')
      ).rejects.toThrow(UnauthorizedError);
   });

   test('throw UnauthorizedError if password is wrong', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      await expect(
         authService.login(email, 'wrongpassword')
      ).rejects.toThrow(UnauthorizedError);
   });

   test('user not found and wrong password throw the same error (no user enumeration)', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);
 
      const errNotFound = await authService.login(
         'nobody@example.com', 'qwe123'
      ).catch(e => e)
      const errWrongPwd = await authService.login(
         'test@example.com', 'wrongpassword'
      ).catch(e => e)
 
      expect(errNotFound.message).toBe(errWrongPwd.message);
   });

   test('refresh token is saved on DB', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const user = await createUser(email, password, role);
      const { refresh_token } = await authService.login(email, password);
 
      const stored = await RefreshToken.findOne({ token: refresh_token });
      expect(stored).not.toBeNull();
      expect(stored.userId.toString()).toBe(user._id.toString());
      expect(stored.expiresAt).toBeInstanceOf(Date);
      expect(stored.revokedAt).toBeNull();
   })

   test('refresh token expires in the configured days', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      const before = new Date();
      const { refresh_token } = await authService.login(email, password);
      const after = new Date();
 
      const stored = await RefreshToken.findOne({ token: refresh_token });
      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 7);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + 7);
 
      expect(stored.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(stored.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
   })

});

describe('refresh', () => {
 
   test('return a new access token for a valid refresh token', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      const { refresh_token } = await authService.login(email, password);
 
      const result = await authService.refresh(refresh_token);
 
      expect(result.access_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe('15m');
   });
 
   test('new access token contains correct payload', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const user = await createUser(email, password, role);

      const { refresh_token } = await authService.login(email, password);
 
      const { access_token } = await authService.refresh(refresh_token);
 
      const payload = jwt.verify(access_token, publicKey);
      expect(payload.userId).toBe(user._id.toString());
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
   });
 
   test('throw UnauthorizedError if refresh token is not found', async () => {
      await expect(
         authService.refresh('nonexistent-token')
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if refresh token is expired', async () => {
      const user = await createUser("test@example.com", "qwe123", "user");
      const expiredToken = await createExpiredRefreshToken(user._id);
 
      await expect(
         authService.refresh(expiredToken)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if refresh token is revoked', async () => {
      const user = await createUser("test@example.com", "qwe123", "user");
      const revokedToken = await createRevokedRefreshToken(user._id);
 
      await expect(
         authService.refresh(revokedToken)
      ).rejects.toThrow(UnauthorizedError);
   });
 
});

describe('logout', () => {
 
   test('revoke the refresh token by setting revokedAt', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      const { refresh_token } = await authService.login(email, password);
      await authService.logout(refresh_token);

      const stored = await RefreshToken.findOne({ token: refresh_token });
      expect(stored.revokedAt).toBeInstanceOf(Date);
   });

   test('revoke the refresh token by setting revokedAt', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      const { refresh_token } = await authService.login(email, password);
      await authService.logout(refresh_token);

      const stored = await RefreshToken.findOne({ token: refresh_token });
      expect(stored.revokedAt).toBeInstanceOf(Date);
   });

   test('revoked token cannot be used for refresh', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      await createUser(email, password, role);

      const { refresh_token } = await authService.login(email, password);
 
      await authService.logout(refresh_token);
 
      await expect(
         authService.refresh(refresh_token)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if refresh token not found', async () => {
      await expect(
         authService.logout('nonexistent-token')
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if refresh token is already revoked', async () => {
      const user = await createUser("test@example.com", "qwe123", "user");
      const revokedToken = await createRevokedRefreshToken(user._id);
 
      await expect(
         authService.logout(revokedToken)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if refresh token is expired', async () => {
      const user = await createUser("test@example.com", "qwe123", "user");
      const expiredToken = await createExpiredRefreshToken(user._id);
 
      await expect(
         authService.logout(expiredToken)
      ).rejects.toThrow(UnauthorizedError);
   });
 
});

describe('validate', () => {
 
   test('return payload for a valid token', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const user = await createUser(email, password, role);
      const { access_token } = await authService.login(email, password);
 
      const payload = await authService.validate(`Bearer ${access_token}`);
 
      expect(payload.userId).toBe(user._id.toString());
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
   })
 
   test('throw UnauthorizedError if Authorization header is missing', async () => {
      await expect(
         authService.validate(undefined)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if Authorization header is malformed (no Bearer)', async () => {
      await expect(
         authService.validate('Basic abc123')
      ).rejects.toThrow(UnauthorizedError);
   })
 
   test('throw UnauthorizedError if token is expired', async () => {
      const expiredToken = jwt.sign(
         { userId: 'user-id-123', email: 'test@example.com', role: 'user' },
         privateKey,
         { algorithm: 'ES256', expiresIn: '0ms' }
      );
      await new Promise(r => setTimeout(r, 10));
 
      await expect(
         authService.validate(`Bearer ${expiredToken}`)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if token is signed with a different key', async () => {
      const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('ec', {
         namedCurve: 'P-256',
         privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const token = jwt.sign(
         { userId: 'user-id-123' },
         otherPrivateKey,
         { algorithm: 'ES256', expiresIn: '15m' }
      );
 
      await expect(
         authService.validate(`Bearer ${token}`)
      ).rejects.toThrow(UnauthorizedError);
   });
 
   test('throw UnauthorizedError if token is tampered', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const { access_token } = await authService.login(email, password).catch(async () => {
         await createUser(email, password, role);
         return authService.login(email, password);
      });
 
      const [header, payload, signature] = access_token.split('.');
      const tamperedToken = `${header}.${payload}tampered.${signature}`;
 
      await expect(
         authService.validate(`Bearer ${tamperedToken}`)
      ).rejects.toThrow(UnauthorizedError);
   });
 
});

describe('getMe', () => {
 
   test('return user data for a valid userId', async () => {
      const email = "test@example.com";
      const password = "qwe123";
      const role = "admin";
      const user = await createUser(email, password, role);
 
      const storedUser = await authService.getMe(user._id);
 
      expect(storedUser.email).toBe(email);
      expect(storedUser.role).toBe(role);
      expect(mongoose.Types.ObjectId.isValid(storedUser._id)).toBe(true);
   });
 
   test('does not return passwordHash', async () => {
      const user = await createUser("test@example.com", "qwe123", "user");
 
      const storedUser = await authService.getMe(user._id);
 
      expect(storedUser.passwordHash).toBeUndefined();
   });
 
   test('throw NotFoundError if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
 
      await expect(
         authService.getMe(nonExistentId)
      ).rejects.toThrow(NotFoundError);
   });
 
})