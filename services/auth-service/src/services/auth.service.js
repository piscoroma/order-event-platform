const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const { 
   NotFoundError,
   UnauthorizedError,
   ConflictError
} = require('@order-event-platform/shared/errors/base.errors');

const User = require('../models/user.model');
const RefreshToken = require('../models/refresh-token.model');

const SALT_ROUNDS = 10;

function createAuthService({ logger, config }) {
   
   const generateAccessToken = (user) => {
      return jwt.sign(
         {
            userId: user._id,
            email: user.email,
            role: user.role
         },
         config.jwt.privateKey,
         { 
            algorithm: 'ES256', 
            expiresIn: config.jwt.expiresIn 
         }
      )
   }
   const generateRefreshToken = () => {
      return crypto.randomBytes(64).toString('hex');
   } 

   async function register(email, password, role='user') {
      const existing = await User.findOne({ email });
      if(existing)
         throw new ConflictError("Email already in use");
      
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      const user = await User.create({ email, passwordHash, role });

      logger.info('User successfully registered', {email});
      
      return {
         userId: user._id,
         email: user.email
      }
   }

   async function login(email, password) {
      const user = await User.findOne({ email });
      if(!user)
         throw new UnauthorizedError("Invalid credentials");
      
      const valid = await bcrypt.compare(password, user.passwordHash);
      if(!valid)
         throw new UnauthorizedError("Invalid credentials");

      const accessToken = generateAccessToken(user);
      
      const refreshTokenValue = generateRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(
         expiresAt.getDate() + config.refreshToken.expiresInDays
      )
      
      await RefreshToken.create({
         token: refreshTokenValue,
         userId: user._id,
         expiresAt,
      })

      return {
         access_token: accessToken,
         refresh_token: refreshTokenValue,
         token_type: 'Bearer',
         expires_in: config.jwt.expiresIn
      }

   }

   async function refresh(refreshToken) {
      const stored = await RefreshToken.findOne({ token: refreshToken });
      if( !stored || !stored.isValid() )
         throw new UnauthorizedError("Invalid or expired refresh token");
      
      const user = await User.findById(stored.userId);
      if(!user)
         throw new UnauthorizedError("User not found");

      const accessToken = generateAccessToken(user);

      return {
         access_token: accessToken,
         token_type: 'Bearer',
         expires_in: config.jwt.expiresIn
      }
   }

   async function logout(refreshToken) {
      const stored = await RefreshToken.findOne({ token: refreshToken });
      if( !stored || !stored.isValid() )
         throw new UnauthorizedError("Invalid or expired refresh token");

      stored.revokedAt = new Date();
      await stored.save();
   }

   async function validate(authorizationHeader) {
      if (!authorizationHeader || !authorizationHeader.startsWith('Bearer '))
         throw new UnauthorizedError("Missing or malformed Authorization header");

      const token = authorizationHeader.slice(7);
      try{
         const payload = jwt.verify(token, config.jwt.publicKey);
         return payload;
      }catch{
         throw new UnauthorizedError("Invalid or expired access token");
      }
   }

   async function getMe(userId) {
      const user = await User.findById(userId).select('-passwordHash');
      if( !user )
         throw new NotFoundError("User not found");

      return user;
   }

   return {
      register,
      login,
      refresh,
      logout,
      validate,
      getMe
   }
}

module.exports = createAuthService;