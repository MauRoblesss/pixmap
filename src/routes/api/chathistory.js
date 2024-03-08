/*
 *
 * returns chat messages of given channel
 *
 */
import chatProvider from '../../core/ChatProvider';

async function chatHistory(req, res) {
  let { cid, limit } = req.query;

  if (!cid || !limit) {
    res.status(400);
    res.json({
      errors: ['cid or limit not defined'],
    });
    return;
  }
  cid = parseInt(cid, 10);
  limit = parseInt(limit, 10);
  if (Number.isNaN(cid) || Number.isNaN(limit)
    || limit <= 0 || limit > 200) {
    res.status(400);
    res.json({
      errors: ['cid or limit not a valid value'],
    });
    return;
  }

  const { user } = req;
  user.lang = req.lang;

  if (!chatProvider.userHasChannelAccess(user, cid)) {
    res.status(401);
    res.json({
      errors: ['You don\'t have access to this channel'],
    });
    return;
  }

  const history = await chatProvider.getHistory(cid, limit);
  res.json({
    history,
  });
}

export default chatHistory;
