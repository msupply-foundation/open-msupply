/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';

export interface HtmlElement {
  appendChild(element: HtmlElement): void;
  removeChild(element: HtmlElement): void;
  async?: boolean;
  src?: string;
  type?: string;
  onload: () => void;
  onerror: () => void;
}
declare global {
  const document: {
    createElement: (element: string) => HtmlElement;
    getElementById: (element: string) => HtmlElement;
    head: HtmlElement;
  };
}
export const useRemoteScript = (url: string) => {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      return;
    }

    const element = document.createElement('script');

    element.src = url;
    element.type = 'text/javascript';
    element.async = true;

    setReady(false);
    setFailed(false);

    element.onload = () => {
      console.log(`Dynamic Script Loaded: ${url}`);
      setReady(true);
    };

    element.onerror = () => {
      console.error(`Dynamic Script Error: ${url}`);
      setReady(false);
      setFailed(true);
    };

    document.head.appendChild(element);

    return () => {
      console.log(`Dynamic Script Removed: ${url}`);
      document.head.removeChild(element);
    };
  }, [url]);

  return {
    ready,
    failed,
  };
};
