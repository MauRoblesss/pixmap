/*
 * Messages on top of UserArea
 */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { t } from 'ttag';

import { requestResendVerify } from '../store/actions/fetch';


const UserMessages = () => {
  const [resentVerify, setResentVerify] = useState(false);
  const [verifyAnswer, setVerifyAnswer] = useState(null);

  const messages = useSelector((state) => state.user.messages);

  if (!messages) {
    return null;
  }

  return (
    <div style={{ paddingLeft: '5%', paddingRight: '5%' }}>
      {messages.includes('not_verified')
        && (
          <p className="usermessages">
            {
              // eslint-disable-next-line max-len
              t`Please verify your mail address or your account could get deleted after a few days.`
            }
            {(verifyAnswer)
              ? (
                <span
                  className="modallink"
                >
                  {verifyAnswer}
                </span>
              )
              : (
                <span
                  role="button"
                  tabIndex={-1}
                  className="modallink"
                  onClick={async () => {
                    if (resentVerify) return;
                    setResentVerify(true);
                    const { errors } = await requestResendVerify();
                    const answer = (errors)
                      ? errors[0]
                      : t`A new verification mail is getting sent to you.`;
                    setVerifyAnswer(answer);
                  }}
                >
                  {t`Click here to request a new verification mail.`}
                </span>
              )}
          </p>
        )}
      {messages.map((message) => {
        if (message === 'not_verified') return null;
        return <p className="usermessages" key={message}>{message}</p>;
      })}
    </div>
  );
};

export default React.memo(UserMessages);
