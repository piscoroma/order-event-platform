const express = require('express');

const requireRoleMw = require('@order-event-platform/shared/middlewares/requireRole.middleware');

function createAuthRoutes({ authController }) {

   const router = express.Router();

   router.post('/register', authController.register);
   router.post('/login', authController.login);
   router.post('/logout', authController.logout);
   router.post('/refresh', authController.refresh);

   router.get('/validate', authController.validate);

   router.get('/me', authController.getMe);

   return router;
}

module.exports = createAuthRoutes;
