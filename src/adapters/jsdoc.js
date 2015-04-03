'use strict';

var parentRequire = require('parent-require');

var fs = require('fs'),
    grunt = parentRequire('grunt'),
    path = require('path');

module.exports = {
    configure: function (moduleDescriptor) {
        var configureFile = 'build/jsdoc.conf.json';

        var markdownPlugin = path.relative('build', 'node_modules/grunt-jsdoc/node_modules/jsdoc/plugins/markdown.js');
        var summarizePlugin = path.relative('build', 'node_modules/grunt-jsdoc/node_modules/jsdoc/plugins/summarize.js');

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
