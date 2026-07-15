const { connect } = require('@nats-io/transport-node');
const { jetstream, jetstreamManager } = require('@nats-io/jetstream');

function createNatsClient({ logger, configNats }) {
   const { natsUrl } = configNats;
   let nc = null;
   let js = null;
   let jsm = null;

   async function connect_() {
      const url = natsUrl;

      try{
         nc = await connect({servers: url});
      }catch(err){
         throw new Error(`NATS connection failed: ${url}.`, { cause: err });
      }
      js = jetstream(nc);
      jsm = await jetstreamManager(nc);

      logger.info('NATS connected', { url });

      // Gestione disconnessione
      (async () => {
         for await (const s of nc.status()) {
            if (s.type === 'disconnect') logger.warn('NATS disconnected');
            if (s.type === 'reconnect') logger.info('NATS reconnected');
         }
      })();
   }

   async function ensureStream(streamName, subjects) {
      const jsm = await jetstreamManager(nc);
      try {
         await jsm.streams.info(streamName);
         logger.info('NATS stream already exists', { streamName });
      } catch {
         await jsm.streams.add({
            name: streamName,
            subjects,
            retention: 'limits',
            storage: 'file',
            max_age: 60 * 60 * 24 * 7 * 1e9, // 7 giorni in nanosecondi
         });
         logger.info('NATS stream created', { streamName, subjects });
      }
   }

   function getJs() {
      if (!js) throw new Error('NATS JetStream not initialized');
      return js;
   }

   function getJsm() {
      if (!jsm) throw new Error('NATS JetStreamManager not initialized');
      return jsm;
   }

   function getNc() {
      if (!nc) throw new Error('NATS connection not initialized');
      return nc;
   }

   async function close() {
      if (nc){
         await nc.close();
      }
   }

   function isConnected() {
      return nc !== null && !nc.isClosed() && !nc.isDraining();
   }

   return { 
      connect: connect_, 
      ensureStream, 
      getJs, 
      getJsm,
      getNc, 
      close, 
      isConnected
   };
}

module.exports = createNatsClient;