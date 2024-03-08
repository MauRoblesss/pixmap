/*
 * context for window to provide window-specific
 * state (args) and set stuff
 */
import { createContext } from 'react';

const WindowContext = createContext();
/*
 * {
 *   args: object,
 *   setArgs: function,
 *   setTitle: function,
 *   changeType: function,
 * }
 */

export default WindowContext;
