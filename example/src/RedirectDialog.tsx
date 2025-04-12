import { useState, useEffect } from 'react';
import { debounce, scrapeMetadata, getScraperUrl } from './utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: {
    redirectUrl: string;
    title: string;
    description: string;
    image: string;
    url: string;
    includeJsonLd: boolean;
  }) => void;
}

export default function RedirectDialog({ isOpen, onClose, onGenerate }: Props) {
  const [redirectUrl, setRedirectUrl] = useState('');
  const [confirmedUrl, setConfirmedUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [includeJsonLd, setIncludeJsonLd] = useState(true);

  useEffect(() => {
    setUrl(redirectUrl);
  }, [redirectUrl]);

  useEffect(() => {
    if (!getScraperUrl() || !confirmedUrl) return;
    const scrape = debounce(async () => {
      const metadata = await scrapeMetadata(confirmedUrl);
      if (!metadata) return;
      if (!title) setTitle(metadata.title || '');
      if (!description) setDescription(metadata.description || '');
      if (!image) setImage(metadata.image_url || '');
      if (!url) setUrl(metadata.url || redirectUrl);
    }, 500);
    scrape();
  }, [confirmedUrl, title, description, image, url]);

  const handleUrlConfirm = () => {
    if (redirectUrl !== confirmedUrl) {
      setConfirmedUrl(redirectUrl);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUrlConfirm();
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ redirectUrl, title, description, image, url, includeJsonLd });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '700px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <h2>Generate Redirect with Metadata</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="redirect-url">Redirect URL:</label>
          <input
            id="redirect-url"
            type="url"
            value={redirectUrl}
            onChange={e => setRedirectUrl(e.target.value)}
            onBlur={handleUrlConfirm}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            required
          />
          <label htmlFor="meta-title">Title:</label>
          <input
            id="meta-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter title"
          />
          <label htmlFor="meta-description">Description:</label>
          <input
            id="meta-description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter description"
          />
          <label htmlFor="meta-image">Image URL:</label>
          <input
            id="meta-image"
            type="url"
            value={image}
            onChange={e => setImage(e.target.value)}
            placeholder="Enter image URL"
          />
          {image && (
            <img
              src={image}
              alt="Thumbnail preview"
              style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', objectFit: 'contain' }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
          <label htmlFor="meta-url">Canonical URL:</label>
          <input
            id="meta-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter URL"
          />
          <div style={{ marginTop: '10px', display: 'flex' }}>
            <input
              type="checkbox"
              id="include-jsonld"
              checked={includeJsonLd}
              onChange={e => setIncludeJsonLd(e.target.checked)}
              style={{ verticalAlign: 'middle', marginRight: '5px', width: 50 }}
            />
            <label htmlFor="include-jsonld" style={{ verticalAlign: 'middle' }}>Include JSON-LD</label>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button type="submit">Generate</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
