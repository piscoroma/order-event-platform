async function eventually(fn, timeout = 10000) {
   const deadline = Date.now() + timeout;
   while (Date.now() < deadline) {
      const result = await fn();
      if (result)
         return result;
      await new Promise(r => setTimeout(r, 500));
   }
   throw new Error("Condition not met before timeout");
}

module.exports = {
   eventually
};