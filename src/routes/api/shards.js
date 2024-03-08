/*
 * print information for shards
 */
import socketEvents from '../../socket/socketEvents';

async function shards(req, res, next) {
  try {
    if (!socketEvents.isCluster) {
      res.status(400).json({
        errors: ['Not running as cluster'],
      });
      return;
    }
    res.status(200).json(socketEvents.shardOnlineCounters);
  } catch (err) {
    next(err);
  }
}

export default shards;
