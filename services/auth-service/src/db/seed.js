const bcrypt = require('bcrypt')

const User = require('../models/user.model')

const SALT_ROUNDS = 10;

async function seedData({ logger }) {
   const count = await User.countDocuments();
   if (count > 0)
      return;

   const users = [
      { email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { email: 'user@example.com', password: 'user123', role: 'user' },
   ];

   for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await User.findOneAndUpdate(
         { email: u.email },
         { email: u.email, passwordHash, role: u.role },
         { upsert: true, new: true }
      )
      logger.info(`Seeded: ${u.email}`);
   }


   logger.info('Seed data inserted', { count: users.length });
}

module.exports = { seedData };