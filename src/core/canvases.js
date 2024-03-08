import path from 'path';
import { readFileSync } from 'fs';

const canvases = JSON.parse(readFileSync(
  path.resolve(__dirname, './canvases.json'),
));

export default canvases;
