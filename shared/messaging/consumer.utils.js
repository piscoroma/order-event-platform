const crypto = require('crypto');
const { headers } = require('@nats-io/transport-node');

const { getContext } = require('../observability/context_storage');

function getBackoffMs(attempt) {
   return Math.min(1000 * 2 ** attempt, 30_000);
}

function buildHeaders() {
   const ctx = getContext();
   const h = headers();

   if (ctx?.correlationId) {
      h.set('correlation-id', ctx.correlationId);
   }
   h.set('message-id', crypto.randomUUID());

   return h;
}

module.exports = { 
   getBackoffMs, 
   buildHeaders 
};


