import React from 'react';
import ToggleButton from 'react-toggle';

const SettingsItem = React.memo(({
  title, keyBind, value, onToggle, children, deactivated,
}) => (
  <div className="setitem">
    <div className="setrow">
      <h3 className="settitle">
        {title} {keyBind && <kbd>{keyBind}</kbd>}
      </h3>
      <ToggleButton
        checked={value}
        onChange={onToggle}
        disabled={deactivated}
      />
    </div>
    <div className="modaldesc">{children}</div>
    <div className="modaldivider" />
  </div>
), (prevProps, nextProps) => prevProps.value === nextProps.value);

export default SettingsItem;
