import { t } from 'ttag';

import Help from './Help';
import Settings from './Settings';
import UserArea from './UserArea';
import Register from './Register';
import CanvasSelect from './CanvasSelect';
import Archive from './Archive';
import Chat from './Chat';
import ForgotPassword from './ForgotPassword';

export default {
  HELP: [Help, t`Help`],
  SETTINGS: [Settings, t`Settings`],
  USERAREA: [UserArea, t`User Area`],
  REGISTER: [Register, t`Registration`],
  FORGOT_PASSWORD: [ForgotPassword, t`Forgot Password`],
  CHAT: [Chat, t`Chat`],
  CANVAS_SELECTION: [CanvasSelect, t`Canvas Selection`],
  ARCHIVE: [Archive, t`Canvas Archive`],
  /* other windows */
};

/*
 * NOTE:
 * set windows that should be accessible via popup / url
 * also in ./popUpAvailable.js
 */
