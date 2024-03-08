import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';


const NotifyBox = () => {
  const [className, setClassName] = useState('notifybox');
  const notification = useSelector((state) => state.user.notification);

  useEffect(() => {
    if (notification) {
      let newClassName = 'notifybox';
      if (notification && typeof notification !== 'string') {
        if (notification > 0) newClassName += ' green';
        else newClassName += ' red';
      }
      if (newClassName !== className) {
        setClassName(newClassName);
      }
    }
  }, [notification]);

  return (
    <div
      className={(notification) ? `${className} show` : className}
    >
      {notification}
    </div>
  );
};

export default React.memo(NotifyBox);
