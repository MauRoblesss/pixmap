/*
 * Drop Down menu for Chat Channel selection
 *
 */

import React, {
  useRef, useState, useEffect, useCallback,
} from 'react';
import { useSelector } from 'react-redux';
import { MdChat } from 'react-icons/md';
import { FaUserFriends } from 'react-icons/fa';

import { useConditionalClickOutside } from '../hooks/clickOutside';

const ChannelDropDown = ({
  setChatChannel,
  chatChannel,
}) => {
  const [show, setShow] = useState(false);
  const [sortChans, setSortChans] = useState([]);
  // 0: global and faction  channels
  // 1: DMs
  const [type, setType] = useState(0);
  const [offset, setOffset] = useState(0);
  const [unreadAny, setUnreadAny] = useState(false);
  const [chatChannelName, setChatChannelName] = useState('...');
  const [hasDm, setHasDm] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);


  const unread = useSelector((state) => state.chatRead.unread);
  const mute = useSelector((state) => state.chatRead.mute);
  const channels = useSelector((state) => state.chat.channels);
  const chatNotify = useSelector((state) => state.gui.chatNotify);

  useEffect(() => {
    setOffset(buttonRef.current.clientHeight);
  }, [buttonRef]);

  useConditionalClickOutside(
    [wrapperRef],
    show,
    useCallback(() => setShow(false), []),
  );

  useEffect(() => {
    if (show) {
      if (channels[chatChannel]) {
        const chType = (channels[chatChannel][1] === 1) ? 1 : 0;
        setType(chType);
      }
    }
  }, [show]);

  useEffect(() => {
    const cids = Object.keys(channels);
    const sortChansNew = [];
    let i = 0;
    while (i < cids.length) {
      const cid = cids[i];
      const unreadCh = unread[cid] && !mute.includes(cid);
      // [cid, unread, name, type, lastTs, dmuid]
      sortChansNew.push([cid, unreadCh, ...channels[cid]]);
      if (
        !unreadAny
        && channels[cid][1] !== 0
        && unreadCh
      ) {
        setUnreadAny(true);
      }
      i += 1;
    }
    // latest lastTs first
    sortChansNew.sort((c1, c2) => {
      // determines if default channels get sorted too
      if (c1[3] === 0 || c2[3] === 0) return 0;
      if (c1[4] > c2[4]) return -1;
      if (c2[4] > c1[4]) return 1;
      return 0;
    });
    // unread first
    sortChansNew.sort((c1, c2) => {
      if (c1[3] === 0 || c2[3] === 0) return 0;
      if (c1[1] && !c2[1]) return -1;
      if (c2[1] && !c1[1]) return 1;
      return 0;
    });
    setSortChans(sortChansNew);
    if (i === cids.length) {
      setUnreadAny(false);
    }
  }, [channels, unread]);

  useEffect(() => {
    const cids = Object.keys(channels);
    for (let i = 0; i < cids.length; i += 1) {
      if (channels[cids[i]][1] === 1) {
        setHasDm(true);
        return;
      }
    }
    setHasDm(false);
  }, [channels]);

  useEffect(() => {
    if (channels[chatChannel]) {
      setChatChannelName(channels[chatChannel][0]);
    }
  }, [chatChannel, channels]);

  return (
    <div
      style={{ position: 'relative' }}
    >
      <div
        ref={buttonRef}
        key="expbtn"
        role="button"
        tabIndex={-1}
        onClick={() => setShow(true)}
        className={`channelbtn${(show) ? ' selected' : ''}`}
      >
        {(unreadAny && chatNotify && !show) && (
          <div style={{ top: -4 }} className="chnunread">⦿</div>
        )}
        {chatChannelName}
      </div>
      {(show)
        && (
        <div
          ref={wrapperRef}
          key="dropdown"
          style={{
            position: 'absolute',
            bottom: offset,
            right: 9,
          }}
          className="channeldd"
        >
          <div
            className="chntop"
          >
            <span
              style={{ borderLeft: 'none' }}
              className={`chntype${(type === 0) ? ' selected' : ''}`}
              onClick={() => setType(0)}
              role="button"
              tabIndex={-1}
            >
              <MdChat />
            </span>
            {(hasDm)
              && (
              <span
                className={
                  `chntype${
                    (type === 1) ? ' selected' : ''
                  }`
                }
                onClick={() => setType(1)}
                role="button"
                tabIndex={-1}
              >
                {(unreadAny && chatNotify && type !== 1) && (
                  <div className="chnunread">⦿</div>
                )}
                <FaUserFriends />
              </span>
              )}
          </div>
          <div
            className="channeldds"
          >
            {
              sortChans.filter((ch) => {
                const chType = ch[3];
                if (type === 1 && chType === 1) {
                  return true;
                }
                if (type === 0 && chType !== 1) {
                  return true;
                }
                return false;
              }).map((ch) => {
                const [cid, unreadCh, name] = ch;
                return (
                  <div
                    key={cid}
                    onClick={() => setChatChannel(cid)}
                    className={
                      `chn${
                        (cid === chatChannel) ? ' selected' : ''
                      }`
                    }
                    role="button"
                    tabIndex={-1}
                  >
                    {
                      (unreadCh && chatNotify) ? (
                        <div className="chnunread">⦿</div>
                      ) : null
                    }
                    {name}
                  </div>
                );
              })
            }
          </div>
        </div>
        )}
    </div>
  );
};

export default React.memo(ChannelDropDown);
