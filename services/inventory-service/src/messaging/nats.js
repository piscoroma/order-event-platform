const { connect, StringCodec, JSONCodec } = require('nats');

function createNatsClient({ logger, configNats }) {
   const { natsUrl } = configNats;
   let nc = null;
   let js = null;
   const jc = JSONCodec();
   const sc = StringCodec();

   async function connect_() {
      const url = natsUrl;

      nc = await connect({ servers: url });
      js = nc.jetstream();

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
      const jsm = await nc.jetstreamManager();
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

   function getNc() {
      if (!nc) throw new Error('NATS connection not initialized');
      return nc;
   }

   async function close() {
      if (nc){
         await nc.close();
      }
   }

   return { connect: connect_, ensureStream, getJs, getNc, close, jc, sc };
}

module.exports = createNatsClient;