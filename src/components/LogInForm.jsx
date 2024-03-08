/*
 * LogIn Form
 */
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';

import {
  validateEMail, validateName, validatePassword,
} from '../utils/validation';
import { requestLogin } from '../store/actions/fetch';
import { loginUser } from '../store/actions';


function validate(nameoremail, password) {
  const errors = [];
  const mailerror = (nameoremail.indexOf('@') !== -1)
    ? validateEMail(nameoremail)
    : validateName(nameoremail);
  if (mailerror) errors.push(mailerror);
  const passworderror = validatePassword(password);
  if (passworderror) errors.push(passworderror);

  return errors;
}

const inputStyles = {
  display: 'inline-block',
  width: '75%',
  maxWidth: '35em',
};

const LogInForm = () => {
  const [nameoremail, setNameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const dispatch = useDispatch();

  const handleSubmit = async (evt) => {
    evt.preventDefault();

    if (submitting) {
      return;
    }

    const valErrors = validate(nameoremail, password);
    if (valErrors.length > 0) {
      setErrors(valErrors);
      return;
    }

    setSubmitting(true);
    const { errors: respErrors, me } = await requestLogin(
      nameoremail,
      password,
    );
    setSubmitting(false);
    if (respErrors) {
      setErrors(respErrors);
      return;
    }
    dispatch(loginUser(me));
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.map((error) => (
        <p key={error}><span>{t`Error`}</span>:&nbsp;{error}</p>
      ))}
      <input
        value={nameoremail}
        style={inputStyles}
        onChange={(evt) => setNameOrEmail(evt.target.value)}
        type="text"
        placeholder={t`Name or Email`}
      /><br />
      <input
        value={password}
        style={inputStyles}
        onChange={(evt) => setPassword(evt.target.value)}
        type="password"
        placeholder={t`Password`}
      />
      <p>
        <button type="submit">
          {(submitting) ? '...' : t`LogIn`}
        </button>
      </p>
    </form>
  );
};

export default React.memo(LogInForm);
