/*
 * class for string iterations
 * that is used by MarkdownParser.js
 */

export default class MString {
  constructor(text, start) {
    this.txt = text;
    this.iter = start || 0;
  }

  done() {
    return (this.iter >= this.txt.length);
  }

  moveForward() {
    this.iter += 1;
    return (this.iter < this.txt.length);
  }

  setIter(iter) {
    this.iter = iter;
  }

  getChar() {
    return this.txt[this.iter];
  }

  slice(start, end) {
    return this.txt.slice(start, end || this.iter);
  }

  has(str) {
    return this.txt.startsWith(str, this.iter);
  }

  move(cnt) {
    this.iter += cnt;
    return (this.iter < this.txt.length);
  }

  skipSpaces(skipNewlines = false) {
    for (;this.iter < this.txt.length; this.iter += 1) {
      const chr = this.txt[this.iter];
      if (chr !== ' ' && chr !== '\t' && (!skipNewlines || chr !== '\n')) {
        break;
      }
    }
  }

  countRepeatingCharacters() {
    const chr = this.getChar();
    let newIter = this.iter + 1;
    for (;newIter < this.txt.length && this.txt[newIter] === chr;
      newIter += 1
    );
    return newIter - this.iter;
  }

  moveToNextLine() {
    const lineEnd = this.txt.indexOf('\n', this.iter);
    if (lineEnd === -1) {
      this.iter = this.txt.length;
    } else {
      this.iter = lineEnd + 1;
    }
  }

  getLine() {
    const startLine = this.iter;
    this.moveToNextLine();
    return this.txt.slice(startLine, this.iter);
  }

  getIndent(tabWidth) {
    let indent = 0;
    while (this.iter < this.txt.length) {
      const chr = this.getChar();
      if (chr === '\t') {
        indent += tabWidth;
      } else if (chr === ' ') {
        indent += 1;
      } else {
        break;
      }
      this.iter += 1;
    }
    return indent;
  }

  goToCharInLine(chr) {
    let { iter } = this;
    for (;
      iter < this.txt.length && this.txt[iter] !== '\n'
        && this.txt[iter] !== chr;
      iter += 1
    );
    if (this.txt[iter] === chr) {
      this.iter = iter;
      return iter;
    }
    return false;
  }

  static isWhiteSpace(chr) {
    return (chr === ' ' || chr === '\t' || chr === '\n');
  }

  /*
   * check if the current '[' is part of a [y](z) enclosure
   * returns [y, z] if it is enclosure, null otherwise
   * moves iter to last closing braked if it is enclosure
   * check Emojis IzEmoji = true
   * returns [y]
   */
  checkIfEnclosure(zIsLink, IsEmoji) {
    // E Emoji
    if(IsEmoji) {
      let yStart = this.iter;
      let yEnd = yStart;
      const escapePositions = [];
      while (this.txt[yEnd] !== ':') {
        const chr = this.txt[yEnd];
        if (chr === '\\') {
          // escape character
          escapePositions.push(yEnd);
          yEnd += 2;
          continue;
        }
        if (yEnd >= this.txt.length
          || chr === '\n'
        ) {
          return null;
        }
        yEnd += 1;
      }

      let y = '';
      // remove escape characters
      for (let iter = 0; iter < escapePositions.length; iter += 1) {
        const escapePosition = escapePositions[iter];
        y += this.txt.slice(yStart, escapePosition);
        yStart = escapePosition + 1;
      }
      if (yStart < yEnd) {
        y += this.txt.slice(yStart, yEnd);
      }

      this.iter = yEnd;
      return [y];
    }
    // continue

    let yStart = this.iter + 1;
    let yEnd = yStart;
    const escapePositions = [];
    while (this.txt[yEnd] !== ']') {
      const chr = this.txt[yEnd];
      if (chr === '\\') {
        // escape character
        escapePositions.push(yEnd);
        yEnd += 2;
        continue;
      }
      if (yEnd >= this.txt.length
        || chr === '\n'
      ) {
        return null;
      }
      yEnd += 1;
    }

    let zStart = yEnd + 1;
    if (this.txt[zStart] !== '(') {
      return null;
    }
    zStart += 1;

    let zEnd = zStart;
    let z = null;
    while (this.txt[zEnd] !== ')') {
      const chr = this.txt[zEnd];
      if (zEnd >= this.txt.length
        || chr === '\n'
        || chr === '['
        || chr === '('
      ) {
        return null;
      }
      if (zIsLink && chr === ':') {
        // set this.iter temporarily to be able to use thischeckIfLink
        const oldIter = this.iter;
        this.iter = zEnd;
        z = this.checkIfLink(true);
        zEnd = this.iter;
        this.iter = oldIter;
        if (z === null) {
          return null;
        }
        continue;
      }
      zEnd += 1;
    }
    if (zEnd < zStart + 1 || (!z && zIsLink)) {
      return null;
    }

    if (!zIsLink) {
      z = this.txt.slice(zStart, zEnd);
    }

    let y = '';
    // remove escape characters
    for (let iter = 0; iter < escapePositions.length; iter += 1) {
      const escapePosition = escapePositions[iter];
      y += this.txt.slice(yStart, escapePosition);
      yStart = escapePosition + 1;
    }
    if (yStart < yEnd) {
      y += this.txt.slice(yStart, yEnd);
    }

    this.iter = zEnd;
    return [y, z];
  }
  
  /*
   * Convoluted way to check if the current ':' is part of a link
   * we do not check for a 'http' because we might support application links
   * like tg://... or discord://..
   * returns the link or false if there is none
   * moves iter forward to after the link, if there's one
   */
  checkIfLink(enclosure = false) {
    let cIter = this.iter;
    if (!this.txt.startsWith('://', cIter) || cIter < 3) {
      return null;
    }

    let linkStart = cIter - 1;
    for (; linkStart >= 0
      && !MString.isWhiteSpace(this.txt[linkStart])
      && this.txt[linkStart] !== '('; linkStart -= 1);
    linkStart += 1;

    cIter += 3;
    for (; cIter < this.txt.length
      && !MString.isWhiteSpace(this.txt[cIter])
      && (!enclosure || this.txt[cIter] !== ')'); cIter += 1
    );
    if (cIter < this.iter + 4) {
      return null;
    }

    /* special case where someone pasted a http link after a text
     * without space in between
     */
    let link = this.txt.slice(linkStart, cIter);
    const httpOc = link.indexOf('http');
    if (httpOc !== -1 && httpOc !== 0) {
      linkStart += httpOc;
      link = this.txt.slice(linkStart, cIter);
    }

    this.iter = cIter;
    return link;
  }

  /*
   * Check if current '#' is part of ppfun coordinates (example: #d,23,11,-10)
   * @return null if not coords, otherwise the coords string
   */
  checkIfCoords() {
    let cIter = this.iter + 1;
    while (cIter < this.txt.length) {
      const chr = this.txt[cIter];
      if (chr === ',') {
        break;
      }
      if (MString.isWhiteSpace(chr)
        || !Number.isNaN(Number(chr))
      ) {
        return null;
      }
      cIter += 1;
    }
    if (cIter >= this.txt.length
      || cIter - this.iter > 12
      || cIter === this.iter
    ) {
      return null;
    }
    cIter += 1;
    const curChr = this.txt[cIter];
    if (curChr !== '-' && Number.isNaN(curChr)) {
      return null;
    }
    cIter += 1;
    let sectCount = 1;
    while (cIter < this.txt.length && !MString.isWhiteSpace(this.txt[cIter])) {
      const chr = this.txt[cIter];
      if (chr === ',') {
        sectCount += 1;
      } else if (chr !== '-' && Number.isNaN(Number(chr))) {
        return null;
      }
      cIter += 1;
    }
    if (sectCount < 2
      || sectCount > 3
      || this.txt[cIter - 1] === ','
    ) {
      return null;
    }

    const coords = this.txt.slice(this.iter, cIter);
    this.iter = cIter;
    return coords;
  }
}
