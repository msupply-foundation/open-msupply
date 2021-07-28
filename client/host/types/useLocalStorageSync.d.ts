declare global {
    const localStorage: {
        getItem: (key: string) => string;
        setItem: (key: string, object: any) => void;
    };
}
export declare const useLocalStorageSync: (key: string) => {
    value: any;
    setItem: (value: any) => void;
};
//# sourceMappingURL=useLocalStorageSync.d.ts.map