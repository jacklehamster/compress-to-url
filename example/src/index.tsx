/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { compressToUrl, decompressFromUrl } from "compress-to-url";

const encodingCache = new Map<string, string>();

const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="error-banner">
    <span>{message}</span>
    <button className="error-banner-close" onClick={onClose}>✕</button>
  </div>
);

const InstructionsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>How to Use This Tool</h2>
        <p>This tool compresses HTML into shareable URLs, making it easy to test and prototype web content. Here’s how to use it and why it’s useful:</p>
        <h3>Main Purpose: Test Social Metadata</h3>
        <p>The primary goal is to test social media metadata (Open Graph, Twitter Cards, JSON-LD) to ensure your web pages look great when shared on platforms like X, Facebook, or LinkedIn. Here’s how:</p>
        <ul>
          <li><strong>Enter HTML</strong>: Type or paste your HTML into the textarea, including metadata tags like <code>&lt;meta property="og:title"&gt;</code>.</li>
          <li><strong>Add Metadata</strong>: Click "Add Social Metadata" to insert Open Graph and Twitter Card tags, or "Add JSON-LD" for structured data.</li>
          <li><strong>Edit Metadata</strong>: Use the right panel to update fields (title, description, image, URL). Changes sync to all related tags in the HTML.</li>
          <li><strong>Test the Link</strong>: The shareable link compresses your HTML. Share it on social platforms or use preview tools (e.g., X’s Card Validator) to check how it renders.</li>
        </ul>
        <h3>Generate Redirect Pages</h3>
        <p>Create a redirect page to share links with custom social metadata, especially for websites with missing or incorrect metadata (e.g., to change the thumbnail image):</p>
        <ul>
          <li><strong>Click "Generate Redirect"</strong>: Opens a dialog to input a URL.</li>
          <li><strong>Enter Details</strong>: Provide the redirect URL and optional metadata (title, description, image, URL).</li>
          <li><strong>Include JSON-LD</strong>: Check the box to add structured data (optional).</li>
          <li><strong>Generate</strong>: Creates an HTML page with a <code>&lt;meta http-equiv="refresh"&gt;</code> tag to redirect to your URL, plus social metadata for sharing.</li>
          <li><strong>Share</strong>: The textarea updates with the HTML, and the shareable link lets you share the redirect page on social media with your custom metadata.</li>
        </ul>
        <h3>Other Uses</h3>
        <p>Beyond social metadata and redirects, this tool has versatile applications:</p>
        <ul>
          <li><strong>Share Lightweight HTML</strong>: Create small web snippets (e.g., a landing page mockup) and share them via a compressed URL without hosting.</li>
          <li><strong>Prototype Web Content</strong>: Quickly test HTML/CSS layouts by editing in the textarea and sharing the result instantly.</li>
          <li><strong>Educational Demos</strong>: Teach HTML or metadata concepts by sharing live examples that others can edit and view.</li>
          <li><strong>Temporary Content</strong>: Generate disposable web pages for one-off demos or experiments without server setup.</li>
        </ul>
        <h3>Developer Notes</h3>
        <p>This tool was an experiment in <em>Vibe coding</em>—building with a focus on flow and intuition. My goal was to create a way to test social metadata on the fly, without complex setups. Here’s why and how it came together:</p>
        <ul>
          <li><strong>Motivation</strong>: I wanted a quick way to prototype and verify how metadata (like Open Graph or Twitter Cards) appears on social platforms, instantly.</li>
          <li><strong>Technical Challenge</strong>: A pure JavaScript app wouldn’t suffice—social platforms need a server-rendered page to scrape metadata. I chose <a rel="noopener" href="https://workers.cloudflare.com/" target="_blank">Cloudflare Workers</a> for its low-cost, serverless page generation.</li>
          <li><strong>No Storage</strong>: To avoid storage costs, the entire page is encoded in the URL itself. Nothing is stored on our server—every link is self-contained.</li>
        </ul>
        <h3>Tips</h3>
        <ul>
          <li>Fields stay visible once added, even if cleared, until metadata is removed from the HTML.</li>
          <li>Use "Convert from URL" to decompress and edit an existing link’s HTML.</li>
          <li>Keep HTML small to ensure the compressed URL isn’t too long for sharing.</li>
        </ul>
      </div>
    </div>
  );
};

const SOCIAL_METADATA_TEMPLATE = `
  <meta charset="UTF-8">
  <meta property="og:title" content="[Your Title]">
  <meta property="og:description" content="[Your Description]">
  <meta property="og:image" content="[Your Image URL]">
  <meta property="og:url" content="[Your URL]">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="[Your Title]">
  <meta name="twitter:description" content="[Your Description]">
  <meta name="twitter:image" content="[Your Image URL]">
`;

const JSON_LD_TEMPLATE = `
  <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "WebPage",
      "name": "[Your Title]",
      "description": "[Your Description]",
      "image": "[Your Image URL]",
      "url": "[Your URL]"
    }
  </script>
`;

const RedirectDialog: React.FC<{ isOpen: boolean; onClose: () => void; onGenerate: (data: { redirectUrl: string; title: string; description: string; image: string; url: string; includeJsonLd: boolean }) => void }> = ({ isOpen, onClose, onGenerate }) => {
  const [redirectUrl, setRedirectUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [includeJsonLd, setIncludeJsonLd] = useState(true);

  // Auto-fill Canonical URL with Redirect URL
  useEffect(() => {
    setUrl(redirectUrl);
  }, [redirectUrl]);

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
          <div style={{ marginTop: '10px', display: "flex" }}>
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
};

const App: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState<string>((window as any).DEFAULT_HTML || '');
  const [urlOutput, setUrlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [metaFields, setMetaFields] = useState({
    title: '',
    description: '',
    image_url: '',
    url: '',
  });
  const [activeFields, setActiveFields] = useState({
    description: false,
    image_url: false,
    url: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedirectOpen, setIsRedirectOpen] = useState(false);

  function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: number | undefined;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait) as any;
    };
  }

  const encodeAsYouType = debounce(async (code: string) => {
    if (encodingCache.has(code)) {
      setUrlOutput(encodingCache.get(code)!);
      updateBrowserUrl(encodingCache.get(code)!);
      setError(null);
      return;
    }

    try {
      const result = await compressToUrl(code, {
        inputType: "string",
        mimeType: "text/html",
        normalizeWhitespace: false,
      });
      encodingCache.set(code, result.payload);
      setUrlOutput(result.payload);
      updateBrowserUrl(result.payload);
      setError(null);
    } catch (err: any) {
      setError(`Error compressing: ${err.message}`);
    }
  }, 300);

  const updateBrowserUrl = (payload: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("u", payload);
    url.searchParams.set("edit", "1");
    window.history.replaceState({}, document.title, url.toString());
  };

  const parseMetaFields = (html: string) => {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i) || html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) || html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"/i);
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) || html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"/i) || html.match(/"description":\s*"([^"]*)"/i);
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) || html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i) || html.match(/"image":\s*"([^"]*)"/i);
    const urlMatch = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]*)"/i) || html.match(/"url":\s*"([^"]*)"/i);

    return {
      title: titleMatch ? titleMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
      image_url: imageMatch ? imageMatch[1] : '',
      url: urlMatch ? urlMatch[1] : '',
    };
  };

  const updateActiveFields = (html: string) => {
    setActiveFields({
      description: html.includes('og:description') || html.includes('twitter:description') || html.includes('description":'),
      image_url: html.includes('og:image') || html.includes('twitter:image') || html.includes('image":'),
      url: html.includes('og:url') || html.includes('url":'),
    });
  };

  const updateHtmlFromFields = (fields: typeof metaFields) => {
    let lines = htmlInput.split('\n');
    const headIndex = lines.findIndex(line => line.trim().startsWith('<head>'));
    const hasJsonLd = lines.some(line => line.includes('application/ld+json'));

    // Remove existing JSON-LD if present to update it cleanly
    const jsonLdIndex = lines.findIndex(line => line.includes('application/ld+json'));
    if (jsonLdIndex !== -1) {
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
      updateActiveFields(newHtml);
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

      // Add JSON-LD only if it was already present
      if (hasJsonLd) {
        const insertIndex = lines.slice(headIndex + 1).findIndex(line => !line.trim().startsWith('<meta') && !line.trim().startsWith('<title')) + headIndex + 1 || headIndex + 1;
        lines.splice(insertIndex, 0, ...`  <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "WebPage",
      "name": "${fields.title}",
      "description": "${fields.description}",
      "image": "${fields.image_url}",
      "url": "${fields.url}"
    }
  </script>`.split('\n'));
      }

      const newHtml = lines.join('\n');
      setHtmlInput(newHtml);
      updateActiveFields(newHtml);
      encodeAsYouType(newHtml);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    setHtmlInput(code);
    setMetaFields(parseMetaFields(code));
    updateActiveFields(code);
    encodeAsYouType(code);
  };

  const handleMetaChange = (field: keyof typeof metaFields, value: string) => {
    const newFields = { ...metaFields, [field]: value };
    setMetaFields(newFields);
    updateHtmlFromFields(newFields);
  };

  const convertToText = async () => {
    try {
      const { data } = await decompressFromUrl(urlOutput);
      setHtmlInput(data as string);
      setMetaFields(parseMetaFields(data as string));
      updateActiveFields(data as string);
      setError(null);
    } catch (err: any) {
      setError(`Error decompressing: ${err.message}`);
    }
  };

  const insertSocialMetadata = () => {
    const lines = htmlInput.split('\n');
    const headIndex = lines.findIndex(line => line.trim().startsWith('<head>'));
    if (headIndex === -1) {
      const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>${SOCIAL_METADATA_TEMPLATE}
</head>
<body>
${htmlInput.trim() || '<h1>Your Content Here</h1>'}
</body>
</html>`;
      setHtmlInput(newHtml);
      setMetaFields(parseMetaFields(newHtml));
      setActiveFields({
        description: true,
        image_url: true,
        url: true,
      });
      encodeAsYouType(newHtml);
    } else {
      lines.splice(headIndex + 1, 0, ...SOCIAL_METADATA_TEMPLATE.split('\n').map(line => '  ' + line.trim()));
      const newHtml = lines.join('\n');
      setHtmlInput(newHtml);
      setMetaFields(parseMetaFields(newHtml));
      setActiveFields({
        description: true,
        image_url: true,
        url: true,
      });
      encodeAsYouType(newHtml);
    }
  };

  const insertJsonLd = () => {
    const lines = htmlInput.split('\n');
    const headIndex = lines.findIndex(line => line.trim().startsWith('<head>'));
    const hasJsonLd = lines.some(line => line.includes('application/ld+json'));
    if (!hasJsonLd) {
      if (headIndex === -1) {
        const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${metaFields.title || 'My Page'}</title>
${JSON_LD_TEMPLATE}
</head>
<body>
${htmlInput.trim() || '<h1>Your Content Here</h1>'}
</body>
</html>`;
        setHtmlInput(newHtml);
        setMetaFields(parseMetaFields(newHtml));
        setActiveFields({
          description: true,
          image_url: true,
          url: true,
        });
        encodeAsYouType(newHtml);
      } else {
        lines.splice(headIndex + 1, 0, ...JSON_LD_TEMPLATE.split('\n').map(line => '  ' + line.trim()));
        const newHtml = lines.join('\n');
        setHtmlInput(newHtml);
        setMetaFields(parseMetaFields(newHtml));
        setActiveFields({
          description: true,
          image_url: true,
          url: true,
        });
        encodeAsYouType(newHtml);
      }
    }
  };

  const generateRedirectPage = ({ redirectUrl, title, description, image, url, includeJsonLd }: { redirectUrl: string; title: string; description: string; image: string; url: string; includeJsonLd: boolean }) => {
    const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  ${title ? `<title>${title}</title>` : ''}
  ${title ? `<meta property="og:title" content="${title}">` : ''}
  ${title ? `<meta name="twitter:title" content="${title}">` : ''}
  ${description ? `<meta property="og:description" content="${description}">` : ''}
  ${description ? `<meta name="twitter:description" content="${title}">` : ''}
  ${image ? `<meta property="og:image" content="${image}">` : ''}
  ${image ? `<meta name="twitter:image" content="${image}">` : ''}
  ${url ? `<meta property="og:url" content="${url}">` : ''}
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  ${includeJsonLd && title ? `
  <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "WebPage",
      "name": "${title}",
      "description": "${description}",
      "image": "${image}",
      "url": "${url}"
    }
  </script>` : ''}
</head>
<body>
  <p>Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>...</p>
</body>
</html>`;
    setHtmlInput(newHtml);
    setMetaFields(parseMetaFields(newHtml));
    updateActiveFields(newHtml);
    encodeAsYouType(newHtml);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedHtml = urlParams.get("u");
    const errorParam = urlParams.get("error");

    if (errorParam) setUrlError(decodeURIComponent(errorParam));
    if (encodedHtml) {
      setUrlOutput(encodedHtml);
      decompressFromUrl(encodedHtml)
        .then(({ data }) => {
          setHtmlInput(data as string);
          setMetaFields(parseMetaFields(data as string));
          updateActiveFields(data as string);
          setError(null);
        })
        .catch(err => setError(`Error decoding URL parameter: ${err.message}`));
    } else if ((window as any).DEFAULT_HTML) {
      const defaultHtml = (window as any).DEFAULT_HTML;
      setHtmlInput(defaultHtml);
      setMetaFields(parseMetaFields(defaultHtml));
      updateActiveFields(defaultHtml);
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
    url.searchParams.set("u", urlOutput);
    url.searchParams.delete("edit");
    return url.toString();
  };

  const closeErrorBanner = () => {
    setUrlError(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, document.title, url.toString());
  };

  return (
    <div className="layout">
      <div className="left-panel">
        <p>Test social media metadata and share HTML via compressed URLs.</p>
        <a href="#" className="instructions-link" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}>
          How to Use This Tool
        </a>
        <InstructionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
      <div className="container">
        {urlError && <ErrorBanner message={urlError} onClose={closeErrorBanner} />}
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
          <button onClick={convertToText}>Convert from URL</button>
          <button onClick={insertSocialMetadata}>Add Social Metadata</button>
          <button onClick={insertJsonLd}>Add JSON-LD</button>
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
        <label htmlFor="meta-title">Title:</label>
        <input
          id="meta-title"
          type="text"
          value={metaFields.title}
          onChange={(e) => handleMetaChange('title', e.target.value)}
          placeholder="Enter title"
        />
        {activeFields.description && (
          <>
            <label htmlFor="meta-description">Description:</label>
            <input
              id="meta-description"
              type="text"
              value={metaFields.description}
              onChange={(e) => handleMetaChange('description', e.target.value)}
              placeholder="Enter description"
            />
          </>
        )}
        {activeFields.image_url && (
          <>
            <label htmlFor="meta-image">Image URL:</label>
            <input
              id="meta-image"
              type="text"
              value={metaFields.image_url}
              onChange={(e) => handleMetaChange('image_url', e.target.value)}
              placeholder="Enter image URL"
            />
          </>
        )}
        {activeFields.url && (
          <>
            <label htmlFor="meta-url">URL:</label>
            <input
              id="meta-url"
              type="text"
              value={metaFields.url}
              onChange={(e) => handleMetaChange('url', e.target.value)}
              placeholder="Enter URL"
            />
          </>
        )}
      </div>
    </div>
  );
};

if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
  }
}
export { compressToUrl, decompressFromUrl };
