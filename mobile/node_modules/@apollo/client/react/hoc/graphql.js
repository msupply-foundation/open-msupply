import { parser, DocumentType } from "../parser/index.js";
import { withQuery } from "./query-hoc.js";
import { withMutation } from "./mutation-hoc.js";
import { withSubscription } from "./subscription-hoc.js";
import { invariant } from "../../utilities/globals/index.js";
import { muteDeprecations, warnDeprecated, } from "../../utilities/deprecation/index.js";
/**
 * @deprecated
 * Official support for React Apollo higher order components ended in March 2020.
 * This library is still included in the `@apollo/client` package, but it no longer receives feature updates or bug fixes.
 */
export function graphql(document, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    if (globalThis.__DEV__ !== false) {
        warnDeprecated("graphql", function () {
            globalThis.__DEV__ !== false && invariant.warn(72);
        });
    }
    switch (muteDeprecations("parser", function () { return parser(document).type; })) {
        case DocumentType.Mutation:
            return muteDeprecations("withMutation", function () {
                return withMutation(document, operationOptions);
            });
        case DocumentType.Subscription:
            return muteDeprecations("withSubscription", function () {
                return withSubscription(document, operationOptions);
            });
        case DocumentType.Query:
        default:
            return muteDeprecations("withQuery", function () {
                return withQuery(document, operationOptions);
            });
    }
}
//# sourceMappingURL=graphql.js.map