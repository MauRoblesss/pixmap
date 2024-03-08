/*
 * show IID
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';

import { notify } from '../store/actions/thunks';
import copyTextToClipboard from '../utils/clipboard';
import {
  requestIID,
} from '../store/actions/fetch';

const GetIID = () => {
  const [iid, setIID] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();

  return (
    <p>
      <input
        style={{
          display: 'inline-block',
          width: '100%',
          maxWidth: '18em',
        }}
        readOnly
        value={iid}
      />
      {(!iid)
        ? (
          <button
            key="subtn"
            type="button"
            onClick={async () => {
              setSubmitting(true);
              const resp = await requestIID();
              if (resp.iid) {
                setIID(resp.iid);
              }
              setSubmitting(false);
            }}
          >{(submitting) ? '...' : t`Get IID`}</button>
        ) : (
          <button
            key="cobtn"
            type="button"
            onClick={() => {
              copyTextToClipboard(iid);
              dispatch(notify(t`Copied!`));
            }}
          >{t`Copy`}</button>
        )}
    </p>
  );
};

export default React.memo(GetIID);
