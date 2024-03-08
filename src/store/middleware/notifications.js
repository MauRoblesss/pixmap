/**
 * Notifications
 *
 */
import { t } from 'ttag';

export default (store) => (next) => (action) => {
  try {
    if (!document.hasFocus()) {
      switch (action.type) {
        case 's/REC_ME': {
          if (window.Notification
            && Notification.permission !== 'granted'
            && Notification.permission !== 'denied'
          ) {
            Notification.requestPermission();
          }
          break;
        }

        case 'COOLDOWN_END': {
          const state = store.getState();

          // do not notify if last cooldown end was <15s ago
          const { lastCoolDownEnd } = state.user;
          if (lastCoolDownEnd
            && lastCoolDownEnd + 15000 > Date.now()) {
            break;
          }

          if (window.Notification && Notification.permission === 'granted') {
            // eslint-disable-next-line no-new
            new Notification(t`Your next pixels are ready`, {
              icon: '/tile.png',
              silent: false,
              vibrate: [200, 100],
              body: t`You can now place more on pixmap.fun :)`,
            });
          }
          break;
        }

        case 's/REC_CHAT_MESSAGE': {
          const state = store.getState();
          const { chatNotify } = state.gui;
          if (!chatNotify) break;

          const { isPing } = action;
          if (!isPing) break;
          const { name } = action;

          if (window.Notification && Notification.permission === 'granted') {
            // eslint-disable-next-line no-new
            new Notification(`${name} ${t`mentioned you`}`, {
              icon: '/tile.png',
              silent: false,
              vibrate: [200, 100],
              body: t`You have new messages in chat`,
            });
          }
          break;
        }

        default:
          // nothing
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
  return next(action);
};
