'use strict';

var parentRequire = require('parent-require');

var fs = require('fs'),
    glob = require('glob'),
    grunt = parentRequire('grunt'),
    path = require('path');

module.exports = {
    configure: function (moduleDescriptor) {
        var configureFile = 'build/jsdoc.conf.json';

        var markdownPlugin = path.relative('build', glob.sync('node_modules/**/jsdoc/plugins/markdown.js')[0]);
        var summarizePlugin = path.relative('build', glob.sync('node_modules/**/jsdoc/plugins/summarize.js')[0]);

        fs.writeFileSync(configureFile, [
            '{',
            '  "plugins": [' + [markdownPlugin, summarizePlugin].map(JSON.stringify).join(', ') + '],',
            '  "templates": {',
            '    "applicationName": "' + moduleDescriptor.name + '",',
            '    "linenums": false,',
            '    "collapseSymbols": true,',
            '    "default": { "outputSourceFiles" : false }',
            '  }',
            '}'
        ].join('\n'));

        var documentationDirectory = grunt.option('documentation-directory') || 'build/api';

        return {
            default: {
                src: ['build/es5src/**/*.js', 'api/**/*.js'],
                options: {
                    destination: documentationDirectory,
                    template: 'node_modules/jaguarjs-jsdoc',
                    configure: configureFile
                }
            }
        };
    }
};
