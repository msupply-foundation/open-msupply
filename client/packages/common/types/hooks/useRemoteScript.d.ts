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
export declare const useRemoteScript: (url: string) => {
    ready: boolean;
    failed: boolean;
};
//# sourceMappingURL=useRemoteScript.d.ts.map