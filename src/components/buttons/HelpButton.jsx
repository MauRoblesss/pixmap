/**
 *
 */

import React from 'react';
import { FaQuestion } from 'react-icons/fa';
import { t } from 'ttag';

import useLink from '../hooks/link';

const HelpButton = () => {
  const link = useLink();

  return (
    <div
      id="helpbutton"
      className="actionbuttons"
      onClick={() => link('HELP', { target: 'fullscreen' })}
      role="button"
      title={t`Help`}
      tabIndex={-1}
    >
      <FaQuestion />
    </div>
  );
};

export default React.memo(HelpButton);
