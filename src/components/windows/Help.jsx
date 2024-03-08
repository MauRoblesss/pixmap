/**
 *
 */

import React from 'react';
import { c, t, jt } from 'ttag';
import { GiMouse } from 'react-icons/gi';
import { MdTouchApp } from 'react-icons/md';

import GetIID from '../GetIID';

/* eslint-disable max-len */

const Help = () => {
  const bindG = <kbd>{c('keybinds').t`G`}</kbd>;
  const bindX = <kbd>{c('keybinds').t`X`}</kbd>;
  const bindH = <kbd>{c('keybinds').t`H`}</kbd>;
  const bindR = <kbd>{c('keybinds').t`R`}</kbd>;
  const bindQ = <kbd>{c('keybinds').t`Q`}</kbd>;
  const bindE = <kbd>{c('keybinds').t`E`}</kbd>;
  const bindW = <kbd>{c('keybinds').t`W`}</kbd>;
  const bindA = <kbd>{c('keybinds').t`A`}</kbd>;
  const bindS = <kbd>{c('keybinds').t`S`}</kbd>;
  const bindD = <kbd>{c('keybinds').t`D`}</kbd>;
  const bindP = <kbd>{c('keybinds').t`P`}</kbd>;
  const bindAUp = <kbd>↑</kbd>;
  const bindALeft = <kbd>←</kbd>;
  const bindADown = <kbd>↓</kbd>;
  const bindARight = <kbd>→</kbd>;
  const mouseSymbol = <kbd><GiMouse /></kbd>;
  const touchSymbol = <kbd><MdTouchApp /></kbd>;
  const bindShift = <kbd>⇧ {c('keybinds').t`Shift`}</kbd>;
  const bindC = <kbd>{c('keybinds').t`C`}</kbd>;

  const starhouseLink = <a href="https://twitter.com/starhousedev">starhouse </a>;
  const vinikLink = <a href="https://twitter.com/Vinikdev">Vinikdev</a>;
  const guildedLink = <a href="https://pixmap.fun/guilded">Discord</a>;
  const mailLink = <a href="mailto:admin@pixelplanet.fun">admin@pixelplanet.fun</a>;

  return (
    <div className="content">
      <p>
        {t`Place color pixels on a large canvas with other players online!`}<br />
        {t`Our main canvas is a huge worldmap, you can place wherever you like, but you will have to wait a specific \
Cooldown between pixels. You can check out the cooldown and requirements on the Canvas Selection menu (globe button on top). \
Some canvases have a different cooldown for replacing a user-set pixels than placing on a unset pixel. i.e. 4s/7s means 4s on fresh \
pixels and 7s on already set pixels.`}<br />
        {t`Higher zoomlevels take some time to update, the 3D globe gets updated at least once per day.`}<br />
        {t`Have fun!`}
      </p>
      <p className="modalinfo">Discord ({t`recommended`}): <a href="./guilded" target="_blank" rel="noopener noreferrer">pixmap.fun/guilded</a></p>
      <p className="modalinfo">{t`Source on `}<a href="https://git.pixelplanet.fun" target="_blank" rel="noopener noreferrer">git.pixelplanet.fun</a></p>
      <h3>{t`Map Data`}</h3>
      <p>{t`The bare map data that we use, together with converted OpenStreetMap tiles for orientation, \
can be downloaded from mega.nz here: `}<a href="https://mega.nz/#!JpkBwAbJ!EnSLlZmKv3kEBE0HDhakTgAZZycD3ELjduajJxPGaXo">pixelplanetmap.zip</a> (422MB)</p>
      <h3>{t`Banned? Detected as Proxy?`}</h3>
      <div>
        <p>{jt`If you got detected as proxy, but you are none, or think that you got wrongfully banned, please go to our ${guildedLink} or send us an e-mail to ${mailLink} and include the following IID:`}</p>
        <GetIID />
      </div>
      <h3>2D {t`Controls`}</h3>
      <div style={{ lineHeight: 1.5 }}>
        {t`Click a color in palette to select it`}<br />
        {jt`Press ${bindG} to toggle grid`}<br />
        {jt`Press ${bindP} to activate the pencil`}<br />
        {jt`Press ${bindX} to toggle showing of pixel activity`}<br />
        {jt`Press ${bindH} to toggle historical view`}<br />
        {jt`Press ${bindR} to copy coordinates`}<br />
        {jt`Press ${bindQ} or ${bindE} to zoom`}<br />
        {jt`Press ${bindW}, ${bindA}, ${bindS}, ${bindD} to move`}<br />
        {jt`Press ${bindAUp}, ${bindALeft}, ${bindADown}, ${bindARight} to move`}<br />
        {jt`Drag ${mouseSymbol} mouse or ${touchSymbol} pan to move`}<br />
        {jt`Scroll ${mouseSymbol} mouse wheel or ${touchSymbol} pinch to zoom`}<br />
        {jt`Hold left ${bindShift} for placing while moving mouse`}<br />
        {jt`Hold right ${bindShift} for placing while moving mouse according to historical view`}<br />
        {jt`${mouseSymbol} Left click or ${touchSymbol} tap to place a pixel`}<br />
        {jt`Click ${mouseSymbol} middle mouse button or ${touchSymbol} long-tap to select current hovering color`}<br />
      </div>
      <h3>3D {t`Controls`}</h3>
      <div style={{ lineHeight: 1.5 }}>
        {jt`Press ${bindW}, ${bindA}, ${bindS}, ${bindD} to move`}<br />
        {jt`Press ${bindAUp}, ${bindALeft}, ${bindADown}, ${bindARight} to move`}<br />
        {jt`Press ${bindE} and ${bindC} to fly up and down`}<br />
        {jt`${mouseSymbol} Hold left mouse button and drag mouse to rotate`}<br />
        {jt`${mouseSymbol} Scroll mouse wheel or hold ${mouseSymbol} middle mouse button and drag to zoom`}<br />
        {jt`${mouseSymbol} Right click and drag mouse to pan`}<br />
        {jt`${mouseSymbol} Left click or ${touchSymbol} tap to place a pixel`}<br />
        {jt`${mouseSymbol} Right click or ${touchSymbol} double-tap to remove a pixel`}<br />
        {jt`Click ${mouseSymbol} middle mouse button or ${touchSymbol} long-tap to select current hovering color`}<br />
      </div>
      <h3>Palette Credits</h3>
      <div>
        {jt`We thanks those artists very much, they offered their palettes to the public on`}&nbsp;
        <a href="https://lospec.com/">lospec.com</a>
        <p>
          {jt`Credit for the Palette of the Moon goes to ${starhouseLink}.`}
        </p>
        <p>
          {jt`Credit for the Palette of the Top10 canvas goes to ${vinikLink}.`}
        </p>
      </div>
    </div>
  );
};

export default Help;
