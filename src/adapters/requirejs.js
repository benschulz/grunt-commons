'use strict';

var amdclean = require('amdclean'),
    fs = require('fs'),
    path = require('path');

module.exports = {
    // TODO most of this is nasty => clean-up
    configure: function (moduleDescriptor) {
        var dependencies = moduleDescriptor.dependencies;

        var result = {};

        var paths = {
            text: 'node_modules/requirejs-plugins/lib/text',
            req: 'empty:'
        };
        dependencies.external.forEach(function (d) {
            paths[d] = 'empty:';
        });
        dependencies.internal.forEach(function (d) {
            paths[d] = path.join('bower_components', d, 'dist', path.basename(dependencies.metadata[d].internalMain, '.js'));
        });

        result.distribution = {
            options: {
                baseUrl: '.',
                name: moduleDescriptor.name,
                out: moduleDescriptor.debugDistributionFile,
                paths: paths,
                packages: [{
                    name: moduleDescriptor.name,
                    location: 'build/es5src',
                    main: moduleDescriptor.main
                }],
                stubModules: ['text'],
                optimize: 'none',
                normalizeDirDefines: 'all',
                onModuleBundleComplete: function (data) {
                    fs.writeFileSync(data.path, stipAmds(moduleDescriptor, {
                        filePath: data.path,
                        shimOverrides: {module: '{id:\'' + moduleDescriptor.name + '\'}'},
                        wrap: {
                            start: [
                                '/**\n',
                                ' * @license Copyright (c) 2015, Ben Schulz\n',
                                ' * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)\n',
                                ' */\n',
                                ';(function(factory) {\n',
                                '    if (typeof define === \'function\' && define[\'amd\'])\n',
                                '        define([', []
                                    .concat(moduleDescriptor.shims.require ? ['\'require\''] : [])
                                    .concat(moduleDescriptor.orderedExternalDependencies.map(function (d) { return '\'' + d + '\'';}))
                                    .join(', '),
                                '], factory);\n',
                                '    else\n',
                                '        window[\'' + moduleDescriptor.name + '\'] = factory(', []
                                    .concat(moduleDescriptor.shims.require ? [moduleDescriptor.shims.require] : [])
                                    .concat(moduleDescriptor.shimmedExternalDependencies.map(function (d) { return moduleDescriptor.shims[d] }))
                                    .join(', '),
                                ');\n',
                                '} (function(', []
                                    .concat(moduleDescriptor.shims.require ? ['req'] : [])
                                    .concat(moduleDescriptor.orderedExternalDependencies.map(normalizeModuleName))
                                    .join(', '),
                                ') {\n'].join(''),
                            end: 'return ' + normalizeModuleName(moduleDescriptor.name) + ';\n}));'
                        }
                    }));
                }
            }
        };

        if (moduleDescriptor.internalMain) {
            var internalPaths = {
                text: 'node_modules/requirejs-plugins/lib/text',
                req: 'empty:'
            };
            dependencies.all.forEach(function (dependency) {
                internalPaths[dependency] = 'empty:';
            });

            result.internalDistribution = {
                options: {
                    baseUrl: '.',
                    name: moduleDescriptor.name,
                    out: moduleDescriptor.internalDistributionFile,
                    paths: internalPaths,
                    packages: [{
                        name: moduleDescriptor.name,
                        location: 'build/es5src',
                        main: moduleDescriptor.internalMain
                    }],
                    stubModules: ['text'],
                    optimize: 'none',
                    normalizeDirDefines: 'all',
                    onModuleBundleComplete: function (data) {
                        fs.writeFileSync(data.path, stipAmds(moduleDescriptor, {
                            filePath: data.path,
                            wrap: {
                                start: [
                                    '/*\n',
                                    ' * Copyright (c) 2015, Ben Schulz\n',
                                    ' * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)\n',
                                    ' */\n',
                                    'define([', dependencies.all.map(function (d) { return '\'' + d + '\'';}).join(', '), '],',
                                    '    function(', dependencies.all.map(normalizeModuleName).join(', '), ') {\n']
                                    .join(''),
                                end: 'return ' + normalizeModuleName(moduleDescriptor.name) + ';\n});'
                            }
                        }));
                    }
                }
            };
        }

        return result;
    }
};

function stipAmds(moduleDescriptor, config) {
    return amdclean.clean(config).replace(/[^a-zA-Z_]module\s*\.\s*id[^a-zA-Z0-9_]/g, function (match) {
        return match.substring(0, 1) + '\'' + moduleDescriptor.name + '\'' + match.substring(match.length - 1);
    });
}

function normalizeModuleName(moduleName) {
    return moduleName.replace(/\./g, '').replace(/[^A-Za-z0-9_$]/g, '_').replace(/^_+/, '');
}
