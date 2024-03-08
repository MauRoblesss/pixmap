/**
 * https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/
 */
function forceGC() {
  if (global.gc) {
    const startTime = Date.now();
    global.gc();
    // eslint-disable-next-line no-console
    console.log(`GC took ${Date.now() - startTime}`);
  }
}

export default forceGC;
