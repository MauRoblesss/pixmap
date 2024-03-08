/*
 * request password change
 */


import { validatePassword } from '../../../utils/validation';
import { compareToHash } from '../../../utils/hash';

function validate(newPassword, gettext) {
  const errors = [];

  const newpassworderror = gettext(validatePassword(newPassword));
  if (newpassworderror) errors.push(newpassworderror);

  return errors;
}

export default async (req, res) => {
  const { newPassword, password } = req.body;
  const { t, gettext } = req.ttag;
  const errors = validate(newPassword, gettext);
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

  const currentPassword = user.regUser.password;
  if (currentPassword && !compareToHash(password, currentPassword)) {
    res.status(400);
    res.json({
      errors: [t`Incorrect password!`],
    });
    return;
  }

  await user.regUser.update({ password: newPassword });

  res.json({
    success: true,
  });
};
