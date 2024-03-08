/*
 * keeping track of open popups
 */
import { unload } from '../store/actions';

class PopUps {
  constructor() {
    this.wins = [];
    this.origin = window.location.origin;
    window.addEventListener('beforeunload', () => {
      this.dispatch(unload());
    });
  }

  add(win) {
    const pos = this.wins.indexOf(win);
    if (pos === -1) {
      this.wins.push(win);
    }
  }

  remove(win) {
    const pos = this.wins.indexOf(win);
    if (~pos) this.wins.splice(pos, 1);
  }

  /*
   * send message to all popups
   * except the ignore one
   */
  dispatch(msg, ignore = null) {
    const { wins } = this;
    try {
      for (let i = 0; i < wins.length; i += 1) {
        const win = wins[i];
        if (win.closed) {
          wins.splice(i, 1);
          i -= 1;
          continue;
        }
        if (win !== ignore) {
          win.postMessage(msg, this.origin);
        }
      }
    } catch {
      return false;
    }
    return true;
  }

  closeAll() {
    while (this.wins.length) {
      const win = this.wins.pop();
      win.close();
    }
  }
}

const popUps = new PopUps();
export default popUps;
