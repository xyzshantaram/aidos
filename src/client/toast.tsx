/**
 * Ticket U2c: the toast stack container.
 *
 * Subscribes to the module-level toast store and renders one toast per
 * entry, newest at the bottom. Each toast carries its kind class and a
 * dismiss button. The container is fixed at the bottom center with a high
 * z-index, so it stays above the layout.
 */

import react from "react";

import {
  dismissToast,
  subscribeToasts,
  type Toast,
} from "./toast-store";

/** One toast row with its kind class. */
function ToastRow(props: { toast: Toast }) {
  const toast = props.toast;
  return (
    <div className={"aidos-toast aidos-toast-" + toast.kind}>
      <span className="aidos-toast-text">{toast.text}</span>
      <button
        className="aidos-toast-dismiss"
        onClick={() => {
          dismissToast(toast.id);
        }}
        aria-label="Dismiss notification"
      >
        {"\u00d7"}
      </button>
    </div>
  );
}

/** The fixed toast stack. Mount once at the board root. */
export function ToastContainer(): JSX.Element {
  const [toasts, setToasts] = react.useState<Toast[]>([]);

  react.useEffect(
    function () {
      return subscribeToasts(setToasts);
    },
    [],
  );

  return (
    <div className="aidos-toast-stack">
      {toasts.map(function (toast) {
        return <ToastRow key={toast.id} toast={toast} />;
      })}
    </div>
  );
}
