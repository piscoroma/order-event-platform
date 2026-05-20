const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

function runWithContext(ctx, fn) {
  return storage.run(ctx, fn);
}

function getContext() {
  return storage.getStore();
}

module.exports = { runWithContext, getContext };
