import * as React from "rehackt";
import { warnDeprecated } from "../../../utilities/deprecation/index.js";
export function useWarnRemoved(name, cb) {
    "use no memo";
    var didWarn = React.useRef(false);
    if (globalThis.__DEV__ !== false) {
        if (!didWarn.current) {
            warnDeprecated(name, cb);
        }
        // eslint-disable-next-line react-compiler/react-compiler
        didWarn.current = true;
    }
}
//# sourceMappingURL=useWarnRemoved.js.map