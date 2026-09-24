// Turns SVG strings into HTMLImageElements once and caches them for the canvas renderer.
import { svgDataUrl } from '../util.js';

const cache = new Map();
let onLoadCallback = null;

export function setImageLoadCallback(fn) {
  onLoadCallback = fn;
}

// Returns an Image (possibly not yet loaded). Check `.complete && .naturalWidth` before drawing.
export function getImage(key, svgFactory) {
  let img = cache.get(key);
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    img.__ready = true;
    if (onLoadCallback) onLoadCallback();
  };
  img.onerror = (e) => console.warn('image failed', key, e);
  img.src = svgDataUrl(svgFactory());
  cache.set(key, img);
  return img;
}

export function imageReady(img) {
  return !!(img && img.__ready && img.naturalWidth > 0);
}

export function clearImageCache() {
  cache.clear();
}
