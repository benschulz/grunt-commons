/** @namespace */
var de = {};
/** @namespace */
de.benshu = {};

// TODO these shared namespaces need a better home
/** @namespace */
de.benshu.onefold = {};
/** @namespace */
de.benshu.ko = {};

// TODO this also must go somewhere else
var stringifyable = {};
/** @type {*} */
// The closure compiler is smart enough to figure out
// that different functions should never share the same
// type. We're trying to make them do just that though.
// Workaround is to always have a stringifyable extern.
stringifyable.stringifyable;
