var ko = {};

ko.applyBindings = function (viewModelOrBindingContext, rootNode) {};
ko.bindingHandlers = {};
ko.cleanNode = function (node) {};
ko.computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {};
ko.contextFor = function (node) {};
ko.isObservable = function (value) {};
ko.nativeTemplateEngine = function () {};
ko.observable = function (initialValue) {};
ko.observableArray = function (initialValue) {};
ko.pureComputed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget) {};
ko.removeNode = function (node) {};
ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {};
ko.unwrap = function (value) {};

ko.utils = {};
ko.utils.domNodeDisposal = {};
ko.utils.domNodeDisposal.addDisposeCallback = function (node, callback) {};

function BindingContext() {}
BindingContext.prototype.createChildContext = function (dataItemOrAccessor, dataItemAlias, extendCallback) {};
BindingContext.prototype.extend = function (properties) {};

function Observable() {}
Observable.prototype.valueHasMutated = function () {};
Observable.prototype.valueWillMutate = function () {};

function ObservableArray() {}
ObservableArray.prototype.removeAll = function (arrayOfValues) {};

function Subscribable() {}
Subscribable.prototype.dispose = function () {};
Subscribable.prototype.peek = function () {};
Observable.prototype.subscribe = function (callback, callbackTarget, event) {};
