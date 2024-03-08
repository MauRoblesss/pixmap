/*
 * Embeds for external content like youtube, etc.
 * Usage for Markdown is in ../MdLink.js
 *
 */
import TikTok from './TikTok';
import YouTube from './YouTube';
import Matrix from './Matrix';
import Telegram from './Telegram';
import Twitter from './Twitter';
import Odysee from './Odysee';
import DirectLinkMedia from './DirectLinkMedia';

/*
 * key is the domain (with .com and www. stripped)
 * value is an Array with
 *  [
 *    ReactElement: takes url as prop,
 *    isEmbedAvailable: function that takes url as argument and returns boolean
 *                      whether embed is available for this url of this domain
 *    title: function that returns the title for a link, gets url as argument
 *    icon: link to icon
 *  ]
 */
export default {
  tiktok: TikTok,
  youtube: YouTube,
  'youtu.be': YouTube,
  'matrix.pixmap.fun': Matrix,
  'i.4cdn.org': DirectLinkMedia,
  'i.imgur': DirectLinkMedia,
  'litter.catbox.moe': DirectLinkMedia,
  'files.catbox.moe': DirectLinkMedia,
  'i.redd.it': DirectLinkMedia,
  'media.discordapp.net': DirectLinkMedia,
  'media.consumeproduct.win': DirectLinkMedia,
  'cdn.discord.com': DirectLinkMedia,
  't.me': Telegram,
  twitter: Twitter,
  'nitter.net': Twitter,
  odysee: Odysee,
};
