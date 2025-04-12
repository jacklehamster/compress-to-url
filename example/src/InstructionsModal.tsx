export default function InstructionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
}
