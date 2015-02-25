'use strict';

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
