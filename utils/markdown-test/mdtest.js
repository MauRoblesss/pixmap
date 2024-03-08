import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { parse } from '../../src/core/MarkdownParser';

import Markdown from './Markdown';

function parseText(text, setDuration, setMd) {
  const startt = Date.now();
  const arr = parse(text);
  setDuration(Date.now() - startt);
  setMd(arr);
}

const App = () => {
  const [md, setMd] = useState([]);
  const [duration, setDuration] = useState('');

  return (
    <div>
      <textarea
        cols="100"
        rows="30"
        onChange={(evt) => {
          parseText(evt.target.value, setDuration, setMd);
        }}
      />
      <p>Parse-time: {duration}ms</p>
      <Markdown mdArray={md} />
      <textarea
        cols="100"
        rows="30"
        readOnly
        value={JSON.stringify(md, null, 2)}
      />
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('reactroot'));
});

