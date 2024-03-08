import Sequelize from 'sequelize';

import logger from '../../../core/logger';
import { RegUser } from '../../../data/sql';
import mailProvider from '../../../core/MailProvider';
import getMe from '../../../core/me';
import { getIPFromRequest, getHostFromRequest } from '../../../utils/ip';
import { checkIfMailDisposable } from '../../../core/isAllowed';
import {
  validateEMail,
  validateName,
  validatePassword,
} from '../../../utils/validation';
import {
  checkCaptchaSolution,
} from '../../../data/redis/captcha';

async function validate(email, name, password, captcha, captchaid, t, gettext) {
  const errors = [];
  const emailerror = gettext(validateEMail(email));
  if (emailerror) {
    errors.push(emailerror);
  } else if (await checkIfMailDisposable(email)) {
    errors.push(t`This email provider is not allowed`);
  }
  const nameerror = validateName(name);
  if (nameerror) errors.push(nameerror);
  const passworderror = gettext(validatePassword(password));
  if (passworderror) errors.push(passworderror);

  if (!captcha || !captchaid) errors.push(t`No Captcha given`);

  let reguser = await RegUser.findOne({ where: { email } });
  if (reguser) errors.push(t`E-Mail already in use.`);
  reguser = await RegUser.findOne({ where: { name } });
  if (reguser) errors.push(t`Username already in use.`);

  return errors;
}

export default async (req, res) => {
  const {
    email, name, password, captcha, captchaid,
  } = req.body;
  const { t, gettext } = req.ttag;
  const errors = await validate(
    email, name, password, captcha, captchaid, t, gettext,
  );

  const ip = getIPFromRequest(req);
  if (!errors.length) {
    const captchaPass = await checkCaptchaSolution(
      captcha, ip, true, captchaid,
    );
    switch (captchaPass) {
      case 0:
        break;
      case 1:
        errors.push(t`You took too long, try again.`);
        break;
      case 2:
        errors.push(t`You failed your captcha`);
        break;
      default:
        errors.push(t`Unknown Captcha Error`);
        break;
    }
  }

  if (errors.length > 0) {
    res.status(400);
    res.json({
      errors,
    });
    return;
  }

  const newuser = await RegUser.create({
    email,
    name,
    password,
    verificationReqAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    lastLogIn: Sequelize.literal('CURRENT_TIMESTAMP'),
  });

  if (!newuser) {
    res.status(500);
    res.json({
      errors: [t`Failed to create new user :(`],
    });
    return;
  }

  logger.info(`Created new user ${name} ${email} ${ip}`);

  const { user, lang } = req;
  user.setRegUser(newuser);
  const me = await getMe(user, lang);

  await req.logIn(user, (err) => {
    if (err) {
      logger.warn(`Login after register error: ${err.message}`);
      res.status(500);
      res.json({
        errors: [t`Failed to establish session after register :(`],
      });
      return;
    }
    const host = getHostFromRequest(req);
    mailProvider.sendVerifyMail(email, name, host, lang);
    res.status(200);
    res.json({
      success: true,
      me,
    });
  });
};
