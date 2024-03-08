/*
 * move 3d canvas chunks from one redis instance to another
 */
import { createClient, commandOptions } from 'redis';

const urlc = "redis://localhost:6380";
const redisc = createClient({ url: urlc });
const urlt = "redis://localhost:6379";
const redist = createClient({ url: urlt });

const CANVAS_SIZE = 1024;
const THREE_TILE_SIZE = 32;

const CHUNKS_XY = CANVAS_SIZE / THREE_TILE_SIZE;

async function move() {
  await redisc.connect();
  await redist.connect();
  console.log('Moving chunks...');
  for (let x = CHUNKS_XY - 1; x >= 0; x--) {
    for (let y = CHUNKS_XY - 1; y >= 0; y--) {
      const key = `ch:2:${x}:${y}`;
      const chunk = await redisc.get(
        commandOptions({ returnBuffers: true }),
        key,
      );
      if (chunk) {
        const ret = await redist.set(key, Buffer.from(chunk.buffer));
        console.log('Moved Chunk ', key, ' to other redis', ret);
      }
    }
  }
  console.log("done");
}

move();
