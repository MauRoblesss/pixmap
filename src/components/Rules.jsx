import React, { useState } from 'react';

const canvasData = [
  {
    name: 'Faction rules',
    rules: [
      'No provocative factions.',
      'Faction must have more than 50 players.',
    ]
  },
  {
    name: 'Game chat',
    rules: [
      'No spamming, hacking, nuking, scamming, ip-grabbing.',
      'No hate.',
      'No gore, no nsfw.'
    ]
  },
  {
    name: 'Earth',
    rules: [
      'No ip changing, vpn, proxy...',
      'No sinking on large territories.',
      'No lands on sea.',
      'No bots.',
      'No more than 2 devices.'
    ]
  },
  {
    name: 'Moon',
    rules: [
      'Dont grief finished arts.',
      'No griding.'
    ]
  }
];

function Rules() {
  const [selectedCanvas, selectCanvas] = useState('Faction rules');

  const canvas = selectedCanvas ? canvasData.find((canvas) => canvas.name === selectedCanvas) : null;

  return (
    <>
      <div className="content">
        {canvasData.map((canvas, ind) => (
          <React.Fragment key={canvas.name}>
            <span
              role="button"
              tabIndex={-1}
              className={
                (selectedCanvas === canvas.name) ? 'modallink selected' : 'modallink'
              }
              onClick={() => selectCanvas(canvas.name)}
              style={{ cursor: 'pointer' }}
            >
              {canvas.name}
            </span>
            {(ind !== canvasData.length - 1) && <span className="hdivider" />}
          </React.Fragment>
        ))}
      </div>
      {canvas && (
        <div style={{ textAlign: 'center' }}>
          {canvas.rules.map((rule, ind) => (
            <div key={ind} style={{ marginBottom: '20px' }}>
              {ind === 0 && <div style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />} 
              <p>{rule}</p>
              {ind !== canvas.rules.length - 1 && <div style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />} 
            </div>
          ))}
          <hr style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />
        </div>
      )}
    </>
  );
}

export default React.memo(Rules);
