/*
 * SignUp Form to register new user by mail
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';

import Captcha from '../Captcha';
import {
  validateEMail, validateName, validatePassword,
} from '../../utils/validation';
import { requestRegistration } from '../../store/actions/fetch';
import { loginUser } from '../../store/actions';
import useLink from '../hooks/link';


function validate(name, email, password, confirmPassword) {
  const errors = [];
  const mailerror = validateEMail(email);
  if (mailerror) errors.push(mailerror);
  const nameerror = validateName(name);
  if (nameerror) errors.push(nameerror);
  const passworderror = validatePassword(password);
  if (passworderror) errors.push(passworderror);

  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  return errors;
}

const Register = () => {
  const [submitting, setSubmitting] = useState('');
  const [errors, setErrors] = useState([]);
  // used to be able to force Captcha rerender on error
  const [captKey, setCaptKey] = useState(Date.now());

  const dispatch = useDispatch();

  const link = useLink();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) {
      return;
    }

    const name = evt.target.name.value;
    const email = evt.target.email.value;
    const password = evt.target.password.value;
    const confirmPassword = evt.target.confirmpassword.value;
    const captcha = evt.target.captcha.value;
    const captchaid = evt.target.captchaid.value;

    const valErrors = validate(name, email, password, confirmPassword);
    if (valErrors.length > 0) {
      setErrors(valErrors);
      return;
    }

    setSubmitting(true);
    const { errors: respErrors, me } = await requestRegistration(
      name,
      email,
      password,
      captcha,
      captchaid,
    );
    setSubmitting(false);
    if (respErrors) {
      setCaptKey(Date.now());
      setErrors(respErrors);
      return;
    }

    dispatch(loginUser(me));
    link('USERAREA');
  };

  return (
    <div className="content">
      <form
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
        onSubmit={handleSubmit}
      >
        <p>{t`Register new account here`}</p>
        {errors.map((error) => (
          <p key={error} className="errormessage"><span>{t`Error`}</span>
            :&nbsp;{error}</p>
        ))}
        <h3>{t`Name`}:</h3>
        <input
          name="name"
          className="reginput"
          autoComplete="username"
          type="text"
          placeholder={t`Name`}
        />
        <h3>{t`Email`}:</h3>
        <input
          name="email"
          className="reginput"
          autoComplete="email"
          type="text"
          placeholder={t`Email`}
        />
        <h3>{t`Password`}:</h3>
        <input
          name="password"
          className="reginput"
          autoComplete="new-password"
          type="password"
          placeholder={t`Password`}
        />
        <h3>{t`Confirm Password`}:</h3>
        <input
          name="confirmpassword"
          className="reginput"
          autoComplete="new-password"
          type="password"
          placeholder={t`Confirm Password`}
        />
        <h3>{t`Captcha`}:</h3>
        <Captcha autoload={false} width={60} key={captKey} />
        <button type="submit">
          {(submitting) ? '...' : t`Submit`}
        </button>
        <button
          type="button"
          onClick={() => link('USERAREA')}
        >
          {t`Cancel`}
        </button>
      </form>
    </div>
  );
};


export default React.memo(Register);
