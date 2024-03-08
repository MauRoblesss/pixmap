/**
 *
 */

import React, {
  useRef, useLayoutEffect, useState, useEffect, useCallback, useContext,
} from 'react';
import useStayScrolled from 'react-stay-scrolled';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';

import WindowContext from '../context/window';
import useLink from '../hooks/link';
import ContextMenu from '../contextmenus';
import ChatMessage from '../ChatMessage';
import ChannelDropDown from '../contextmenus/ChannelDropDown';

import {
  markChannelAsRead,
  sendChatMessage,
} from '../../store/actions';
import {
  fetchChatMessages,
} from '../../store/actions/thunks';


const Chat = () => {
  const listRef = useRef();
  const targetRef = useRef();
  const inputRef = useRef();

  const [blockedIds, setBlockedIds] = useState([]);
  const [btnSize, setBtnSize] = useState(20);
  const [cmArgs, setCmArgs] = useState({});

  const dispatch = useDispatch();

  const ownName = useSelector((state) => state.user.name);
  const fetching = useSelector((state) => state.fetching.fetchingChat);
  const { channels, messages, blocked } = useSelector((state) => state.chat);

  const {
    args,
    setArgs,
    setTitle,
  } = useContext(WindowContext);

  const {
    chatChannel = 1,
  } = args;

  const link = useLink();

  const setChannel = useCallback((cid) => {
    dispatch(markChannelAsRead(cid));
    setArgs({
      chatChannel: Number(cid),
    });
  }, [dispatch]);

  const addToInput = useCallback((msg) => {
    const inputElem = inputRef.current;
    if (!inputElem) {
      return;
    }
    let newInputMessage = inputElem.value;
    if (newInputMessage.slice(-1) !== ' ') {
      newInputMessage += ' ';
    }
    newInputMessage += `${msg} `;
    inputElem.value = newInputMessage;
    inputRef.current.focus();
  }, []);

  const closeCm = useCallback(() => {
    setCmArgs({});
  }, []);

  const openUserCm = useCallback((x, y, name, uid) => {
    setCmArgs({
      type: 'USER',
      x,
      y,
      args: {
        name,
        uid,
        setChannel,
        addToInput,
      },
    });
  }, [setChannel, addToInput]);

  const { stayScrolled } = useStayScrolled(listRef, {
    initialScroll: Infinity,
    inaccuracy: 10,
  });

  const channelMessages = messages[chatChannel] || [];
  useEffect(() => {
    if (channels[chatChannel] && !messages[chatChannel] && !fetching) {
      dispatch(fetchChatMessages(chatChannel));
    }
  }, [channels, messages, chatChannel]);

  useEffect(() => {
    if (channels[chatChannel]) {
      const channelName = channels[chatChannel][0];
      setTitle(`Chan: ${channelName}`);
    }
  }, [chatChannel]);

  useLayoutEffect(() => {
    stayScrolled();
  }, [channelMessages.length]);

  useEffect(() => {
    setTimeout(() => {
      const fontSize = Math.round(targetRef.current.offsetHeight / 10);
      setBtnSize(Math.min(28, fontSize));
    }, 330);
  }, [targetRef]);

  useEffect(() => {
    const bl = [];
    for (let i = 0; i < blocked.length; i += 1) {
      bl.push(blocked[i][0]);
    }
    setBlockedIds(bl);
  }, [blocked.length]);

  function handleSubmit(evt) {
    evt.preventDefault();
    const inptMsg = inputRef.current.value.trim();
    if (!inptMsg) return;
    // send message via websocket
    dispatch(sendChatMessage(inptMsg, chatChannel));
    inputRef.current.value = '';
  }

  /*
   * if selected channel isn't in channel list anymore
   * for whatever reason (left faction etc.)
   * set channel to first available one
   */
  useEffect(() => {
    if (!chatChannel || !channels[chatChannel]) {
      const cids = Object.keys(channels);
      if (cids.length) {
        setChannel(cids[0]);
      }
    }
  }, [channels]);

  return (
    <div
      ref={targetRef}
      className="chat-container"
    >
      <ContextMenu
        type={cmArgs.type}
        x={cmArgs.x}
        y={cmArgs.y}
        args={cmArgs.args}
        close={closeCm}
        align={cmArgs.align}
      />
      <ul
        className="chatarea"
        ref={listRef}
        style={{ flexGrow: 1 }}
        role="presentation"
      >
        {
          (!channelMessages.length)
          && (
          <ChatMessage
            uid={0}
            name="info"
            country="xx"
            msg={t`Start chatting here`}
          />
          )
        }
        {
          channelMessages.map((message) => ((blockedIds.includes(message[3]))
            ? null : (
              <ChatMessage
                name={message[0]}
                msg={message[1]}
                country={message[2]}
                uid={message[3]}
                ts={message[4]}
                key={message[5]}
                openCm={openUserCm}
              />
            )))
        }
      </ul>
      <form
        className="chatinput"
        onSubmit={(e) => handleSubmit(e)}
        style={{
          display: 'flex',
        }}
      >
        {(ownName) ? (
          <React.Fragment key="chtipt">
            <span 
                id='inputtxtemoji'
                key='agua'
              >
              <button
              id="emojibtn"
              type="button"
              style={{ flexGrow: 0 }}
              role="button"
              title={"Emojis"}
              tabIndex={0}
              key="chtemoji"

              onClick={(event) => {
                const {
                  clientX: x,
                  clientY: y,
                } = event;
                setCmArgs({
                  type: 'EMOJI',
                  x,
                  y,
                  args: { addToInput },
                  align: 'bl',
                });
              }}
            > 
              <i className="fa fa-smile-o" aria-hidden="true" style={{ fontSize: '17px',}}></i>
            </button>
          </span>
         
          <input
            style={{
              flexGrow: 1,
              minWidth: 40,
              fontSize: 14,
            }}
            ref={inputRef}
            autoComplete="off"
            maxLength="200"
            type="text"
            placeholder={t`Chat here`}
            key="inptmsg"
          />
          <button
            id="sendbtn"
            style={{ flexGrow: 0 }}
            type="submit"
            key="inptmsgbutton"
          >
            ‣
          </button>
          </React.Fragment>
        ) : (
          <div
            className="modallink"
            key="nlipt"
            onClick={(evt) => {
              evt.stopPropagation();
              link('USERAREA', { target: 'fullscreen' });
            }}
            style={{
              textAlign: 'center',
              fontSize: 13,
              flexGrow: 1,
            }}
            role="button"
            tabIndex={0}
          >
            {t`You must be logged in to chat`}
          </div>
        )}
        <ChannelDropDown
          key="cdd"
          setChatChannel={setChannel}
          chatChannel={chatChannel}
        />
      </form>
      <div
        className="chatlink"
        style={{
          fontSize: btnSize,
        }}
      >
        <span
          onClick={(event) => {
            const {
              clientX: x,
              clientY: y,
            } = event;
            setCmArgs({
              type: 'CHANNEL',
              x,
              y,
              args: { cid: chatChannel },
              align: 'tr',
            });
          }}
          role="button"
          title={t`Channel settings`}
          tabIndex={-1}
        >⚙</span>
      </div>
    </div>
  );
};

export default Chat;
