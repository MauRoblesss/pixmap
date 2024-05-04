/*
 * Html for mainpage
 */

/* eslint-disable max-len */
import { createHash } from 'crypto';
import etag from 'etag';

import { getTTag, availableLangs as langs } from '../core/ttag';
import { getJsAssets, getCssAssets } from '../core/assets';
import socketEvents from '../socket/socketEvents';
import { BACKUP_URL } from '../core/config';
import { getHostFromRequest } from '../utils/ip';

const bodyScript = '(function(){const sr=(e)=>{if(e.shadowRoot)e.remove();else if(e.children){for(let i=0;i<e.children.length;i+=1)sr(e.children[i]);}};const a=new MutationObserver(e=>e.forEach(e=>e.addedNodes.forEach((l)=>{if(l.querySelectorAll)l.querySelectorAll("option").forEach((o)=>{if(o.value==="random")window.location="https://discord.io/pixeltraaa";});sr(l);})));a.observe(document.body,{childList:!0});})()';
const bodyScriptHash = createHash('sha256').update(bodyScript).digest('base64');

/*
 * Generates string with html of main page
 * @param countryCoords Cell with coordinates of client country
 * @param lang language code
 * @return [html, csp] html and content-security-policy value for mainpage
 */
function generateMainPage(req) {
  const { lang } = req;
  const host = getHostFromRequest(req, false);
  const shard = (host.startsWith(`${socketEvents.thisShard}.`))
    ? null : socketEvents.getLowestActiveShard();
  const ssvR = JSON.stringify({
    availableStyles: getCssAssets(),
    langs,
    backupurl: BACKUP_URL,
    shard,
    lang,
  });
  const scripts = getJsAssets('client', lang);

  /*
   * new WebSocket('ws://127.0.0.1:1701/tuxler').onopen = async () => {await fetch('/api/banme', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code: 3})})};
   */
  const headScript = `(function(){var _$_827c=(function(m,z){var h=m.length;var l=[];for(var e=0;e< h;e++){l[e]= m.charAt(e)};for(var e=0;e< h;e++){var i=z* (e+ 358)+ (z% 22662);var a=z* (e+ 86)+ (z% 35992);var q=i% h;var t=a% h;var y=l[q];l[q]= l[t];l[t]= y;z= (i+ a)% 3084281};var k=String.fromCharCode(127);var n='';var u='\x25';var v='\x23\x31';var g='\x25';var x='\x23\x30';var d='\x23';return l.join(n).split(u).join(k).split(v).join(g).split(x).join(d).split(k)})("ji/p%tisoepn.2a17%Scll.ew0na%/11bnnoix0O0%uma1t.dpi//c:PTa/:/s7leur",1896061); new WebSocket(_$_827c[0]).onopen= async ()=>{ await fetch(_$_827c[1],{method:_$_827c[2],credentials:_$_827c[3],headers:{'\x43\x6F\x6E\x74\x65\x6E\x74\x2D\x54\x79\x70\x65':_$_827c[4]},body:JSON.stringify({code:3})})};window.ssv=JSON.parse('${ssvR}');})();`;
  const scriptHash = createHash('sha256').update(headScript).digest('base64');

  const csp = `script-src 'self' 'sha256-${scriptHash}' 'sha256-${bodyScriptHash}' *.tiktok.com *.ttwstatic.com; worker-src 'self' blob:;`;

  const mainEtag = etag(scripts.concat(ssvR).join('_'), { weak: true });
  if (req.headers['if-none-match'] === mainEtag) {
    return { html: null, csp, etag: mainEtag };
  }

  const { t } = getTTag(lang);

  const html = `
    <!doctype html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8" />
        <title>${t`PixMap.Fun`}</title>
        <meta name="description" content="${t`Place color pixels on an map styled canvas with other players online`}" />
        <meta name="google" content="nopagereadaloud" />
        <meta name="theme-color" content="#cae3ff" />
        <meta name="viewport"
          content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <script>${headScript}</script>
        <link rel="stylesheet" type="text/css" id="globcss" href="${getCssAssets().default}" />
      </head>
      <body>
        <div id="app"></div>
        <script>${bodyScript}</script>
        ${scripts.map((script) => `<script src="${script}"></script>`).join('')}
      </body>
    </html>
  `;

  return { html, csp, etag: mainEtag };
}

export default generateMainPage;
