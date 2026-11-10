// src/components/ToastContainer.jsx
/**
 * Fixed‑position toast/banner used for Auto‑Dispatch and network alerts.
 *
 * Props
 * -----
 * @param {string} message   The text to display. Empty string/null hides the toast.
 * @param {function} onClose Callback invoked when the close (✕) button is pressed.
 */
export default function ToastContainer({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      className="fixed top-4 inset-x-0 max-w-md mx-auto md:top-6 md:left-4 md:transform-none z-50
                 bg-slate-900 text-white rounded-lg shadow-xl p-3 border border-slate-700 flex items-center"
      role="alert"
      aria-live="assertive"
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
}

