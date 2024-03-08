/*
 * request password change
 */

import socketEvents from '../../../socket/socketEvents';
import { RegUser } from '../../../data/sql';
import { validatePassword } from '../../../utils/validation';
import { checkIfMuted } from '../../../data/redis/chat';
import { compareToHash } from '../../../utils/hash';

function validate(password, gettext) {
  const errors = [];

  const passworderror = gettext(validatePassword(password));
  if (passworderror) errors.push(passworderror);

  return errors;
}

export default async (req, res) => {
  const { password } = req.body;
  const { t, gettext } = req.ttag;
  const errors = await validate(password, gettext);
  if (errors.length > 0) {
    res.status(400);
    res.json({
      errors,
    });
    return;
  }

  const { user } = req;
  if (!user || !user.regUser) {
    res.status(401);
    res.json({
      errors: [t`You are not authenticated.`],
    });
    return;
  }
  const { id, name } = user;

  const mutedTtl = await checkIfMuted(id);
  if (mutedTtl !== -2) {
    res.status(403);
    res.json({
      errors: [t`Muted users can not delete their account.`],
    });
    return;
  }

  const currentPassword = user.regUser.password;
  if (!currentPassword || !compareToHash(password, currentPassword)) {
    res.status(400);
    res.json({
      errors: [t`Incorrect password!`],
    });
    return;
  }


  req.logout((err) => {
    if (err) {
      res.status(500);
      res.json({
        errors: [t`Server error when logging out.`],
      });
      return;
    }

    RegUser.destroy({ where: { id } });

    socketEvents.reloadUser(name);

    res.status(200);
    res.json({
      success: true,
    });
  });
};
