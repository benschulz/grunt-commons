'use strict';

var parentRequire = require('parent-require');

var fs = require('fs'),
    grunt = parentRequire('grunt'),
    indentString = require('indent-string'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    util = require('../util');

module.exports = {
    configure: function (moduleDescriptor, config) {
        return {
            sources: {options: karmaOptions('sources', '../src', moduleDescriptor.main, false, moduleDescriptor, config)},
            distribution: {options: karmaOptions('distribution', '../dist', moduleDescriptor.basename, false, moduleDescriptor, config)},
            debugDistribution: {options: karmaOptions('debug-distribution', '../dist', moduleDescriptor.debugBasename, false, moduleDescriptor, config)},
            development: {options: karmaOptions('sources', '../src', moduleDescriptor.main, true, moduleDescriptor, config)}
        };
    }
};

function karmaOptions(version, location, karmaMain, interactive, moduleDescriptor, config) {
    var dependencies = moduleDescriptor.dependencies;
    config = config || {};

    var requirejs = config.requirejs || {};
    var paths = []
        .concat([{
            // rjs plugins
            text: '../node_modules/requirejs-plugins/lib/text',
            json: '../node_modules/requirejs-plugins/src/json',
            // dom event simulation
            simulant: '../node_modules/simulant/dist/simulant'
        }])
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
        '  map: { \'*\': { \'req\': \'require\' } },',
        '  packages: [{',
        '    name: \'' + moduleDescriptor.name + '\',',
        '    location: \'' + location + '\',',
        '    main: \'' + karmaMain + '\'',
        '  }],',
        '  paths: ' + indentString(JSON.stringify(paths, null, '  '), '  '),
        '});',
        ''
    ].join('\n'));

    var reportsDirectory = grunt.option('reports-directory') || 'build/reports';
    var additionalFiles = config.additionalFiles || [];

    var travis = !!process.env.TRAVIS;

    return {
        frameworks: ['mocha', 'requirejs', 'chai', 'chai-as-promised'],
        files: additionalFiles.concat([
            {pattern: 'node_modules/requirejs-plugins/**/*.js', included: false},
            {pattern: 'node_modules/simulant/dist/simulant.js', included: false},
            'build/karma-requirejs-config/config-' + version + '.js',
            'test/main.test.js',
            {pattern: 'src/**/*', included: false},
            {pattern: 'test/**/*.js', included: false},
            {pattern: 'dist/*.js', included: false},
            'dist/*.debug.css'
        ]).concat(dependencies.external.map(function (d) {
            return {pattern: 'bower_components/' + d + '/' + dependencies.metadata[d].main, included: false}
        })).concat(dependencies.internal.map(function (d) {
            return {pattern: 'bower_components/' + d + '/' + dependencies.metadata[d].internalMain, included: false}
        })),
        preprocessors: {
            'src/**/*.js': interactive ? [] : ['coverage'],
            'test/**/*.js': version === 'sources' ? [] : ['babel'],
            'dist/**/*.js': interactive ? [] : ['coverage']
        },
        reporters: interactive ? ['dots'] : ['html', 'coverage', 'progress'],
        // TODO add phantomjs when it's at v2, add slimerjs at convenience..
        browsers: interactive || version === 'sources' || travis ? ['Firefox'] : ['Chrome', 'Firefox'],
        singleRun: !interactive,
        babelPreprocessor: {
            options: {sourceMap: 'inline'}
        },
        htmlReporter: {
            outputDir: path.join(reportsDirectory, 'test-results', version),
            templatePath: 'node_modules/karma-html-reporter/jasmine_template.html'
        },
        coverageReporter: {
            dir: path.join(reportsDirectory, 'coverage', version),
            reporters: travis
                ? [{type: 'html'}, {type: 'lcov'}]
                : [{type: 'html'}]
        }
    };
}
