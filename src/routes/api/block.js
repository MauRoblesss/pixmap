/*
 *
 * blocks and unblocks a user
 *
 */

import logger from '../../core/logger';
import socketEvents from '../../socket/socketEvents';
import { RegUser, UserBlock, Channel } from '../../data/sql';

async function block(req, res) {
  let userId = parseInt(req.body.userId, 10);
  let { userName } = req.body;
  const { block: blocking } = req.body;
  const { user } = req;

  const errors = [];
  const query = {};
  if (userId) {
    if (userId && Number.isNaN(userId)) {
      errors.push('Invalid userId');
    }
    query.id = userId;
  }
  if (typeof blocking !== 'boolean') {
    errors.push('Not defined if blocking or unblocking');
  }
  if (userName) {
    query.name = userName;
  }
  if (!userName && !userId) {
    errors.push('No userId or userName defined');
  }
  if (!user || !user.regUser) {
    errors.push('You are not logged in');
  }
  if (user && userId && user.id === userId) {
    errors.push('You can not block yourself.');
  }
  if (errors.length) {
    res.status(400);
    res.json({
      errors,
    });
    return;
  }

  const targetUser = await RegUser.findOne({
    where: query,
    attributes: [
      'id',
      'name',
    ],
    raw: true,
  });
  if (!targetUser) {
    res.status(401);
    res.json({
      errors: ['Target user does not exist'],
    });
    return;
  }
  userId = targetUser.id;
  userName = targetUser.name;

  let ret;
  if (blocking) {
    ret = await UserBlock.findOrCreate({
      where: {
        uid: user.id,
        buid: userId,
      },
      raw: true,
      attributes: ['uid'],
    });
  } else {
    ret = await UserBlock.destroy({
      where: {
        uid: user.id,
        buid: userId,
      },
    });
  }

  /*
   * delete possible dm channel
   */
  let dmu1id;
  let dmu2id;
  if (user.id > userId) {
    dmu1id = userId;
    dmu2id = user.id;
  } else {
    dmu1id = user.id;
    dmu2id = userId;
  }

  const channel = await Channel.findOne({
    where: {
      type: 1,
      dmu1id,
      dmu2id,
    },
  });
  if (channel) {
    const channelId = channel.id;
    channel.destroy();
    socketEvents.broadcastRemoveChatChannel(user.id, channelId);
    socketEvents.broadcastRemoveChatChannel(userId, channelId);
  }

  if (ret) {
    res.json({
      status: 'ok',
    });
  } else {
    res.status(502);
    res.json({
      errors: ['Could not (un)block user'],
    });
    logger.info(
      `User ${user.name} (un)blocked ${userName}`,
    );
  }
}

export default block;
