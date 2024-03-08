/*
 *
 * block all private messages
 *
 */
import logger from '../../core/logger';

async function privatize(req, res) {
  const { priv } = req.body;
  const { user } = req;

  const errors = [];
  if (typeof priv !== 'boolean') {
    errors.push('Not defined if setting or unsetting private');
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
    `User ${user.name} set private status to ${priv}`,
  );

  await user.regUser.update({
    priv,
  });

  res.json({
    status: 'ok',
  });
}

export default privatize;
