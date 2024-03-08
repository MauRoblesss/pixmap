/*
 * consume array of actions
 */

export default () => (next) => (action) => (Array.isArray(action)
  ? action.map(next)
  : next(action));
