/*
 *
 * block all private messages
 *
 */
import logger from '../../core/logger';
import socketEvents from '../../socket/socketEvents';

async function blockdm(req, res) {
  const { block } = req.body;
  const { user } = req;

  const errors = [];
  if (typeof block !== 'boolean') {
    errors.push('Not defined if blocking or unblocking');
  }
  if (!user || !user.regUser) {
    errors.push('You are not logged in');
  }
  if (errors.length) {
    res.status(400);
    res.json({
      errors,
    });
    return;
  }

  logger.info(
    `User ${user.name} (un)blocked all dms`,
  );

  await user.regUser.update({
    blockDm: block,
  });

  /*
   * remove all dm channels
   */
  const channels = user.regUser.channel;
  for (let i = 0; i < channels.length; i += 1) {
    const channel = channels[i];
    if (channel.type === 1) {
      const channelId = channel.id;
      const { dmu1id, dmu2id } = channel;
      channel.destroy();
      socketEvents.broadcastRemoveChatChannel(dmu1id, channelId);
      socketEvents.broadcastRemoveChatChannel(dmu2id, channelId);
    }
  }

  res.json({
    status: 'ok',
  });
}

export default blockdm;
