const mongoose = require('mongoose');
const metrics = require('../observability/metrics');

exports.health = (req, res) => {
   res.json({ status: 'ok' });
};

exports.ready = (req, res) => {
   const dbState = mongoose.connection.readyState;
   if (dbState === 1)
      return res.json({ status: 'ok', db: 'connected' });

   return res.status(503).json({ status: 'degraded', db: 'disconnected' });
};

exports.metrics = async (req, res) => {
   res.set('Content-Type', metrics.register.contentType);
   res.end(await metrics.register.metrics());
};
