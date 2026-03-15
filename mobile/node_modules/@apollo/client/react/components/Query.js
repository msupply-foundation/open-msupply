import { __rest } from "tslib";
import * as PropTypes from "prop-types";
import { useQuery } from "../hooks/index.js";
import { invariant } from "../../utilities/globals/index.js";
import { useWarnRemoved } from "../hooks/internal/index.js";
/**
 * @deprecated
 * Official support for React Apollo render prop components ended in March 2020.
 * This library is still included in the `@apollo/client` package,
 * but it no longer receives feature updates or bug fixes.
 */
export function Query(props) {
    useWarnRemoved("<Query />", function () {
        globalThis.__DEV__ !== false && invariant.warn(66);
    });
    var children = props.children, query = props.query, options = __rest(props, ["children", "query"]);
    var result = useQuery(query, options);
    return result ? children(result) : null;
}
Query.propTypes = {
    client: PropTypes.object,
    children: PropTypes.func.isRequired,
    fetchPolicy: PropTypes.string,
    notifyOnNetworkStatusChange: PropTypes.bool,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
    pollInterval: PropTypes.number,
    query: PropTypes.object.isRequired,
    variables: PropTypes.object,
    ssr: PropTypes.bool,
    partialRefetch: PropTypes.bool,
    returnPartialData: PropTypes.bool,
};
//# sourceMappingURL=Query.js.map