/*
 * Change Password Form
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';

import { validatePassword } from '../utils/validation';
import { requestDeleteAccount } from '../store/actions/fetch';
import { logoutUser } from '../store/actions';

function validate(password) {
  const errors = [];

  const passworderror = validatePassword(password);
  if (passworderror) errors.push(passworderror);

  return errors;
}

const DeleteAccount = ({ done }) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const dispatch = useDispatch();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) {
      return;
    }

    const valErrors = validate(password);
    if (valErrors.length > 0) {
      setErrors(valErrors);
      return;
    }

    setSubmitting(true);
    const { errors: respErrors } = await requestDeleteAccount(password);
    setSubmitting(false);
    if (respErrors) {
      setErrors(respErrors);
      return;
    }
    dispatch(logoutUser());
  };

  return (
    <div className="inarea" style={{ backgroundColor: '#ff6666' }}>
      <form onSubmit={handleSubmit}>
        {errors.map((error) => (
          <p key={error} className="errormessage"><span>{t`Error`}</span>
            :&nbsp;{error}</p>
        ))}
        <input
          value={password}
          onChange={(evt) => setPassword(evt.target.value)}
          type="password"
          placeholder={t`Password`}
        />
        <br />
        <button type="submit">
          {(submitting) ? '...' : t`Yes, Delete My Account!`}
        </button>
        <button type="button" onClick={done}>{t`Cancel`}</button>
      </form>
    </div>
  );
};

export default React.memo(DeleteAccount);
