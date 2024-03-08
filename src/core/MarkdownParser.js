/*
 * Markdown parsing
 *
 * We do not support all markdown, but do additionally parse extra
 * stuff like pixelplanet coords and usernames and bare links.
 * This code is written in preparation for a possible implementation in
 * WebAssembly, so it's all in a big loop
 */

import MString from './MString';

let parseMText = () => {};

/*
 * Parse Paragraph till next newline or breakChar (for recursion)
 */
const paraElems = ['*', '~', '+', '_'];
function parseMParagraph(text, opts, breakChar) {
  const pArray = [];
  let pStart = text.iter;
  let chr = null;
  while (!text.done()) {
    chr = text.getChar();

    if (chr === breakChar) {
      break;
    }
    if (chr === '\n') {
      text.moveForward();
      break;
    }

    if (chr === '\\') {
      /*
       * escape character
       */
      if (pStart !== text.iter) {
        pArray.push(text.slice(pStart));
      }
      pStart = text.iter + 1;
      text.moveForward();
    } else if (chr === '#') {
      /*
       * ppfun coords #d,34,23,-10
       */
      const oldPos = text.iter;
      const coords = text.checkIfCoords();
      if (coords) {
        if (pStart !== oldPos) {
          pArray.push(text.slice(pStart, oldPos));
        }
        pArray.push(['l', null, `${window.location.origin}/${coords}`]);
        pStart = text.iter;
      }
    } else if (paraElems.includes(chr)) {
      /*
       * bold, cursive, underline, etc.
       */
      const oldPos = text.iter;
      text.moveForward();
      const children = parseMParagraph(text, opts, chr);
      if (text.getChar() === chr) {
        if (pStart !== oldPos) {
          pArray.push(text.slice(pStart, oldPos));
        }
        pArray.push([chr, children]);
        pStart = text.iter + 1;
      } else {
        text.setIter(oldPos);
      }
    } else if (chr === '`') {
      /*
       * inline code
       */
      const oldPos = text.iter;
      text.moveForward();
      if (text.goToCharInLine('`')) {
        if (pStart !== oldPos) {
          pArray.push(text.slice(pStart, oldPos));
        }
        pArray.push(['c', text.slice(oldPos + 1)]);
        pStart = text.iter + 1;
      }
    } else if (chr === ':') {
      /*
       * pure link
       */
      const link = text.checkIfLink();
      if (link !== null) {
        const startLink = text.iter - link.length;
        if (pStart < startLink) {
          pArray.push(text.slice(pStart, startLink));
        }
        pArray.push(['l', null, link]);
        pStart = text.iter;
        continue;
      }
    } else if (chr === '[') {
      /*
       * x[y](z) enclosure
       */
      let oldPos = text.iter;
      let x = null;
      if (text.iter > 0) {
        text.move(-1);
        x = text.getChar();
        text.setIter(oldPos);
      }
      /*
       * x decides what element it is
       * defaults to ordinary link
       */
      let tag = 'l';
      let zIsLink = true;
      if (x === '!') {
        tag = 'img';
        oldPos -= 1;
      } else if (x === '@') {
        zIsLink = false;
        tag = '@';
        oldPos -= 1;
      }
      // E Emoji
      let IsEmoji = false;

      const encArr = text.checkIfEnclosure(zIsLink, IsEmoji);
      if (encArr !== null) {
        if (pStart < oldPos) {
          pArray.push(text.slice(pStart, oldPos));
        }
        pArray.push([tag, encArr[0], encArr[1]]);
        pStart = text.iter + 1;
      }
    } else {
      /*
       * Emojis
       */
      let oldPos = text.iter;
      let x = null;
      if (text.iter > 0) {
        text.move(-1);
        x = text.getChar();
        text.setIter(oldPos);
      }
      if (x === ':') {
        let oldPos = text.iter;
        let tag = ':';
        oldPos -= 1;
        let zIsLink = false;
        let IsEmoji = true;

        const encArr = text.checkIfEnclosure(zIsLink , IsEmoji);
        if (encArr !== null) {
          if (pStart < oldPos) {
            pArray.push(text.slice(pStart, oldPos));
          }
          pArray.push([tag, encArr[0]]);
          pStart = text.iter + 1;
        }
      }
    }

    text.moveForward();
  }
  if (pStart !== text.iter) {
    pArray.push(text.slice(pStart));
  }
  return pArray;
}

/*
 * parse Code Block
 * start is first character after the initializing ```
 * we just parse till the ending occurs
 */
function parseCodeBlock(text) {
  text.skipSpaces(false);
  if (text.getChar() === '\n') {
    text.moveForward();
  }
  const cbStart = text.iter;
  while (!text.done()) {
    text.skipSpaces(true);
    if (text.has('```')) {
      const elem = ['cb', text.slice(cbStart)];
      text.move(3);
      return elem;
    }
    text.moveToNextLine();
  }
  const cbText = text.slice(cbStart);
  text.move(3);
  return ['cb', cbText];
}

/*
 * parse quote
 */
function parseQuote(text, opts) {
  // either '<' or '>'
  const quoteChar = text.getChar();
  let quoteText = '';
  while (text.getChar() === quoteChar && text.moveForward()) {
    const line = text.getLine();
    quoteText += line;
  }
  const mQuoteText = new MString(quoteText);
  return [quoteChar, parseMText(mQuoteText, opts, 0)];
}

/*
 * parses Section (contains paragraphs, lists, etc. but no headings or quotes)
 * @param text MString
 * @param headingLevel the number of heading headingLevels we are in
 * @param indent indentation that should be considered (when inside list)
 * returns when encountering heading of <= headingLevel (iter is at # position)
 *   or heading-cancel with three spaces (iter is past newlines)
 *   or ident is smaller than given
 */
function parseMSection(
  text,
  opts,
  headingLevel,
  indent,
) {
  const mdArray = [];
  let pArray = [];
  let lineNr = 0;

  while (!text.done()) {
    const paraLineStart = text.iter;
    lineNr += 1;

    // this also skips spaces
    const curIndent = text.getIndent(opts.tabWidth);

    /*
     * act on indent
     */
    if (curIndent < indent && lineNr > 1) {
      text.setIter(paraLineStart);
      break;
    }

    const chr = text.getChar();

    /*
     * break on heading
     */
    if (!indent && chr === '#') {
      break;
    }

    /*
     * is unordered list
     */
    let isUnorderedList = false;
    let isOrderedList = false;
    if (chr === '-') {
      isUnorderedList = true;
      text.moveForward();
    }

    /*
     * is ordered list
     */
    if (!Number.isNaN(parseInt(chr, 10))) {
      let itern = text.iter + 1;
      for (;!Number.isNaN(parseInt(text.txt[itern], 10)); itern += 1);
      const achr = text.txt[itern];
      if (achr === '.' || achr === ')') {
        isOrderedList = true;
        text.setIter(itern + 1);
      }
    }

    let pushPArray = false;
    let insertElem = null;

    if (isUnorderedList || isOrderedList) {
      /*
       * parse lists
       */
      if (pArray.length) {
        mdArray.push(['p', pArray]);
        pArray = [];
      }
      let childMdArray;
      childMdArray = parseMSection(
        text,
        opts,
        headingLevel,
        curIndent + 1,
      );
      childMdArray = ['-', childMdArray];
      // lists are encapsulated
      const capsule = (isUnorderedList) ? 'ul' : 'ol';
      if (!mdArray.length || mdArray[mdArray.length - 1][0] !== capsule) {
        mdArray.push([capsule, [childMdArray]]);
      } else {
        mdArray[mdArray.length - 1][1].push(childMdArray);
      }
    } else if (chr === '>' || chr === '<') {
      /*
       * quotes
       */
      pushPArray = true;
      insertElem = parseQuote(text, opts);
    } else if (text.has('```')) {
      /*
       * code block
       */
      pushPArray = true;
      text.move(3);
      insertElem = parseCodeBlock(text);
    } else if (!indent && chr === '\n') {
      /*
       * break on multiple newlines
       */
      text.moveForward();
      text.skipSpaces(false);
      if (text.getChar() === '\n') {
        if (headingLevel && opts.newlineBreaksArticles) {
          break;
        }
        text.moveForward();
      }
      pushPArray = true;
    } else {
      /*
       * ordinary text aka paragraph
       */
      const pPArray = parseMParagraph(text, opts);
      if (pPArray) {
        pArray = pArray.concat(pPArray);
      }
      continue;
    }

    if (pushPArray && pArray.length) {
      mdArray.push(['p', pArray]);
      pArray = [];
    }

    if (insertElem) {
      mdArray.push(insertElem);
    }
  }

  if (pArray.length) {
    mdArray.push(['p', pArray]);
  }

  return mdArray;
}

parseMText = (text, opts, headingLevel) => {
  let mdArray = [];
  while (!text.done()) {
    const aMdArray = parseMSection(
      text, opts, headingLevel, 0,
    );
    mdArray = mdArray.concat(aMdArray);
    // either heading hit or article end
    const chr = text.getChar();
    if (chr === '#') {
      let subLvl = text.countRepeatingCharacters();
      if (subLvl <= headingLevel || headingLevel === 6) {
        // end of article
        // encountered title with same headingLevel or lower
        break;
      } else {
        // child article
        text.move(subLvl);
        const title = text.getLine();
        subLvl = Math.min(subLvl, 6);
        const subMdArray = parseMText(
          text, opts, subLvl,
        );
        mdArray.push(['a', subLvl, title, subMdArray]);
      }
    } else {
      break;
    }
  }

  return mdArray;
};

function parseOpts(inOpts) {
  const opts = {};
  opts.parseLinks = (inOpts && inOpts.parseLinks) || false;
  opts.tabWidth = (inOpts && inOpts.tabWidth) || 4;
  opts.newlineBreaksArticles = (inOpts && inOpts.newlineBreaksArticles) || true;
  return opts;
}

export function parseParagraph(text, inOpts) {
  const opts = parseOpts(inOpts);
  const mText = new MString(text);
  return parseMParagraph(mText, opts);
}

export function parse(text, inOpts) {
  const opts = parseOpts(inOpts);
  const mText = new MString(text);
  return parseMText(mText, opts, 0);
}
