'use strict';

var fs = require('fs'),
    glob = require('glob'),
    logger = require('../logger'),
    path = require('path'),
    util = require('../util');

module.exports = {
    configure: function (moduleDescriptor) {
        var availableExterns = fs.readdirSync(path.join(__dirname, '../externs')).map(function (f) { return path.basename(f, '.externs.js'); });
        logger.writeln('Available library externs: ' + availableExterns.join(', ') + '.');

        var externs = util.dedupe(
            [
                path.join(__dirname, '../externs/benshu.externs.js'),
                path.join(__dirname, '../externs/requirejs.externs.js')
            ].concat(
                availableExterns
                    .filter(function (e) { return moduleDescriptor.dependencies.external.indexOf(e) >= 0; })
                    .map(function (e) { return path.join(__dirname, '../externs', e + '.externs.js'); })
            ).concat(
                moduleDescriptor.dependencies.external.map(function (d) {
                    return glob.sync(path.join('bower_components', d, 'dist/**/*.externs.js'));
                }).reduce(function (a, b) { return a.concat(b); }, [])
            )
        );
        logger.writeln('Using the following externs:');
        externs.forEach(function (e) { logger.writeln('  - ' + e); });

        return {
            minify: {
                files: util.singletonObject(moduleDescriptor.distributionFile, [moduleDescriptor.debugDistributionFile, 'build/apis.js']),
                options: {
                    'compilation_level': 'ADVANCED_OPTIMIZATIONS',
                    'language_in': 'ECMASCRIPT5',
                    'use_types_for_optimization': true,
                    'externs': externs,
                    'warning_level': 'VERBOSE'
                    //, 'jscomp_warning': 'reportUnknownTypes'
                }
            }
        };
    }
};
