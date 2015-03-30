'use strict';

module.exports = {
    configure: function (moduleDescriptor, config) {
        var files = {};

        if (config === undefined || config === true)
            files[moduleDescriptor.cssDebugDistributionFile] = 'src/**/*.less';
        else if (typeof config === 'string' || Array.isArray(config))
            files[moduleDescriptor.cssDebugDistributionFile] = config;

        return {
            default: {
                files: files,
                options: {
                    strictMath: true,
                    strictUnits: true
                }
            }
        }
    }
};
