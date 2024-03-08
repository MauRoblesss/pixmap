/*
 * request password reset mail
 */


import mailProvider from '../../../core/MailProvider';
import { validateEMail } from '../../../utils/validation';
import { getHostFromRequest } from '../../../utils/ip';

async function validate(email, gettext) {
  const errors = [];
  const emailerror = gettext(validateEMail(email));
  if (emailerror) errors.push(emailerror);

  return errors;
}

export default async (req, res) => {
  const ip = req.trueIp;
  const { email } = req.body;
  const { gettext } = req.ttag;

  const errors = validate(email, gettext);
  if (errors.length > 0) {
    res.status(400);
    res.json({
      errors,
    });
    return;
  }
  const host = getHostFromRequest(req);
  const { lang } = req;
  const error = await mailProvider.sendPasswdResetMail(email, ip, host, lang);
  if (error) {
    res.status(400);
    res.json({
      errors: [error],
    });
    return;
  }
  res.status(200);
  res.json({
    success: true,
  });
};
