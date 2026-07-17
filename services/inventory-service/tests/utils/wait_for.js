async function waitFor(conditionFn, { timeout = 5000, interval = 50 } = {}) {
   const start = Date.now();
   while (Date.now() - start < timeout) {
      if (await conditionFn()) return;
      await new Promise(r => setTimeout(r, interval));
   }
   throw new Error('waitFor: condition not met within timeout');
}

module.exports = { waitFor };