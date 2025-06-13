import Preview from './Preview';
import React, { useState, useEffect } from 'react';
import { generateImagePreviewsWithQuality } from './utils/imageProcessor'; // Import the new function
const PreviewCard = ( {result} ) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!result.file) return;
    const url = URL.createObjectURL(result.file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result.file]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #ccc', textAlign: 'center' }}>
      <img src={imageUrl} alt={result.label} style={{ width: '50vw', objectFit: 'contain' }} caption={result.label} />
      <h4>{result.label??'Original'}</h4>
    </div>
  )
}

const ResultCard = ({ result, onSelect }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!result.file) return;
    const url = URL.createObjectURL(result.file);
    setImageUrl(url);

    // Cleanup function to revoke the URL when the component unmounts
    return () => URL.revokeObjectURL(url);
  }, [result.file]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
      <h4>{result.label}</h4>
      {imageUrl && <img src={imageUrl} alt={result.label} style={{ maxWidth: '100%', height: '120px', objectFit: 'contain' }} />}
      <p style={{ margin: '8px 0' }}>
        <strong>{(result.size / 1024).toFixed(1)} KB</strong>
      </p>
      <p style={{ color: result.reduction > 0 ? 'green' : 'red', margin: '8px 0', fontWeight: 'bold' }}>
        {result.reduction.toFixed(0)}% smaller
      </p>
      <p style={{ margin: '8px 0' }}>
        <strong>Quality Score (SSIM):</strong>
        {typeof result.ssimResult === 'number' ? result.ssimResult.toFixed(4) : result.ssimResult}
      </p>
      <button onClick={() => onSelect(result.file)}>Use this version</button>
    </div>
  );
};

function ImageUploader() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('Select an image to see conversion options.');
  const [results, setResults] = useState([]);
  const [originalInfo, setOriginalInfo] = useState(null);
  const [maxWidth, setMaxWidth] = useState(1200);
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => {
    if (!originalInfo?.file) return;
  
    async function fetchPreviews() {
      try {
        const previews = await generateImagePreviewsWithQuality(originalInfo.file, { maxWidth: maxWidth });
        setResults(previews);
      } catch (error) {
        console.error('Error generating previews:', error);
      }
    }
  
    fetchPreviews();
  }, [originalInfo?.file, maxWidth]);


  const handleMaxWidthChange = (event) => {
    setMaxWidth(event.target.value);
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback('Generating previews for all formats...');
    setResults([]);
    setOriginalInfo({ name: file.name, size: file.size, file: file });

    try {
      const previews = await generateImagePreviewsWithQuality(file, { maxWidth: maxWidth });
      setResults(previews);
      if (previews.length === 0) {
        setFeedback('Could not generate any previews. Check browser support (e.g., for AVIF).');
      } else {
        setFeedback('Previews generated successfully. Choose a version to use.');
      }
    } catch (error) {
      setFeedback(`An error occurred: ${error.message}`);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectVersion = (file) => {
    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    
    // Set the download filename with format and size info
    const format = file.type.split('/')[1];
    const size = (file.size / 1024).toFixed(1);
    link.download = `compressed_${format}_${size}KB.${format}`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div>
      <h3>Select Image to Generate Previews</h3>
      <p>Your image will be resized (if width &gt;  ) and converted to multiple formats.</p>
      <h3>Original Width: {results[0]?.originalWidth}</h3>
      <input type="number" value={maxWidth} onChange={handleMaxWidthChange} />
      
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={isProcessing} />
      
      {isProcessing && <p style={{fontWeight: 'bold'}}>Processing, please wait...</p>}
      {feedback && !isProcessing && <p>{feedback}</p>}

      {originalInfo && !isProcessing && (
        <p>Original: <strong>{originalInfo.name}</strong> ({(originalInfo.size / 1024).toFixed(1)} KB)</p>
      )}
      <button onClick={() => setAdvancedMode(!advancedMode)}>Toggle Advanced Mode</button>
      {advancedMode && results.length > 0 && (
        <div>
          <button onClick={() => setAdvancedMode(false)}>X</button>
          <Preview beforeImage={originalInfo} afterImage={results.find(result => result.isOriginalFormat)} width={maxWidth} />
        </div>
        
      )}

      {results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {results.map((result) => (
            <ResultCard key={result.format} result={result} onSelect={handleSelectVersion} />
          ))}
        </div>
      )}

      { results.length > 0 && results.some(result => result.isOriginalFormat) && (
        <div style={{ display: 'flex'}}>
          <PreviewCard result={originalInfo} />
          {results.map((result) => (
            result.isOriginalFormat && <PreviewCard result={result} />
          ))}
        </div>
      )}
      
    </div>
  );
}

export default ImageUploader;