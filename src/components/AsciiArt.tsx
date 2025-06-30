import React from 'react';

interface AsciiArtProps {
  art: string;
}

const AsciiArt: React.FC<AsciiArtProps> = ({ art }) => {
  return <pre className="ascii-art">{art}</pre>;
};

export default AsciiArt; 