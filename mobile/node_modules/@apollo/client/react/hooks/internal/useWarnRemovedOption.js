import * as React from "rehackt";
import { invariant } from "../../../utilities/globals/index.js";
// Remove with Apollo Client 4.0
export function useWarnRemovedOption(options, name, callSite, recommendation) {
    "use no memo";
    if (recommendation === void 0) { recommendation = "Please remove this option."; }
    var didWarn = React.useRef(false);
    if (name in options && !didWarn.current) {
        globalThis.__DEV__ !== false && invariant.warn(78, callSite, name, recommendation);
        // eslint-disable-next-line react-compiler/react-compiler
        didWarn.current = true;
    }
}
//# sourceMappingURL=useWarnRemovedOption.js.map