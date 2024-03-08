/*
 * windows that can be opened as pop-up
 */

export const argsTypes = {
  USERAREA: ['activeTab'],
  CHAT: ['chatChannel'],
};

const availablePopups = [
  'HELP',
  'SETTINGS',
  'USERAREA',
  'CHAT',
  'CANVAS_SELECTION',
  'ARCHIVE',
  'REGISTER',
  'FORGOT_PASSWORD',
];

export function isPopUp() {
  const fPath = window.location.pathname.split('/')[1];
  return fPath && availablePopups.includes(fPath.toUpperCase());
}

export function buildPopUpUrl(windowType, argsIn) {
  const args = { ...argsIn };
  let path = `/${windowType.toLowerCase()}`;
  const typeArr = argsTypes[windowType];
  if (typeArr) {
    for (let i = 0; i < typeArr.length; i += 1) {
      const key = typeArr[i];
      if (args[key]) {
        path += `/${encodeURIComponent(args[key])}`;
        delete args[key];
      }
    }
  }
  let searchParams = new URLSearchParams();
  const keys = Object.keys(args);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    searchParams.append(key, args[key]);
  }
  searchParams = searchParams.toString();
  if (searchParams) {
    path += `?${searchParams}`;
  }
  return path;
}

export default availablePopups;
