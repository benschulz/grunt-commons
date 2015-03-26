'use strict';

var parentRequire = require('parent-require');

var fs = require('fs'),
    grunt = parentRequire('grunt');

module.exports = {
    configure: function (moduleDescriptor) {
        var configureFile = 'build/jsdoc.conf.json';

        fs.writeFileSync(configureFile, [
            '{',
            '  "templates": {',
            '    "applicationName": "' + moduleDescriptor.name + '",',
            '    "linenums": false,',
            '    "collapseSymbols": true,',
            '    "default": { "outputSourceFiles" : false }',
            '  }',
            '}'
        ].join('\n'));

        var documentationDirectory = grunt.option('documentation-directory') || 'build/documentation';

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
