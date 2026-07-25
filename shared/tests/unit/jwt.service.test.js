const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const createJwtService = require('../../auth/jwt.service');


describe('JwtService', () => {

   let jwtService;
   let configJwt;

   beforeAll(() => {

      const {
         privateKey,
         publicKey
      } = crypto.generateKeyPairSync('ec', {
         namedCurve: 'prime256v1'
      });

      configJwt = {
         privateKey: privateKey.export({
            type: 'pkcs8',
            format: 'pem'
         }),
         publicKey: publicKey.export({
            type: 'spki',
            format: 'pem'
         }),
         expiresIn: '15m',
         issuer: 'order-event-platform',
         audience: 'order-event-platform-api'
      };

      jwtService = createJwtService({configJwt});

   });

   describe('sign()', () => {

      it('should generate a valid JWT token', () => {
         const payload = {
            userId: '123',
            role: 'admin'
         };
         const token = jwtService.sign(payload);
         expect(token).toBeDefined();

         const decoded = jwt.verify(
            token,
            configJwt.publicKey,
            {
               algorithms: ['ES256'],
               issuer: configJwt.issuer,
               audience: configJwt.audience
            }
         );
         expect(decoded.userId).toBe('123');
         expect(decoded.role).toBe('admin');
         expect(decoded.iss).toBe(configJwt.issuer);
         expect(decoded.aud).toBe(configJwt.audience);
      });

      it('should throw if private key is missing', () => {
         const service = createJwtService({
            configJwt: {
               ...configJwt,
               privateKey: null
            }
         });
         expect(() => service.sign({
            userId: '123'
         }))
         .toThrow(
            'JWT private key not configured'
         );
      });

   });

   describe('verify()', () => {

      it('should verify a valid token', () => {
         const token = jwtService.sign({
            userId: '123'
         });

         const payload = jwtService.verify(token);
         expect(payload.userId).toBe('123');
      });

      it('should reject invalid token', () => {
         expect(
            () => jwtService.verify('invalid-token')
         )
         .toThrow(
            'Invalid or expired access token'
         );
      });

      it('should reject token with wrong audience', () => {
         const token = jwt.sign(
            {
               userId: '123'
            },
            configJwt.privateKey,
            {
               algorithm: 'ES256',
               expiresIn: '15m',
               issuer: configJwt.issuer,
               audience: 'wrong-audience'
            }
         );
         expect(() =>
            jwtService.verify(token)
         )
         .toThrow();
      });

   });

   describe('validate()', () => {

      it('should validate bearer token', () => {
         const token = jwtService.sign({
            userId: '123'
         });

         const payload = jwtService.validate(
            `Bearer ${token}`
         );
         expect(payload.userId).toBe('123');
      });

      it('should reject missing authorization header', () => {
         expect(() =>
            jwtService.validate(null)
         )
         .toThrow(
            'Missing or malformed Authorization header'
         );
      });

      it('should reject malformed authorization header', () => {
         expect(() =>
            jwtService.validate('Basic abc')
         )
         .toThrow(
            'Missing or malformed Authorization header'
         );
      });

   });

});