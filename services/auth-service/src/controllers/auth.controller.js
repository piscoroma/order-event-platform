const { ValidationError } = require("@order-event-platform/shared/errors/base.errors");

function createAuthController({ authService }) {

   async function register(req, res) {
      const { email, password } = req.body ?? {};
      if (!email || !password)
         throw new ValidationError(`email and password are required`);
      
      const result = await authService.register(email, password);
      res.status(201).json(result);
   }

   async function login(req, res) {
      const { email, password } = req.body ?? {};
      if (!email || !password)
         throw new ValidationError(`email and password are required`);

      const result = await authService.login(email, password);
      res.json(result);
   }

   async function refresh(req, res) {
      const { refresh_token } = req.body ?? {};
      if (!refresh_token)
         throw new ValidationError(`refresh_token is required`);

      const result = await authService.refresh(refresh_token);
      res.json(result);
   }

   async function logout(req, res) {
      const { refresh_token } = req.body ?? {}
      if (!refresh_token) 
         throw new ValidationError(`refresh_token is required`);
      
      await authService.logout(refresh_token);
      res.status(204).send();
   }

   async function validate(req, res) {
      const authorizationHeader = req.headers['authorization'];
      const payload = await authService.validate(authorizationHeader);
      res.set('x-user-id', payload.userId);
      res.set('x-user-role', payload.role);
      res.status(200).send();
   }

   async function getMe(req, res) {
      const userId = req.headers['x-user-id'];
      const user = await authService.getMe(userId);
      res.json(user);
   }

   return { 
      register,
      login,
      refresh,
      logout,
      validate,
      getMe,
   };

}

module.exports = createAuthController;
