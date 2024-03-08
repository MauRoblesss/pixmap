/*
  * play sounds using the HTML5 AudioContext
  */


// iPhone needs this
const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = AudioContext && new AudioContext();

export default (store) => (next) => (action) => {
  const state = store.getState();
  const { mute, chatNotify } = state.gui;

  if (!mute && context) {
    switch (action.type) {
      case 'SELECT_COLOR': {
        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        const { currentTime } = context;

        oscillatorNode.type = 'sine';
        oscillatorNode.detune.value = -600;

        oscillatorNode.frequency.setValueAtTime(600, currentTime);
        oscillatorNode.frequency.setValueAtTime(700, currentTime + 0.1);


        gainNode.gain.setValueAtTime(0.3, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.2,
          currentTime + 0.1,
        );

        oscillatorNode.connect(gainNode);
        gainNode.connect(context.destination);

        oscillatorNode.start();
        oscillatorNode.stop(currentTime + 0.2);
        break;
      }

      case 'SET_NOTIFICATION': {
        const { notification } = action;
        if (typeof notification !== 'string') {
          break;
        }
        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        const { currentTime } = context;

        oscillatorNode.type = 'sine';
        oscillatorNode.detune.value = -1200;

        oscillatorNode.frequency.setValueAtTime(500, currentTime);
        oscillatorNode.frequency.setValueAtTime(600, currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.2,
          currentTime + 0.1,
        );

        oscillatorNode.connect(gainNode);
        gainNode.connect(context.destination);

        oscillatorNode.start();
        oscillatorNode.stop(currentTime + 0.2);
        break;
      }

      case 'ALERT': {
        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        const { currentTime } = context;

        if (action.alertType === 'captcha') {
          oscillatorNode.type = 'sine';
          oscillatorNode.detune.value = -600;
          oscillatorNode.start(currentTime);
          oscillatorNode.frequency.setValueAtTime(1479.98, currentTime);
          oscillatorNode.frequency.exponentialRampToValueAtTime(
            493.88,
            currentTime + 0.01,
          );
          oscillatorNode.stop(currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.5, currentTime);
          gainNode.gain.setTargetAtTime(0, currentTime, 0.1);
          oscillatorNode.connect(gainNode);
          gainNode.connect(context.destination);
        } else {
          oscillatorNode.type = 'sine';
          oscillatorNode.detune.value = -900;
          oscillatorNode.start(currentTime);
          oscillatorNode.frequency.setValueAtTime(600, currentTime);
          oscillatorNode.frequency.setValueAtTime(
            1400,
            currentTime + 0.025,
          );
          oscillatorNode.frequency.setValueAtTime(
            1200,
            currentTime + 0.05,
          );
          oscillatorNode.frequency.setValueAtTime(
            900,
            currentTime + 0.075,
          );
          oscillatorNode.stop(currentTime + 0.3);
          const lfo = context.createOscillator();
          lfo.type = 'sine';
          lfo.start(currentTime);
          lfo.frequency.setValueAtTime(2.0, currentTime);
          lfo.stop(currentTime + 0.3);
          lfo.connect(gainNode);
          gainNode.gain.setValueAtTime(1.0, currentTime);
          gainNode.gain.setTargetAtTime(0, currentTime, 3);
          oscillatorNode.connect(gainNode);
          gainNode.connect(context.destination);
        }
        break;
      }

      case 'REC_SET_PXLS': {
        switch (action.retCode) {
          case 0: {
            // successfully placed pixel
            const { palette, selectedColor: color } = state.canvas;
            const colorsAmount = palette.colors.length;

            const clrFreq = 100 + Math.log(color / colorsAmount + 1) * 300;
            const oscillatorNode = context.createOscillator();
            const gainNode = context.createGain();
            const { currentTime } = context;

            oscillatorNode.type = 'sine';
            oscillatorNode.start(currentTime);
            oscillatorNode.frequency.setValueAtTime(clrFreq, currentTime);
            oscillatorNode.frequency.exponentialRampToValueAtTime(
              1400,
              currentTime + 0.2,
            );
            oscillatorNode.stop(currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.5, currentTime);
            gainNode.gain.setTargetAtTime(0, currentTime, 0.1);
            oscillatorNode.connect(gainNode);
            gainNode.connect(context.destination);
            break;
          }
          case 9: {
            // pixelstack used up
            const oscillatorNode = context.createOscillator();
            const gainNode = context.createGain();
            const { currentTime } = context;

            oscillatorNode.type = 'sine';
            oscillatorNode.start(currentTime);
            oscillatorNode.frequency.setValueAtTime(1479.98, currentTime);
            oscillatorNode.frequency.exponentialRampToValueAtTime(
              493.88,
              currentTime + 0.01,
            );
            oscillatorNode.stop(currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.5, currentTime);
            gainNode.gain.setTargetAtTime(0, currentTime, 0.1);
            oscillatorNode.connect(gainNode);
            gainNode.connect(context.destination);
            break;
          }
          default:
            // nothing
        }
        break;
      }

      case 'COOLDOWN_END': {
        // do not play sound if last cooldown end was <5s ago
        const { lastCoolDownEnd } = state.user;
        if (lastCoolDownEnd && lastCoolDownEnd + 5000 > Date.now()) {
          break;
        }

        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        const { currentTime } = context;

        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.setValueAtTime(349.23, currentTime);
        oscillatorNode.frequency.setValueAtTime(
          523.25,
          currentTime + 0.1,
        );
        oscillatorNode.frequency.setValueAtTime(
          698.46,
          currentTime + 0.2,
        );

        gainNode.gain.setValueAtTime(0.5, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.2,
          currentTime + 0.15,
        );

        oscillatorNode.connect(gainNode);
        gainNode.connect(context.destination);

        oscillatorNode.start();
        oscillatorNode.stop(currentTime + 0.3);
        break;
      }

      case 's/REC_CHAT_MESSAGE': {
        if (chatNotify) break;

        const { isPing, channel } = action;
        const { mute: muteCh, chatChannel } = state.chatRead;
        if (muteCh.includes(channel) || muteCh.includes(`${channel}`)) {
          break;
        }
        const { channels } = state.chat;

        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        const { currentTime } = context;

        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.setValueAtTime(310, currentTime);
        /*
         * ping if user mention or
         * message in DM channel that is not currently open
         */
        const freq = (isPing
          || (
            channels[channel]
            && channels[channel][1] === 1
            // eslint-disable-next-line eqeqeq
            && channel != chatChannel
          )
        ) ? 540 : 355;
        oscillatorNode.frequency.exponentialRampToValueAtTime(
          freq,
          currentTime + 0.025,
        );

        gainNode.gain.setValueAtTime(0.1, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.1,
          currentTime + 0.1,
        );

        oscillatorNode.connect(gainNode);
        gainNode.connect(context.destination);

        oscillatorNode.start();
        oscillatorNode.stop(currentTime + 0.075);
        break;
      }

      default:
        // nothing
    }
  }

  return next(action);
};
