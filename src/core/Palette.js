/*
 * Palette
 */

class Palette {
  length;
  rgb;
  colors;
  abgr;
  fl;

  constructor(colors) {
    this.length = colors.length;
    this.rgb = new Uint8Array(this.length * 3);
    this.colors = new Array(this.length);
    this.abgr = new Uint32Array(this.length);
    this.fl = new Array(this.length);

    let cnt = 0;
    for (let index = 0; index < colors.length; index++) {
      const r = colors[index][0];
      const g = colors[index][1];
      const b = colors[index][2];
      this.rgb[cnt++] = r;
      this.rgb[cnt++] = g;
      this.rgb[cnt++] = b;
      this.colors[index] = `rgb(${r}, ${g}, ${b})`;
      this.abgr[index] = (0xFF000000) | (b << 16) | (g << 8) | (r);
      this.fl[index] = [r / 256, g / 256, b / 256];
    }
  }

  /*
  * Check if a color is light (closer to white) or dark (closer to black)
  * @param color Index of color in palette
  * @return dark True if color is dark
  */
  isDark(color) {
    color *= 3;
    const r = this.rgb[color++];
    const g = this.rgb[color++];
    const b = this.rgb[color];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return (luminance < 128);
  }

  /*
   * Get last matching color index of RGB color
   * @param r r
   * @param g g
   * @param b b
   * @return index of color
   */
  getIndexOfColor(
    r,
    g,
    b,
  ) {
    const { rgb } = this;
    let i = rgb.length / 3;
    while (i > 0) {
      i -= 1;
      const off = i * 3;
      if (rgb[off] === r
          && rgb[off + 1] === g
          && rgb[off + 2] === b
      ) {
        return i;
      }
    }
    return null;
  }

  /*
   * Get closest matching color index of RGB color
   * @param r r
   * @param g g
   * @param b b
   * @return index of color
   */
  getClosestIndexOfColor(
    r,
    g,
    b,
  ) {
    const { rgb } = this;
    let i = rgb.length / 3;
    let closestIndex = 0;
    let closestDistance = null;
    while (i > 0) {
      i -= 1;
      const off = i * 3;
      let distance = (rgb[off] - r) ** 2;
      distance += (rgb[off + 1] - g) ** 2;
      distance += (rgb[off + 2] - b) ** 2;
      if (closestDistance === null || closestDistance > distance) {
        closestIndex = i;
        closestDistance = distance;
      }
    }
    return closestIndex;
  }
}

export default Palette;
