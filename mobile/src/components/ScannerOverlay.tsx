interface ScannerOverlayProps {
  onCancel: () => void;
}

export default function ScannerOverlay({ onCancel }: ScannerOverlayProps) {
  return (
    <div className="scanner-overlay">
      {/* Top dark region */}
      <div className="scanner-overlay-top">
        <p className="text-white text-sm font-medium text-center">
          Point camera at a barcode
        </p>
      </div>

      {/* Viewfinder row: dark | transparent center | dark */}
      <div className="scanner-viewfinder-row">
        <div className="scanner-side-mask" />
        <div className="scanner-viewfinder">
          <div className="scanner-corner scanner-corner-tl" />
          <div className="scanner-corner scanner-corner-tr" />
          <div className="scanner-corner scanner-corner-bl" />
          <div className="scanner-corner scanner-corner-br" />
        </div>
        <div className="scanner-side-mask" />
      </div>

      {/* Bottom dark region with cancel button */}
      <div className="scanner-overlay-bottom">
        <button
          className="scanner-cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
