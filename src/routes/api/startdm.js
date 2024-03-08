/*
 *
 * starts a DM session
 *
 */
import logger from '../../core/logger';
import { ChatProvider } from '../../core/ChatProvider';
import { Channel, RegUser } from '../../data/sql';
import { isUserBlockedBy } from '../../data/sql/UserBlock';

async function startDm(req, res) {
  let userId = parseInt(req.body.userId, 10);
  let { userName } = req.body;
  const { user } = req;

  const errors = [];
  const query = {};
  if (userId) {
    if (userId && Number.isNaN(userId)) {
      errors.push('Invalid userId');
    }
    query.id = userId;
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
    errors.push('You can not  DM yourself.');
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
  if (targetUser.blockDm) {
    res.status(401);
    res.json({
      errors: [`${userName} doesn't allow DMs`],
    });
    return;
  }

  /*
   * check if blocked
   */
  if (await isUserBlockedBy(user.id, userId)) {
    res.status(401);
    res.json({
      errors: [`${userName} has blocked you.`],
    });
    return;
  }

  logger.info(
    `Creating DM Channel between ${user.regUser.name} and ${userName}`,
  );
  /*
   * start DM session
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

  const channel = await Channel.findOrCreate({
    where: {
      type: 1,
      dmu1id,
      dmu2id,
    },
    raw: true,
  });
  const ChannelId = channel[0].id;
  const curTime = Date.now();

  const promises = [
    ChatProvider.addUserToChannel(
      user.id,
      ChannelId,
      [userName, 1, curTime, userId],
    ),
    ChatProvider.addUserToChannel(
      userId,
      ChannelId,
      [user.name, 1, curTime, user.id],
    ),
  ];
  await Promise.all(promises);

  res.json({
    channel: {
      [ChannelId]: [
        userName,
        1,
        Date.now(),
        userId,
      ],
    },
  });
}

export default startDm;
