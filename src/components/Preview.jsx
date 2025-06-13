import React, { useState, useEffect, useCallback } from 'react';

/**
 * ImageTogglePopup Component
 * Displays a "before" image and reveals an "after" image on press-and-hold.
 *
 * @param {object} props
 * @param {string} props.beforeImage - URL for the "before" image.
 * @param {string} props.afterImage - URL for the "after" image.
 */
const ImageTogglePopup = ({ beforeImage, afterImage, width }) => {
  // State to track if the "after" image should be visible
  console.log(beforeImage, afterImage);
  
  const [isAfterVisible, setIsAfterVisible] = useState(false);
  
  // State to manage loading of images to prevent showing before they are ready
  const [isBeforeLoaded, setIsBeforeLoaded] = useState(false);
  const [isAfterLoaded, setIsAfterLoaded] = useState(false);
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');
  // Preload images to ensure they are cached by the browser for a smooth transition
  useEffect(() => {
    if(!beforeImage || !afterImage) return;
    const bURL=URL.createObjectURL(beforeImage.file);
    const aURL=URL.createObjectURL(afterImage.file);
    setBeforeUrl(bURL);
    setAfterUrl(aURL);
    
    return () => {
      URL.revokeObjectURL(beforeImage.file);
      URL.revokeObjectURL(afterImage.file);
    }
  }, [beforeImage, afterImage]);

  // Event handlers to show the "after" image
  const handleShowAfter = useCallback(() => {
    setIsAfterVisible(true);
  }, []);
  
  // Event handlers to show the "before" image
  const handleShowBefore = useCallback(() => {
    setIsAfterVisible(false);
  }, []);

  const bothImagesLoaded = isBeforeLoaded && isAfterLoaded;

  return (
    <div
      className="relative w-full aspect-video rounded-xl shadow-2xl overflow-hidden select-none bg-gray-800 flex items-center justify-center"
      // Desktop events
      onMouseDown={handleShowAfter}
      onMouseUp={handleShowBefore}
      onMouseLeave={handleShowBefore} // Revert if mouse leaves the area while pressed
      // Mobile events
      onTouchStart={handleShowAfter}
      onTouchEnd={handleShowBefore}
      onTouchCancel={handleShowBefore} // Revert if the touch is interrupted
    >
      {!bothImagesLoaded && (
        <div className="text-white">Loading images...</div>
      )}

      {/* Before Image - always rendered, but its opacity is changed */}
      <img
        src={beforeUrl}
        alt="Before"
        style={{ display: isAfterVisible ? 'none' : 'block',
            width: `${width}px`,
            height: 'auto',
         }}
      />
      
      {/* After Image - always rendered, but its opacity is changed */}
      <img
        src={afterUrl}
        alt="After"
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${bothImagesLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ display: isAfterVisible ? 'block' : 'none',
            width: `${width}px`,
            height: 'auto',
         }}
      />
      
      {/* Informational Text Overlay */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300 pointer-events-none ${bothImagesLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        {isAfterVisible ? 'After' : 'Before (Hold to compare)'}
      </div>
    </div>
  );
};

export default ImageTogglePopup;