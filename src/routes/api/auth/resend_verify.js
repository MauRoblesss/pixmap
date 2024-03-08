/*
 * request resend of verification mail
 */

import mailProvider from '../../../core/MailProvider';
import { getHostFromRequest } from '../../../utils/ip';

export default async (req, res) => {
  const { user, lang } = req;
  if (!user || !user.regUser) {
    res.status(401);
    res.json({
      errors: ['You are not authenticated.'],
    });
    return;
  }

  const { name, email, mailVerified } = user.regUser;
  if (mailVerified) {
    res.status(400);
    res.json({
      errors: ['You are already verified.'],
    });
    return;
  }

  const host = getHostFromRequest(req);

  const error = await mailProvider.sendVerifyMail(email, name, host, lang);
  if (error) {
    res.status(400);
    res.json({
      errors: [error],
    });
    return;
  }
  res.json({
    success: true,
  });
};
