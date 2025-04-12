export default function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button className="error-banner-close" onClick={onClose}>✕</button>
    </div>
  );
}
