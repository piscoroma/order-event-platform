const { GenericContainer, Wait } = require('testcontainers');

async function startNatsContainer() {
   const container = await new GenericContainer('nats:2.10-alpine')
      .withCommand(['-js'])
      .withExposedPorts(4222)
      .withWaitStrategy(Wait.forLogMessage(/Server is ready/))
      .start();

   const url = `nats://${container.getHost()}:${container.getMappedPort(4222)}`;
   return { container, url };
}

module.exports = { startNatsContainer };