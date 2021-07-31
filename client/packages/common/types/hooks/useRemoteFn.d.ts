declare global {
    function __webpack_init_sharing__(prop: string): Promise<void>;
    const __webpack_share_scopes__: {
        default: string;
    };
    function init(x: string): Promise<void>;
    interface Window {
        init(prop: string): void;
        get(prop: string): () => {
            default: string;
        };
    }
    function alert(message: string): void;
    const window: any;
}
export declare const loadAndInjectDeps: (scope: any, module: string) => () => Promise<any>;
export declare const useRemoteFn: (url: string, scope: any, module: any) => {
    ready: false;
    failed: boolean;
    fn?: undefined;
} | {
    ready: true;
    failed: true;
    fn?: undefined;
} | {
    ready: true;
    failed: false;
    fn: () => void;
};
//# sourceMappingURL=useRemoteFn.d.ts.map