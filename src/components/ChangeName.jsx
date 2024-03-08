/*
 * Change Name Form
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';

import { validateName } from '../utils/validation';
import { requestNameChange } from '../store/actions/fetch';
import { setName } from '../store/actions';


function validate(name) {
  const errors = [];

  const nameerror = validateName(name);
  if (nameerror) errors.push(nameerror);

  return errors;
}

const ChangeName = ({ done }) => {
  const [name, setStName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const dispatch = useDispatch();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) {
      return;
    }

    const valErrors = validate(name);
    if (valErrors.length > 0) {
      setErrors(valErrors);
      return;
    }

    setSubmitting(true);
    const { errors: respErrors } = await requestNameChange(name);
    setSubmitting(false);
    if (respErrors) {
      setErrors(respErrors);
      return;
    }
    dispatch(setName(name));
    done();
  };

  return (
    <div className="inarea">
      <form onSubmit={handleSubmit}>
        {errors.map((error) => (
          <p key={error} className="errormessage">
            <span>{t`Error`}</span>:&nbsp;{error}</p>
        ))}
        <input
          value={name}
          onChange={(evt) => setStName(evt.target.value)}
          type="text"
          placeholder={t`New Username`}
        />
        <br />
        <button type="submit">
          {(submitting) ? '...' : t`Save`}
        </button>
        <button type="button" onClick={done}>{t`Cancel`}</button>
      </form>
    </div>
  );
};

export default React.memo(ChangeName);
