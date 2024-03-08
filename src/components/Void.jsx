import React, { useState, useEffect } from 'react';

const Void = () => {
  const [content, setContent] = useState('');
  const url = 'https://pixmap.fun/void'; // Cambia esta URL por la que necesites

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          throw new Error('Failed to fetch content');
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        setContent('Error fetching content. Please try again later.');
      }
    };

    fetchData();

    // Cleanup function to abort fetch if component unmounts or URL changes
    return () => {
      // Cleanup logic here if needed
    };
  }, [url]);

  return (
    <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>
      {content}
    </div>
  );
};

export default Void;
