'use strict';

var jsHintStylish = require('jshint-stylish'),
    util = require('../util');

module.exports = {
    configure: function () {
        return {
            gruntfile: {
                files: {src: ['Gruntfile.js']},
                options: jsHintOptions({
                    globals: {
                        define: false,
                        module: false,
                        require: false,
                        window: false
                    }
                })
            },
            sources: {
                files: {src: ['src/**/*.js']},
                options: jsHintOptions({
                    esnext: true,
                    globals: {
                        define: false,
                        module: false,
                        require: false,
                        window: false
                    }
                })
            },
            api: {
                files: {src: ['api/**/*.js']},
                options: jsHintOptions({
                    globalstrict: false,
                    undef: false,
                    expr: true
                })
            },
            testSources: {
                files: {src: ['test/**/*.js']},
                options: jsHintOptions({
                    esnext: true,
                    expr: true,
                    globals: {
                        after: false,
                        afterEach: false,
                        before: false,
                        beforeEach: false,
                        expect: false,
                        define: false,
                        document: false,
                        mocha: false,
                        module: false,
                        require: false,
                        requirejs: false,
                        window: false,
                        describe: false,
                        it: false
                    }
                })
            }
        };
    }
};

function jsHintOptions(adjustments) {
    return util.mergeObjects({
        reporter: jsHintStylish,
        // enforcing
        camelcase: false,
        curly: false,
        freeze: true,
        globalstrict: true,
        nonew: true,
        quotmark: 'single',
        trailing: true,
        maxparams: 5,
        maxdepth: 5,
        maxstatements: 30, // TODO reduce to 20
        maxcomplexity: 10,
        // relaxing
        laxbreak: true,
        sub: true,
        validthis: true,
        // globals
        globals: {}
    }, adjustments);
}
