/*
 * webpack loader that
 * marks modules that include ttag as non-cachable
 */
const filtered = {};

module.exports = function (source) {
  if (filtered.hasOwnProperty(this.resourcePath)) {
    if (filtered[this.resourcePath]) {
      this.cacheable(false);
    }
    return source;
  }
  const hasTtag = source.slice(0, 400).includes('ttag');
  filtered[this.resourcePath] = hasTtag;
  if (hasTtag) {
    this.cacheable(false);
  }
  return source;
}
