/*
 * Change Password Form
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';

import { setMailreg } from '../store/actions';
import { validatePassword } from '../utils/validation';
import { requestPasswordChange } from '../store/actions/fetch';

function validate(mailreg, password, newPassword, confirmPassword) {
  const errors = [];

  if (mailreg) {
    const oldpasserror = validatePassword(password);
    if (oldpasserror) errors.push(oldpasserror);
  }
  if (newPassword !== confirmPassword) {
    errors.push(t`Passwords do not match.`);
    return errors;
  }
  const passerror = validatePassword(newPassword);
  if (passerror) errors.push(passerror);

  return errors;
}

const ChangePassword = ({ done }) => {
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const mailreg = useSelector((state) => state.user.mailreg);
  const dispatch = useDispatch();

  if (success) {
    return (
      <div className="inarea">
        <p className="modalmessage">{t`Changed Password successfully.`}</p>
        <button type="button" onClick={done}>Close</button>
      </div>
    );
  }

  return (
    <div className="inarea">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          const valerrors = validate(
            mailreg,
            password,
            newPassword,
            confirmPassword,
          );
          setErrors(valerrors);
          if (valerrors.length) return;
          setSubmitting(true);
          const { errors: resperrors } = await requestPasswordChange(
            newPassword,
            password,
          );
          if (resperrors) {
            setErrors(resperrors);
            setSubmitting(false);
            return;
          }
          dispatch(setMailreg(true));
          setSuccess(true);
        }}
      >
        {errors.map((error) => (
          <p key={error} className="errormessage"><span>{t`Error`}</span>
            :&nbsp;{error}</p>
        ))}
        {(mailreg)
        && (
        <input
          value={password}
          onChange={(evt) => setPassword(evt.target.value)}
          type="password"
          placeholder={t`Old Password`}
        />
        )}
        <br />
        <input
          value={newPassword}
          onChange={(evt) => setNewPassword(evt.target.value)}
          type="password"
          placeholder={t`New Password`}
        />
        <br />
        <input
          value={confirmPassword}
          onChange={(evt) => setConfirmPassword(evt.target.value)}
          type="password"
          placeholder={t`Confirm New Password`}
        />
        <br />
        <button
          type="submit"
        >
          {(submitting) ? '...' : t`Save`}
        </button>
        <button
          type="button"
          onClick={done}
        >
          {t`Cancel`}
        </button>
      </form>
    </div>
  );
};

export default React.memo(ChangePassword);
