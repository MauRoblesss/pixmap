/**
 *
 */

import React from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { c, t } from 'ttag';

import SettingsItem from '../SettingsItem';
import LanguageSelect from '../LanguageSelect';
import {
  toggleGrid,
  togglePixelNotify,
  toggleMute,
  toggleAutoZoomIn,
  toggleCompactPalette,
  toggleChatNotify,
  togglePotatoMode,
  toggleLightGrid,
  toggleHistoricalView,
  selectStyle,
  togglePencilTool,
} from '../../store/actions';

const SettingsItemSelect = ({
  title, values, selected, onSelect, icon, children,
}) => (
  <div className="setitem">
    <div className="setrow">
      <h3 className="settitle">{title}</h3>
      {(icon) && <img alt="" src={icon} />}
      <select
        value={selected}
        onChange={(e) => {
          const sel = e.target;
          onSelect(sel.options[sel.selectedIndex].value);
        }}
      >
        {
          values.map((value) => (
            <option
              key={value}
              value={value}
            >
              {value}
            </option>
          ))
        }
      </select>
    </div>
    <div className="modaldesc">{children}</div>
    <div className="modaldivider" />
  </div>
);

function Settings() {
  const [
    isGridShown,
    isPixelNotifyShown,
    autoZoomIn,
    compactPalette,
    isPotato,
    isLightGrid,
    selectedStyle,
    isMuted,
    chatNotify,
    isHistoricalView,
    pencilToll,
  ] = useSelector((state) => [
    state.gui.showGrid,
    state.gui.showPixelNotify,
    state.gui.autoZoomIn,
    state.gui.compactPalette,
    state.gui.isPotato,
    state.gui.isLightGrid,
    state.gui.style,
    state.gui.mute,
    state.gui.chatNotify,
    state.canvas.isHistoricalView,
    state.gui.pencilTool,
  ], shallowEqual);
  const dispatch = useDispatch();

  const audioAvailable = window.AudioContext || window.webkitAudioContext;

  return (
    <div className="content">
      <SettingsItem
          title={t`Enable pencil tool`}
          keyBind={c('keybinds').t`P`}
          value={pencilToll}
          onToggle={() => dispatch(togglePencilTool())}
        >
          {t`Enable pencil tool`}
        </SettingsItem>
      <SettingsItem
        title={t`Show Grid`}
        keyBind={c('keybinds').t`G`}
        value={isGridShown}
        onToggle={() => dispatch(toggleGrid())}
      >
        {t`Turn on grid to highlight pixel borders.`}
      </SettingsItem>
      <SettingsItem
        title={t`Show Pixel Activity`}
        keyBind={c('keybinds').t`X`}
        value={isPixelNotifyShown}
        onToggle={() => dispatch(togglePixelNotify())}
      >
        {t`Show circles where pixels are placed.`}
      </SettingsItem>
      <SettingsItem
        title={t`Disable Game Sounds`}
        keyBind={c('keybinds').t`M`}
        deactivated={(!audioAvailable)}
        value={!audioAvailable || isMuted}
        onToggle={() => dispatch(toggleMute())}
      >
        {[t`All sound effects will be disabled.`,
          (!audioAvailable) && (
            <p className="warn">
              {/* eslint-disable-next-line max-len */}
              {t`Your Browser doesn't allow us to use AudioContext to play sounds. Do you have some privacy feature blocking us?`}
            </p>
          ),
        ]}
      </SettingsItem>
      <SettingsItem
        title={t`Enable chat notifications`}
        value={chatNotify}
        onToggle={() => dispatch(toggleChatNotify())}
      >
        {t`Play a sound when new chat messages arrive`}
      </SettingsItem>
      <SettingsItem
        title={t`Auto Zoom In`}
        value={autoZoomIn}
        onToggle={() => dispatch(toggleAutoZoomIn())}
      >
        {/* eslint-disable-next-line max-len */}
        {t`Zoom in instead of placing a pixel when you tap the canvas and your zoom is small.`}
      </SettingsItem>
      <SettingsItem
        title={t`Compact Palette`}
        // eslint-disable-next-line max-len
        value={compactPalette}
        onToggle={() => dispatch(toggleCompactPalette())}
      >
        {t`Display Palette in a compact form that takes less screen space.`}
      </SettingsItem>
      <SettingsItem
        title={t`Potato Mode`}
        value={isPotato}
        onToggle={() => dispatch(togglePotatoMode())}
      >
        {t`For when you are playing on a potato.`}
      </SettingsItem>
      <SettingsItem
        title={t`Light Grid`}
        value={isLightGrid}
        onToggle={() => dispatch(toggleLightGrid())}
      >
        {t`Show Grid in white instead of black.`}
      </SettingsItem>
      {(window.ssv && window.ssv.backupurl) && (
      <SettingsItem
        title={t`Historical View`}
        value={isHistoricalView}
        keyBind={c('keybinds').t`H`}
        onToggle={() => dispatch(toggleHistoricalView())}
      >
        {t`Check out past versions of the canvas.`}
      </SettingsItem>
      )}
      {(window.ssv && window.ssv.availableStyles) && (
        <SettingsItemSelect
          title={t`Themes`}
          values={Object.keys(window.ssv.availableStyles)}
          selected={selectedStyle}
          onSelect={(style) => dispatch(selectStyle(style))}
        >
          {t`How pixmap should look like.`}
        </SettingsItemSelect>
      )}
      {(window.ssv && navigator.cookieEnabled && window.ssv.langs) && (
        <div className="setitem">
          <div className="setrow">
            <h3 className="settitle">
              {t`Select Language`}
            </h3>
            <LanguageSelect />
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(Settings);
