'use strict';

var parentRequire = require('parent-require');

var fs = require('fs'),
    glob = require('glob'),
    grunt = parentRequire('grunt'),
    wrench = require('wrench');

grunt.registerTask('es6arrowfunction', function () {
    var es6arrowfunction = parentRequire('es6-arrow-function');

    if (fs.existsSync('build/es5src'))
        wrench.rmdirSyncRecursive('build/es5src');
    wrench.copyDirSyncRecursive('src', 'build/es5src');

    glob.sync('build/es5src/**/*.js').forEach(function (jsFile) {
        var es6SourceCode = fs.readFileSync(jsFile, 'utf8');
        var es5SourceCode = es6arrowfunction.compile(es6SourceCode);
        fs.writeFileSync(jsFile, es5SourceCode);
    });
});

module.exports = {
    configure: function (moduleDescriptor) {

        var files = {};

        files[moduleDescriptor.cssDistributionFile] = [moduleDescriptor.cssDebugDistributionFile];

        return {
            options: {
                restructuring: false,
                roundingPrecision: -1
            },
            default: {files: files}
        };
    }
};
