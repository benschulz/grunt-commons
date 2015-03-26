/**
 * @namespace
 */
var ko = {};

ko.applyBindings = function (viewModelOrBindingContext, rootNode) {};
ko.bindingHandlers = {};
ko.cleanNode = function (node) {};

/**
 * @template T
 * @param {function():T|{read:function():T}} evaluatorFunctionOrOptions
 * @param {*=} evaluatorFunctionTarget
 * @param {Object=} options
 * @returns Subscribable<T>
 */
ko.computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {};

/**
 * @param node
 * @returns {?}
 */
ko.contextFor = function (node) {};
/**
 * @param {function()} callback
 * @param {Object=} callbackTarget
 * @param {Array<*>=} callbackArgs
 */
ko.ignoreDependencies = function (callback, callbackTarget, callbackArgs) {};
ko.isObservable = function (value) {};
/** @constructor */
ko.nativeTemplateEngine = function () {};
/**
 * @param {*=} initialValue
 */
ko.observable = function (initialValue) {};
/**
 * @param {Array<?>=} initialValue
 */
ko.observableArray = function (initialValue) {};
/**
 * @template T
 * @param {function():T|{read:function():T}} evaluatorFunctionOrOptions
 * @param {*=} evaluatorFunctionTarget
 * @returns Subscribable<T>
 */
ko.pureComputed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget) {};
ko.removeNode = function (node) {};
/**
 * @param {string} template
 * @param {Object} dataOrBindingContext
 * @param {Object=} options
 * @param {(Node|Array<Node>)=} targetNodeOrNodeArray
 * @param {string=} renderMode
 */
ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {};
ko.unwrap = function (value) {};

ko.utils = {};
ko.utils.domNodeDisposal = {};
ko.utils.domNodeDisposal.addDisposeCallback = function (node, callback) {};

/**
 * @interface
 */
function BindingContext() {}

/** @typedef {BindingContext} */
ko.BindingContext;

BindingContext.prototype.createChildContext = function (dataItemOrAccessor, dataItemAlias, extendCallback) {};
BindingContext.prototype.extend = function (properties) {};

/**
 * @interface
 * @template T
 */
function Subscribable() {}

/** @typedef {Subscribable} */
ko.Subscribable;

Subscribable.prototype.dispose = function () {};
Subscribable.prototype.peek = function () {};

/**
 * @param {function(T)} callback
 * @param {?=} callbackTarget
 * @param {String=} event
 */
Subscribable.prototype.subscribe = function (callback, callbackTarget, event) {};

/**
 * @interface
 * @template T
 * @extends {Subscribable<T>}
 */
function Observable() {}

/** @typedef {Observable} */
ko.Observable;

Observable.prototype.valueHasMutated = function () {};
Observable.prototype.valueWillMutate = function () {};

/**
 * @interface
 * @template T
 * @extends {Subscribable<Array<T>>}
 */
function ObservableArray() {}

/** @typedef {ObservableArray} */
ko.ObservableArray;

ObservableArray.prototype.removeAll = function (arrayOfValues) {};
