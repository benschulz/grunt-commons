'use strict';

var Promise = require('pacta');

module.exports = {
    identity: function (x) { return x; },
    tick: function (s) { return '`' + s + '`'; },
    dedupe: function (array) {
        return array.filter(function (e, i, a) {
            return a.lastIndexOf(e) === i;
        });
    },
    singletonObject: function (key, value) {
        var singleton = {};
        singleton[key] = value;
        return singleton;
    },
    mergeObjects: function (a, b) {
        var result = {};
        Object.keys(a).forEach(function (k) { result[k] = a[k]; });
        Object.keys(b).forEach(function (k) { result[k] = b[k]; });
        return result;
    },
    rejected: function (reason) {
        var p = new Promise();
        p.reject(reason);
        return p;
    },
    mapProperties: function (object, mapper) {
        var result = {};
        Object.keys(object).forEach(function (k) {
            result[k] = mapper(object[k], k, object);
        });
        return result;
    }
};