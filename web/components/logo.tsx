import React, { useState } from 'react';

const Logo = () => {
  const [isHovered, setIsHovered] = useState(false);

  const words = [
    { letter: 'P', text: 'lanning' },
    { letter: 'A', text: 'nalysis' },
    { letter: 'D', text: 'esign' }
  ];

  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <div 
          className="flex items-center gap-2 cursor-pointer px-8 py-6 rounded-xl transition-shadow duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {words.map((word, index) => (
            <div key={word.letter} className="flex items-center">
              {/* Letter - stays fixed */}
              <span 
                className="text-6xl font-bold text-gray-900 transition-transform duration-300"
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transitionDelay: `${index * 50}ms`
                }}
              >
                {word.letter}
              </span>
              
              {/* Word container that expands smoothly */}
              <div 
                className="transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
                style={{
                  maxWidth: isHovered ? '200px' : '0px',
                  opacity: isHovered ? 1 : 0,
                  transitionDelay: isHovered ? `${index * 100 + 200}ms` : `${index * 50}ms`
                }}
              >
                <span className="text-4xl text-gray-400 font-medium whitespace-nowrap">
                  {word.text}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Logo;