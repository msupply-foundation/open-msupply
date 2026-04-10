import { EnvUtils, Platform } from '@openmsupply-client/common';

const closeFrame = (frame: HTMLIFrameElement) => () => {
  if (document.body.contains(frame)) {
    document.body.removeChild(frame);
  }
};

const printFrame = (frame: HTMLIFrameElement) => {
  const { contentWindow } = frame;
  if (!contentWindow) return;

  contentWindow.onbeforeunload = closeFrame(frame);
  contentWindow.onafterprint = closeFrame(frame);
  contentWindow.focus();
  contentWindow.print();
};

export const buildPrintableHtml = (
  bodyHtml: string,
  options?: { title?: string; orientation?: 'portrait' | 'landscape' }
): string => {
  const title = options?.title ?? document.title;
  const orientation = options?.orientation ?? 'portrait';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @page {
        size: A4 ${orientation};
      }
      html, body {
        margin: 0;
        padding: 0;
        width: auto !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      #oms-print-controls {
        position: sticky;
        top: 0;
        z-index: 9999;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
        background: #ffffff;
      }
      #oms-print-controls button {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #ffffff;
        color: #111827;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      #oms-print-controls button:hover {
        background: #f9fafb;
      }
      #oms-print-content {
        padding: 12px;
        width: auto !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      @media print {
        #oms-print-controls {
          display: none;
        }
        #oms-print-content {
          padding: 0;
          width: auto !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
        html,
        body,
        #oms-print-content {
          width: auto !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }
    </style>
  </head>
  <body>
    <div id="oms-print-controls">
      <button type="button" onclick="window.print()">Print</button>
      <button type="button" onclick="window.close(); if (!window.closed && window.history.length > 1) { window.history.back(); }">Close</button>
    </div>
    <div id="oms-print-content">
      ${bodyHtml}
    </div>
  </body>
</html>`;
};

export const printHtml = async (html: string) => {
  if (EnvUtils.platform === Platform.Android) {
    const printer = (window as any)?.Capacitor?.Plugins?.Printer;
    if (printer?.print) {
      await printer.print({ content: html });
      return;
    }
  }

  const popup = window.open('', '_blank');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    // Trigger print automatically, while still keeping the preview window visible with a Close button.
    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 30);
    return;
  }

  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.onload = () => {
    if (frame.contentDocument) {
      frame.contentDocument.documentElement.innerHTML = html;
    }

    setTimeout(() => printFrame(frame), 30);
  };

  document.body.appendChild(frame);
};

export const downloadPdfFromHtml = async (html: string) => {
  if (EnvUtils.platform === Platform.Android) {
    await printHtml(html);
    return;
  }

  const popup = window.open('', '_blank');
  if (!popup) {
    await printHtml(html);
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.onafterprint = () => {
    popup.close();
  };

  setTimeout(() => {
    popup.focus();
    popup.print();
  }, 30);
};
