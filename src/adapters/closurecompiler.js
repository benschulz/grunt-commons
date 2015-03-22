'use strict';

var fs = require('fs'),
    logger = require('../logger'),
    path = require('path'),
    util = require('../util');

module.exports = {
    configure: function (moduleDescriptor) {
        var availableExterns = fs.readdirSync(path.join(__dirname, '../externs')).map(function (f) { return path.basename(f, '.externs.js'); });
        logger.writeln('Available externs: ' + availableExterns.join(', ') + '.');

        var externs = util.dedupe(
            [
                path.join(__dirname, '../externs/requirejs.externs.js')
            ].concat(
                availableExterns
                    .filter(function (e) { return moduleDescriptor.dependencies.external.indexOf(e) >= 0; })
                    .map(function (e) { return path.join(__dirname, '../externs', e + '.externs.js'); })
            )
        );

        var files = {};
        files[moduleDescriptor.distributionFile] = [moduleDescriptor.debugDistributionFile, 'api/**/*.js'];

        return {
            minify: {
                files: files,
                options: {
                    'compilation_level': 'ADVANCED_OPTIMIZATIONS',
                    'language_in': 'ECMASCRIPT5',
                    'use_types_for_optimization': true,
                    'externs': externs
                }
            }
        };
    }
};
