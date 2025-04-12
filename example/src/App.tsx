/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { useState, useEffect } from 'react';
import ErrorBanner from './ErrorBanner';
import InstructionsModal from './InstructionsModal';
import RedirectDialog from './RedirectDialog';
import { MetaFields, ActiveFields } from './types';
import {
  debounce,
  compressCode,
  parseMetaFields,
  updateActiveFields,
  socialMetadataTemplate,
  jsonLdTemplate,
} from './utils';

const encodingCache = new Map<string, string>();

export default function App() {
  const [htmlInput, setHtmlInput] = useState<string>((window as any).DEFAULT_HTML || '');
  const [urlOutput, setUrlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [metaFields, setMetaFields] = useState<MetaFields>({
    title: '',
    description: '',
    image_url: '',
    url: '',
  });
  const [activeFields, setActiveFields] = useState<ActiveFields>({
    description: false,
    image_url: false,
    url: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedirectOpen, setIsRedirectOpen] = useState(false);

  const encodeAsYouType = debounce(async (code: string) => {
    try {
      const payload = await compressCode(code, encodingCache);
      setUrlOutput(payload);
      const url = new URL(window.location.href);
      url.searchParams.set('u', payload);
      url.searchParams.set('edit', '1');
      window.history.replaceState({}, document.title, url.toString());
      setError(null);
    } catch (err: any) {
      setError(`Error compressing: ${err.message}`);
    }
  }, 300);

  const insertMetadata = (type: 'social' | 'jsonld') => {
    const lines = htmlInput.split('\n');
    const headIndex = lines.findIndex(line => line.trim().startsWith('<head>'));
    const template = type === 'social' ? socialMetadataTemplate() : jsonLdTemplate();
    const newFields = parseMetaFields(template);
    const newActive = updateActiveFields(template);

    if (headIndex === -1) {
      const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${metaFields.title || 'My Page'}</title>
${template}
</head>
<body>
${htmlInput.trim() || '<h1>Your Content Here</h1>'}
</body>
</html>`;
      setHtmlInput(newHtml);
      setMetaFields(newFields);
      setActiveFields(newActive);
      encodeAsYouType(newHtml);
    } else if (!lines.some(line => line.includes(type === 'social' ? 'og:title' : 'application/ld+json'))) {
      lines.splice(headIndex + 1, 0, ...template.split('\n').map(line => '  ' + line.trim()));
      const newHtml = lines.join('\n');
      setHtmlInput(newHtml);
      setMetaFields(newFields);
      setActiveFields(newActive);
      encodeAsYouType(newHtml);
    }
  };

  const updateHtmlFromFields = (fields: MetaFields) => {
    let lines = htmlInput.split('\n');
    const headIndex = lines.findIndex(line => line.trim().startsWith('<head>'));
    const hasJsonLd = lines.some(line => line.includes('application/ld+json'));

    if (hasJsonLd) {
      const jsonLdIndex = lines.findIndex(line => line.includes('application/ld+json'));
      const jsonLdEndIndex = lines.slice(jsonLdIndex).findIndex(line => line.includes('</script>')) + jsonLdIndex;
      lines.splice(jsonLdIndex, jsonLdEndIndex - jsonLdIndex + 1);
    }

    if (headIndex === -1) {
      const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${fields.title}</title>
${fields.description ? `  <meta property="og:description" content="${fields.description}">\n  <meta name="twitter:description" content="${fields.description}">` : ''}
${fields.image_url ? `  <meta property="og:image" content="${fields.image_url}">\n  <meta name="twitter:image" content="${fields.image_url}">` : ''}
${fields.url ? `  <meta property="og:url" content="${fields.url}">` : ''}
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
${hasJsonLd ? `  <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "WebPage",
      "name": "${fields.title}",
      "description": "${fields.description}",
      "image": "${fields.image_url}",
      "url": "${fields.url}"
    }
  </script>` : ''}
</head>
<body>
${htmlInput.trim() || '<h1>Your Content Here</h1>'}
</body>
</html>`;
      setHtmlInput(newHtml);
      setActiveFields(updateActiveFields(newHtml));
      encodeAsYouType(newHtml);
    } else {
      lines = lines.map(line => {
        if (line.match(/<title>/i)) return `  <title>${fields.title}</title>`;
        if (line.match(/og:title/i)) return `  <meta property="og:title" content="${fields.title}">`;
        if (line.match(/twitter:title/i)) return `  <meta name="twitter:title" content="${fields.title}">`;
        if (fields.description && line.match(/og:description/i)) return `  <meta property="og:description" content="${fields.description}">`;
        if (fields.description && line.match(/twitter:description/i)) return `  <meta name="twitter:description" content="${fields.description}">`;
        if (fields.image_url && line.match(/og:image/i)) return `  <meta property="og:image" content="${fields.image_url}">`;
        if (fields.image_url && line.match(/twitter:image/i)) return `  <meta name="twitter:image" content="${fields.image_url}">`;
        if (fields.url && line.match(/og:url/i)) return `  <meta property="og:url" content="${fields.url}">`;
        return line;
      });

      if (hasJsonLd) {
        const insertIndex = lines.slice(headIndex + 1).findIndex(line => !line.trim().startsWith('<meta') && !line.trim().startsWith('<title')) + headIndex + 1 || headIndex + 1;
        lines.splice(insertIndex, 0, ...jsonLdTemplate().split('\n').map(line => `  ${line.trim()}`));
      }

      const newHtml = lines.join('\n');
      setHtmlInput(newHtml);
      setActiveFields(updateActiveFields(newHtml));
      encodeAsYouType(newHtml);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    setHtmlInput(code);
    setMetaFields(parseMetaFields(code));
    setActiveFields(updateActiveFields(code));
    encodeAsYouType(code);
  };

  const handleMetaChange = (field: keyof MetaFields, value: string) => {
    const newFields = { ...metaFields, [field]: value };
    setMetaFields(newFields);
    updateHtmlFromFields(newFields);
  };

  const generateRedirectPage = ({
    redirectUrl,
    title,
    description,
    image,
    url,
    includeJsonLd,
  }: {
    redirectUrl: string;
    title: string;
    description: string;
    image: string;
    url: string;
    includeJsonLd: boolean;
  }) => {
    const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  ${title ? `<title>${title}</title>` : ''}
  ${title ? `<meta property="og:title" content="${title}">` : ''}
  ${title ? `<meta name="twitter:title" content="${title}">` : ''}
  ${description ? `<meta property="og:description" content="${description}">` : ''}
  ${description ? `<meta name="twitter:description" content="${description}">` : ''}
  ${image ? `<meta property="og:image" content="${image}">` : ''}
  ${image ? `<meta name="twitter:image" content="${image}">` : ''}
  ${url ? `<meta property="og:url" content="${url}">` : ''}
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  ${includeJsonLd && title ? jsonLdTemplate()
      .replace('[Your Title]', title)
      .replace('[Your Description]', description)
      .replace('[Your Image URL]', image)
      .replace('[Your URL]', url) : ''}
  <style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  </style>
</head>
<body>
  <div class="container">
    <a href="${redirectUrl}"><img src="${image}" alt="${title}"></a>
  </div>
</body>
</html>`;
    setHtmlInput(newHtml);
    setMetaFields(parseMetaFields(newHtml));
    setActiveFields(updateActiveFields(newHtml));
    encodeAsYouType(newHtml);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedHtml = urlParams.get('u');
    const errorParam = urlParams.get('error');

    if (errorParam) setUrlError(decodeURIComponent(errorParam));
    if (encodedHtml) {
      setUrlOutput(encodedHtml);
      // No decompression here; editor starts with empty textarea or DEFAULT_HTML
    } else if ((window as any).DEFAULT_HTML) {
      const defaultHtml = (window as any).DEFAULT_HTML;
      setHtmlInput(defaultHtml);
      setMetaFields(parseMetaFields(defaultHtml));
      setActiveFields(updateActiveFields(defaultHtml));
      encodeAsYouType(defaultHtml);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsRedirectOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shareLink = () => {
    const url = new URL(window.location.origin);
    url.pathname = '/';
    url.searchParams.set('u', urlOutput);
    url.searchParams.delete('edit');
    return url.toString();
  };

  return (
    <div className="layout">
      <div className="left-panel">
        <p>Test social media metadata and share HTML via compressed URLs.</p>
        <a href="#" className="instructions-link" onClick={e => { e.preventDefault(); setIsModalOpen(true); }}>
          How to Use This Tool
        </a>
        <InstructionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
      <div className="container">
        {urlError && (
          <ErrorBanner
            message={urlError}
            onClose={() => {
              setUrlError(null);
              const url = new URL(window.location.href);
              url.searchParams.delete('error');
              window.history.replaceState({}, document.title, url.toString());
            }}
          />
        )}
        <h1>HTML to URL Converter</h1>
        <label htmlFor="code">HTML Input:</label>
        <textarea
          id="code"
          placeholder="Enter your HTML here..."
          value={htmlInput}
          onChange={handleInputChange}
          style={{ minWidth: '300px', width: '100%', maxWidth: '800px', minHeight: '300px', height: 'auto', maxHeight: '600px' }}
        />
        <div className="button-group">
          <button onClick={() => insertMetadata('social')}>Add Social Metadata</button>
          <button onClick={() => insertMetadata('jsonld')}>Add JSON-LD</button>
          <button onClick={() => setIsRedirectOpen(true)}>Generate Redirect</button>
        </div>
        <hr />
        <div id="counter">Characters: {urlOutput.length}</div>
        {urlOutput && (
          <div id="share-link">
            Shareable Link: <a href={shareLink()} target="_blank">{shareLink()}</a>
          </div>
        )}
        {error && <div className="red">{error}</div>}
        <RedirectDialog
          isOpen={isRedirectOpen}
          onClose={() => setIsRedirectOpen(false)}
          onGenerate={generateRedirectPage}
        />
      </div>
      <div className="right-panel">
        <h2>Metadata</h2>
        {(['title', 'description', 'image_url', 'url'] as const).map(field => (
          <div key={field} style={{ display: field === 'title' || activeFields[field] ? 'block' : 'none' }}>
            <label htmlFor={`meta-${field}`}>{field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}:</label>
            <input
              id={`meta-${field}`}
              type={field.includes('url') ? 'url' : 'text'}
              value={metaFields[field]}
              onChange={e => handleMetaChange(field, e.target.value)}
              placeholder={`Enter ${field.replace('_', ' ')}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
