function requireRoleMw(...roles) {
   return function (req, res, next) {
      const userRole = req.headers['x-user-role'];

      if (!userRole) {
         return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!roles.includes(userRole)) {
         return res.status(403).json({ message: 'Forbidden' });
      }

      next();
   };
}

module.exports = requireRoleMw;