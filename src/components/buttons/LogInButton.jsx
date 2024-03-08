/**
 *
 */

import React from 'react';
import { MdPerson } from 'react-icons/md';
import { t } from 'ttag';

import useLink from '../hooks/link';

const LogInButton = () => {
  const link = useLink();

  return (
    <div
      id="loginbutton"
      className="actionbuttons"
      onClick={() => link('USERAREA', { target: 'fullscreen' })}
      role="button"
      title={t`User Area`}
      tabIndex={-1}
    >
      <MdPerson />
    </div>
  );
};

export default React.memo(LogInButton);
