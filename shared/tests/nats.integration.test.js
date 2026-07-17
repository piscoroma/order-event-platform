const createNatsClient = require('../messaging/nats'); // adegua il path
const { startNatsContainer } = require('./utils/nats_testcontainer');
const { mockLogger } = require('./utils/mock_logger');

describe('natsClient (integration)', () => {
   let container, url, client;

   beforeAll(async () => {
      ({ container, url } = await startNatsContainer());
      client = createNatsClient(
         { logger: mockLogger, configNats: { natsUrl: url } 
      });
      await client.connect();
   }, 30000);

   afterAll(async () => {
      await client.close();
      await container.stop();
   });

   test('expose nc, js, jsm after connect', () => {
      expect(client.getNc()).toBeTruthy();
      expect(client.getJs()).toBeTruthy();
      expect(client.getJsm()).toBeTruthy();
   });

   test('ensureStream create a new stream if not exists', async () => {
      await client.ensureStream('TEST_STREAM', ['test.>']);
      const info = await client.getJsm().streams.info('TEST_STREAM');
      expect(info.config.subjects).toEqual(['test.>']);
   });
});