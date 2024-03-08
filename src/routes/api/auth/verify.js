/*
 * verify mail address
 */

import socketEvents from '../../../socket/socketEvents';
import getHtml from '../../../ssr/RedirectionPage';
import { getHostFromRequest } from '../../../utils/ip';
import { MailProvider } from '../../../core/MailProvider';
import { validateEMail } from '../../../utils/validation';

export default async (req, res) => {
  const { email, token } = req.query;
  const { lang } = req;
  const { t } = req.ttag;

  const host = getHostFromRequest(req);
  const error = validateEMail(email);
  if (!error) {
    const name = await MailProvider.verify(email, token);
    if (name) {
      // notify websocket to reconnect user
      // that's a bit counter productive because it directly links to the websocket
      socketEvents.reloadUser(name);
      // ---
      const index = getHtml(
        t`Mail verification`,
        t`You are now verified :)`,
        host, lang,
      );
      res.status(200).send(index);
      return;
    }
  }
  // eslint-disable-next-line max-len
  const index = getHtml(t`Mail verification`, t`Your mail verification code is invalid or already expired :(, please request a new one.`, host, lang);
  res.status(400).send(index);
};
