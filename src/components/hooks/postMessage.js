import { useEffect, useRef } from 'react';

function usePostMessage(iFrameRef, callback) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function handleMessage(evt) {
      if (evt.source !== iFrameRef.current.contentWindow) {
        return;
      }
      savedCallback.current(evt.data);
    }

    window.addEventListener('message', handleMessage, false);

    return () => window.removeEventListener('message', handleMessage);
  }, []);
}

export default usePostMessage;
