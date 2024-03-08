/**
 *
 * Userdata that gets sent to the client on
 * various api endpoints.
 *
 */
import getLocalizedCanvases from '../canvasesDesc';
import { USE_MAILER } from './config';
import chatProvider from './ChatProvider';


export default async function getMe(user, lang) {
  const userdata = await user.getUserData();
  // sanitize data
  const {
    name, mailVerified,
  } = userdata;
  if (!name) userdata.name = null;
  const messages = [];
  if (USE_MAILER && name && !mailVerified) {
    messages.push('not_verified');
  }
  if (messages.length > 0) {
    userdata.messages = messages;
  }
  delete userdata.mailVerified;

  userdata.canvases = getLocalizedCanvases(lang);
  userdata.channels = {
    ...chatProvider.getDefaultChannels(lang),
    ...userdata.channels,
  };

  return userdata;
}
