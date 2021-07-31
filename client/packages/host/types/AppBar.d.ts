/// <reference types="react" />
interface Drawer {
    open: boolean;
    openDrawer: () => void;
}
interface AppBarProps {
    drawer: Drawer;
}
declare const AppBar: (props: AppBarProps) => JSX.Element;
export default AppBar;
//# sourceMappingURL=AppBar.d.ts.map