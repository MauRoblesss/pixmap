export default function setStyle(style) {
  const cssUri = window.ssv.availableStyles[style];
  const domStyle = document.getElementById('globcss');
  const curUri = domStyle.getAttribute('href');
  if (curUri !== cssUri) {
    domStyle.setAttribute('href', cssUri);
  }
}
