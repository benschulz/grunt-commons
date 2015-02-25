'use strict';

var fs = require('fs'),
    indentString = require('indent-string'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    util = require('../util');

module.exports = {
    configure: function (moduleDescriptor, config) {
        return {
            sources: {options: karmaOptions('sources', '../build/es5src', moduleDescriptor.main, false, moduleDescriptor, config)},
            distribution: {options: karmaOptions('distribution', '../dist', moduleDescriptor.basename, false, moduleDescriptor, config)},
            debugDistribution: {options: karmaOptions('debug-distribution', '../dist', moduleDescriptor.debugBasename, false, moduleDescriptor, config)},
            development: {options: karmaOptions('sources', '../build/es5src', moduleDescriptor.main, true, moduleDescriptor, config)}
        };
    }
};

function karmaOptions(version, location, karmaMain, interactive, moduleDescriptor, config) {
    var dependencies = moduleDescriptor.dependencies;
    config = config || {};

    var requirejs = config.requirejs || {};
    var paths = []
        .concat([]
            .concat(dependencies.external.map(function (d) {
                return util.singletonObject(d, '../bower_components/' + d + '/' + dependencies.metadata[d].main);
            }))
            .concat(dependencies.internal.map(function (d) {
                return util.singletonObject(d, '../bower_components/' + d + '/' + dependencies.metadata[d].internalMain);
            })).map(function (ps) {
                return util.mapProperties(ps, function (p) { return path.join(path.dirname(p), path.basename(p, '.js')); });
            }))
        .concat([requirejs.additionalPaths || {}])
        .reduce(util.mergeObjects);

    mkdirp.sync('build/karma-requirejs-config');
    fs.writeFileSync('build/karma-requirejs-config/config-' + version + '.js', [
        '\'use strict\';',
        '',
        'requirejs.config({',
        '  baseUrl: \'/base/test\',',
        '  shim: {',
        '    mocha: {',
        '      exports: \'mocha\'',
        '    }',
        '  },',
        '  packages: [{',
        '    name: \'chai\',',
        '    location: \'../node_modules/chai\',',
        '    main: \'chai\'',
        '  }, {',
        '    name: \'' + moduleDescriptor.name + '\',',
        '    location: \'' + location + '\',',
        '    main: \'' + karmaMain + '\'',
        '  }],',
        '  paths: ' + indentString(JSON.stringify(paths, null, '  '), '  '),
        '});',
        ''
    ].join('\n'));

    var additionalFiles = config.additionalFiles || [];

    return {
        frameworks: ['mocha', 'requirejs', 'chai'],
        files: additionalFiles.concat([
            'build/karma-requirejs-config/config-' + version + '.js',
            'test/main.js',
            {pattern: 'build/es5src/**/*.js', included: false},
            {pattern: 'test/**/*.js', included: false},
            {pattern: 'dist/*.js', included: false}
        ]).concat(dependencies.external.map(function (d) {
            return {pattern: 'bower_components/' + d + '/' + dependencies.metadata[d].main, included: false}
        })).concat(dependencies.internal.map(function (d) {
            return {pattern: 'bower_components/' + d + '/' + dependencies.metadata[d].internalMain, included: false}
        })),
        preprocessors: {
            'build/es5src/**/*.js': interactive ? [] : ['coverage'],
            'dist/*.js': interactive ? [] : ['coverage']
        },
        reporters: interactive ? ['dots'] : ['html', 'coverage', 'progress'],
        // TODO add phantomjs when it's at v2, add slimerjs at convenience..
        browsers: interactive || version === 'sources' ? ['Firefox'] : ['Chrome', 'Firefox'],
        singleRun: !interactive,
        htmlReporter: {
            outputDir: 'dist/reports/test-results/' + version,
            templatePath: 'node_modules/karma-html-reporter/jasmine_template.html'
        },
        coverageReporter: {
            dir: 'dist/reports/coverage/' + version,
            type: 'html'
        }
    };
}
