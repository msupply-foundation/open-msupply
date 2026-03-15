'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var globals = require('../utilities/globals');
var context = require('./context');
var hooks = require('./hooks');
var parser = require('./parser');
var tslib = require('tslib');
var internal = require('./internal');
var optimism = require('optimism');

var muteAllDeprecations = Symbol.for("apollo.deprecations");
var global = globals.global;
var slot = new optimism.Slot();
function isMuted(name) {
    return global[muteAllDeprecations] || (slot.getValue() || []).includes(name);
}
function muteDeprecations(name) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return slot.withValue.apply(slot, tslib.__spreadArray([Array.isArray(name) ? name : [name]], args, false));
}
function warnRemovedOption(options, name, callSite, recommendation) {
    if (recommendation === void 0) { recommendation = "Please remove this option."; }
    warnDeprecated(name, function () {
        if (name in options) {
            globalThis.__DEV__ !== false && globals.invariant.warn(104, callSite, name, recommendation);
        }
    });
}
function warnDeprecated(name, cb) {
    if (!isMuted(name)) {
        cb();
    }
}

var wrapperSymbol = Symbol.for("apollo.hook.wrappers");
function wrapHook(hookName, useHook, clientOrObsQuery) {
    var queryManager = clientOrObsQuery["queryManager"];
    var wrappers = queryManager && queryManager[wrapperSymbol];
    var wrapper = wrappers && wrappers[hookName];
    return wrapper ? wrapper(useHook) : useHook;
}

function createQueryPreloader(client) {
    return wrapHook("createQueryPreloader", _createQueryPreloader, client)(client);
}
var _createQueryPreloader = function (client) {
    function preloadQuery(query, options) {
        if (options === void 0) { options = Object.create(null); }
        warnRemovedOption(options, "canonizeResults", "preloadQuery");
        var queryRef = muteDeprecations("canonizeResults", function () {
            var _a, _b;
            return new internal.InternalQueryReference(client.watchQuery(tslib.__assign(tslib.__assign({}, options), { query: query })), {
                autoDisposeTimeoutMs: (_b = (_a = client.defaultOptions.react) === null || _a === void 0 ? void 0 : _a.suspense) === null || _b === void 0 ? void 0 : _b.autoDisposeTimeoutMs,
            });
        });
        return internal.wrapQueryRef(queryRef);
    }
    return Object.assign(preloadQuery, {
        toPromise: function (queryRef) {
            return queryRef.toPromise();
        },
    });
};

exports.ApolloConsumer = context.ApolloConsumer;
exports.ApolloProvider = context.ApolloProvider;
exports.getApolloContext = context.getApolloContext;
exports.resetApolloContext = context.resetApolloContext;
exports.DocumentType = parser.DocumentType;
exports.operationName = parser.operationName;
exports.parser = parser.parser;
exports.createQueryPreloader = createQueryPreloader;
for (var k in hooks) {
    if (k !== 'default' && !exports.hasOwnProperty(k)) exports[k] = hooks[k];
}
//# sourceMappingURL=react.cjs.map
