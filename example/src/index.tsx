/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { compressToUrl, decompressFromUrl } from "compress-to-url";

// Banner component for URL-passed errors
const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div style={{
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <span>{message}</span>
    <button
      onClick={onClose}
      style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}
    >
      ✕
    </button>
  </div>
);

// React Component
const App: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState('');
  const [urlOutput, setUrlOutput] = useState('');
  const [error, setError] = useState<string | null>(null); // For compression/decompression errors
  const [urlError, setUrlError] = useState<string | null>(null); // For ?error= param

  // Debounce function
  function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: number | undefined;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait) as any;
    };
  }

  // Real-time encoding
  const encodeAsYouType = debounce(async (code: string) => {
    try {
      const result = await compressToUrl(code, {
        inputType: "string",
        mimeType: "text/html",
        normalizeWhitespace: false,
      });
      setUrlOutput(result.payload);
      setError(null);
    } catch (err: any) {
      console.error(`Error compressing: ${err.message}`);
      setError(`Error compressing: ${err.message}`);
    }
  }, 300);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    setHtmlInput(code);
    encodeAsYouType(code);
  };

  // Convert from URL to text
  const convertToText = async () => {
    try {
      const { data } = await decompressFromUrl(urlOutput);
      setHtmlInput(data as string);
      setError(null);
    } catch (err: any) {
      console.error(`Error decompressing: ${err.message}`);
      setError(`Error decompressing: ${err.message}`);
    }
  };

  // Handle URL output change
  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUrlOutput(e.target.value);
  };

  // Handle URL parameters on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedHtml = urlParams.get("u");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam)); // Decode in case it’s URL-encoded
    }

    if (encodedHtml) {
      setUrlOutput(encodedHtml);
      decompressFromUrl(encodedHtml)
        .then(({ data }) => {
          setHtmlInput(data as string);
          setError(null);
        })
        .catch(err => {
          console.error(`Error decoding URL parameter: ${err.message}`);
          setError(`Error decoding URL parameter: ${err.message}`);
        });
    }
  }, []);

  // Generate shareable link
  const shareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("u", urlOutput);
    return url.toString();
  };

  // Close the error banner
  const closeErrorBanner = () => {
    setUrlError(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, document.title, url.toString());
  };

  return (
    <div className="container">
      {urlError && <ErrorBanner message={urlError} onClose={closeErrorBanner} />}
      <h1>HTML to URL Converter</h1>
      <label htmlFor="code">HTML Input:</label>
      <textarea
        id="code"
        placeholder="Enter your HTML here..."
        value={htmlInput}
        onChange={handleInputChange}
      />
      <div className="button-group">
        <button onClick={convertToText}>Convert from URL</button>
      </div>
      <hr />
      <label htmlFor="url">URL Output:</label>
      <textarea
        id="url"
        placeholder="Compressed URL will appear here..."
        value={urlOutput}
        onChange={handleUrlChange}
      />
      <div id="counter">Characters: {urlOutput.length}</div>
      {urlOutput && (
        <div id="share-link">
          Shareable Link: <a href={shareLink()} target="_blank">{shareLink()}</a>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

// Render the React app
if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
  } else {
    console.error('Root element #root not found in the document.');
  }
}

export { compressToUrl, decompressFromUrl };
