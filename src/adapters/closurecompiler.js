'use strict';

var fs = require('fs'),
    logger = require('../logger'),
    path = require('path'),
    util = require('../util');

module.exports = {
    configure: function (moduleDescriptor) {
        var availableExterns = fs.readdirSync(path.join(__dirname, '../externs')).map(function(f) { return path.basename(f, '.js'); });
        logger.writeln('Available externs: ' + availableExterns.join(', ') + '.');

        var externs = util.dedupe(Object.keys(moduleDescriptor.dependencies.metadata)
            .map(function (k) {
                var metadata = moduleDescriptor.dependencies.metadata[k];
                return availableExterns
                    .filter(function (e) { return metadata.dependencies && !!metadata.dependencies[e]; })
                    .map(function (e) { return path.join(__dirname, '../externs', e + '.js'); });
            })
            .reduce(function (a, b) { return a.concat(b); }, []));

        var files = {};
        files[moduleDescriptor.distributionFile] = [moduleDescriptor.debugDistributionFile];

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
