import { __spreadArray } from "tslib";
import { Slot } from "optimism";
import { invariant, global as untypedGlobal } from "../globals/index.js";
var muteAllDeprecations = Symbol.for("apollo.deprecations");
var global = untypedGlobal;
var slot = new Slot();
function isMuted(name) {
    return global[muteAllDeprecations] || (slot.getValue() || []).includes(name);
}
export function muteDeprecations(name) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return slot.withValue.apply(slot, __spreadArray([Array.isArray(name) ? name : [name]], args, false));
}
export function warnRemovedOption(options, name, callSite, recommendation) {
    if (recommendation === void 0) { recommendation = "Please remove this option."; }
    warnDeprecated(name, function () {
        if (name in options) {
            globalThis.__DEV__ !== false && invariant.warn(104, callSite, name, recommendation);
        }
    });
}
export function warnDeprecated(name, cb) {
    if (!isMuted(name)) {
        cb();
    }
}
export function withDisabledDeprecations() {
    var _a;
    var prev = global[muteAllDeprecations];
    global[muteAllDeprecations] = true;
    return _a = {},
        _a[Symbol.dispose] = function () {
            global[muteAllDeprecations] = prev;
        },
        _a;
}
//# sourceMappingURL=index.js.map