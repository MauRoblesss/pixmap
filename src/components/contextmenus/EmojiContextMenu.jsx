/*
 * Emojis
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';

import { EMOJIS_LIST } from '../../core/utils';

/*
 * args: {
 *   addToInput,
 * }
 */

const EmojiContextMenu = ({ args, close }) => {
  const emojis = EMOJIS_LIST;
  //console.log('emojislista: ' + emojis)

  const {
    addToInput,
  } = args;

  return (
    <>
      <span className='emojiTitle'
      >Emojis
        <button
          style={{
            position: 'absolute',
            right: '5px',
            cursor: 'pointer',
          }}
          onClick={() => {
            close();
          }}
          >X
        </button>
      </span>

      <div
        className='emojiContainer'
        style={{
          width: '200px',
          height: '180px',
        }}
      >
        {(emojis.length > 0) && (
          emojis.map((emj) => (
            <span className='emojispan'>
              <img
                key={emj}
                className="emoji"
                alt=""
                title={emj}
                src={`/emojis/${emj}.gif`}
                onClick={() => {
                  const em = `:${emj}:`
                  addToInput(em);
                  close();
                }}
                />
            </span>
          ))
          ) 
        } 
      </div>
    </>
  );
};

export default React.memo(EmojiContextMenu);
