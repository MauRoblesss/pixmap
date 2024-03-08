/**
 * send initial data to player
 */


import getMe from '../../core/me';

export default async (req, res, next) => {
  try {
    const { user, lang } = req;
    const userdata = await getMe(user, lang);
    user.updateLogInTimestamp();
    res.json(userdata);
  } catch (error) {
    next(error);
  }
};
