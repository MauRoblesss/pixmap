/*
 * Form for requesting password-reset mail
 */
import React, { useState } from 'react';
import { t } from 'ttag';

import { validateEMail } from '../../utils/validation';
import { requestNewPassword } from '../../store/actions/fetch';
import useLink from '../hooks/link';

function validate(email) {
  const errors = [];
  const mailerror = validateEMail(email);
  if (mailerror) errors.push(mailerror);
  return errors;
}

const inputStyles = {
  display: 'inline-block',
  width: '100%',
  maxWidth: '35em',
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const link = useLink();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) {
      return;
    }

    const valErrors = validate(email);
    if (valErrors.length > 0) {
      setErrors(valErrors);
      return;
    }

    setSubmitting(true);
    const { errors: respErrors } = await requestNewPassword(email);
    setSubmitting(false);
    if (respErrors) {
      setErrors(respErrors);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div>
        <p className="modalmessage">
          {t`Sent you a mail with instructions to reset your password.`}
        </p>
        <button type="button" onClick={() => link('USERAREA')}>
          Back
        </button>
      </div>
    );
  }
  return (
    <div className="content">
      <p>
        {t`Enter your mail address and we will send you a new password:`}
      </p><br />
      <form onSubmit={handleSubmit}>
        {errors.map((error) => (
          <p key={error}><span>{t`Error`}</span>:&nbsp;{error}</p>
        ))}
        <input
          style={inputStyles}
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          type="text"
          placeholder={t`Email`}
        />
        <br />
        <button type="submit">
          {(submitting) ? '...' : t`Submit`}
        </button>
        <button
          type="button"
          onClick={() => link('USERAREA')}
        >{t`Cancel`}</button>
      </form>
    </div>
  );
};

export default React.memo(ForgotPassword);
