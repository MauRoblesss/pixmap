import React, { useState } from 'react';


const continentData = [
  {
    name: 'Europe',
    factions: [
      {
        name: '',
        leader: '',
        discordInvite: ''
      }
    ]
  },
  {
    name: 'Asia',
    factions: [
      {
        name: '',
        leader: '',
        discordInvite: ''
      }
    ]
  },
  {
    name: 'America',
    factions: [
      {
        name: '',
        leader: '',
        discordInvite: ''
      }
    ]
  },
  {
    name: 'Africa',
    factions: [
      {
        name: '',
        leader: '',
        discordInvite: ''
      }
    ]
  },
  {
    name: 'Fictional',
    factions: [
      {
        name: '',
        leader: '',
        discordInvite: ''
      }
    ]
  },
];

function Factions() {
  const [selectedContinent, selectContinent] = useState('Europe');

  const continent = selectedContinent ? continentData.find((continent) => continent.name === selectedContinent) : null;

  return (
    <>
      <div className="content">
        {continentData.map((continent, ind) => (
          <React.Fragment key={continent.name}>
            <span
              role="button"
              tabIndex={-1}
              className={
                (selectedContinent === continent.name) ? 'modallink selected' : 'modallink'
              }
              onClick={() => selectContinent(continent.name)}
              style={{ cursor: 'pointer' }}
            >
              {continent.name}
            </span>
            {(ind !== continentData.length - 1) && <span className="hdivider" />}
          </React.Fragment>
        ))}
      </div>
      {continent && (
        <div style={{ textAlign: 'center' }}>
          {continent.factions.map((faction, ind) => (
            <div key={ind} style={{ marginBottom: '20px' }}>
              {ind === 0 && <div style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />} 
              <h3 style={{ margin: '0 auto', width: 'fit-content' }}>{faction.name}</h3> 
              <p><strong>Leader:</strong> {faction.leader}</p>
              <p><strong>Discord Invite:</strong> <a href={faction.discordInvite} target="_blank">{faction.discordInvite}</a></p>
              {ind !== continent.factions.length - 1 && <div style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />} 
            </div>
          ))}
         <hr style={{ borderTop: '1px solid #ccc', margin: '10px auto', width: '50%' }} />
        </div>
      )}
    </>
  );
}

export default React.memo(Factions);
