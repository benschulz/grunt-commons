'use strict';

var chalk = require('chalk'),
    dependencyDeterminator = require('./dependency-determinator'),
    fs = require('fs'),
    glob = require('glob'),
    logger = require('./logger'),
    mkdirp = require('mkdirp'),
    ModuleDescriptor = require('./module-descriptor'),
    path = require('path'),
    Promise = require('pacta'),
    taskLoader = require('./task-loader'),
    util = require('./util');

module.exports = function (grunt, mdl) {
    var adapters = fs.readdirSync(path.join(__dirname, 'adapters')).map(function (f) { return path.basename(f, '.js'); });
    logger.writeln('Adapters: ' + adapters.join(', ') + '.');

    var triggers = {
        cssmin: function (config) { return !!(config.less || config.cssmin); },
        karma: function (config) {
            var karmaEnabled = Object.prototype.hasOwnProperty.call(config, 'karma')
                ? config.karma !== false
                : fs.existsSync('test/main.test.js');

            if (!karmaEnabled)
                logger.warn(chalk.yellow('Warning: No tests found or karma was disabled.'));

            return karmaEnabled;
        },
        less: function (config) {return !!config.less; }
    };

    function initGrunt(config, dependencies) {
        config = config || {};

        var moduleDescriptor = new ModuleDescriptor(mdl, dependencies);

        registerInternalTasks(moduleDescriptor);

        logger.subhead('Initializing grunt..');
        var gruntConfig = util.mapProperties(config, util.identity);

        adapters.forEach(function (a) {
            if (!triggers[a] || triggers[a](config)) {
                logger.writeln('Configuring `' + a + '`.');
                gruntConfig[a] = require('./adapters/' + a).configure(moduleDescriptor, config[a]);
            }
        });

        grunt.config.merge(gruntConfig);
        logger.writeln('Configured tasks: ' + Object.keys(gruntConfig).join(', '));

        return Promise.of(true);
    }

    var registeredTasks = [];

    return {
        initialize: function (config) {
            registerTaskList('build', 'less', 'cssmin', 'es6arrowfunction', 'jshint', 'karma:sources', 'requirejs', 'karma:debugDistribution', 'concat-externs', 'prepare-apis', 'closurecompiler', 'drop-apis', 'karma:distribution', 'jsdoc', 'drop-sources-and-footer');
            registerTaskList('build-skip-tests', 'less', 'cssmin', 'es6arrowfunction', 'jshint', 'requirejs', 'concat-externs', 'prepare-apis', 'closurecompiler', 'drop-apis', 'jsdoc', 'drop-sources-and-footer');
            registerTaskList('generate-documentation', 'es6arrowfunction', 'jsdoc');
            registerTaskList('test-interactively', 'karma:development');
            registerTaskList('test-sources', 'karma:sources');
            registerTaskList('test-debug-distribution', 'karma:debugDistribution');
            registerTaskList('test-distribution', 'karma:distribution');

            grunt.initConfig(Object.keys(config)
                .filter(function (k) { return adapters.indexOf(k) < 0; })
                .map(function (k) { return util.singletonObject(k, config[k]); })
                .reduce(util.mergeObjects, {}));

            function registerTaskList(name) {
                var targets = Array.prototype.slice.call(arguments, 1);

                grunt.registerTask(name, function () {
                    var done = this.async();

                    mkdirp.sync('build');
                    dependencyDeterminator.determineAllDependencies()
                        .map(function (dependencies) {
                            if (grunt.option('dev') || grunt.option('development')) {
                                var packages = dependencies.all.map(function (d) {
                                    var dpJson = path.join('bower_components', d, 'build/packages.json');
                                    var dp = fs.existsSync(dpJson) ? JSON.parse(fs.readFileSync(dpJson)) : {};

                                    return util.mapProperties(dp, function (p) {
                                        return path.join('bower_components', d, p);
                                    });
                                }).concat([
                                    util.singletonObject(mdl.name, path.join('src', mdl.internalMain || mdl.main))
                                ]).reduce(util.mergeObjects, {});

                                fs.writeFileSync('build/packages.json', JSON.stringify(packages, null, '  '));
                            }

                            return dependencies;
                        })
                        .chain(function (dependencies) { return initGrunt(config, dependencies); })
                        .chain(function () { return executeConfigured.apply(undefined, targets); })
                        .map(function () {
                            logger.ok(chalk.green.bold('Done.'));
                            done();
                        }).mapError(function (reason) {
                            grunt.log.error(chalk.red.bold.underline('An error occurred.'));
                            if (reason.stack)
                                grunt.log.error(reason.stack);
                            grunt.warn(reason);
                        });
                });
            }
        }
    };

    function registerInternalTasks(moduleDescriptor) {
        registerTask('concat-externs', function () {
            var allExterns = glob.sync('api/**/*.externs.js').map(function (externsFile) {
                return fs.readFileSync(externsFile, 'utf8').trim();
            });

            function extractNamespaces(externs) {
                var namespaces = [];

                var regexp = /\/\*\*([^*]|\*[^/])*@namespace\s([^*]|\*[^/])*\*\/\s*(var\s+)?(([a-zA-Z]+\s*\.\s*)*[a-zA-Z]+)\s*=/g;
                var match;
                while ((match = regexp.exec(externs))) {
                    var namespace = match[4].replace(/\s/g, '');
                    namespaces.push(namespace)
                }

                return namespaces;
            }

            function containsDeclarationsInAnyOf(externs, namespaces) {
                var regexp = /^\s*(([a-zA-Z]+\s*\.\s*)*[a-zA-Z]+)\s*(=|;)/mg;
                var match;
                while ((match = regexp.exec(externs))) {
                    var declaredSymbol = match[1].replace(/\s/g, '');
                    var namespace = declaredSymbol.substring(0, declaredSymbol.lastIndexOf('.'));

                    if (namespaces.indexOf(namespace) >= 0)
                        return true;
                }

                return false;
            }

            allExterns.sort(function (a, b) {
                var aNamespaces = extractNamespaces(a);
                var bNamespaces = extractNamespaces(b);
                var aMakesDeclarationsInBsNamespaces = containsDeclarationsInAnyOf(a, bNamespaces);
                var bMakesDeclarationsInAsNamespaces = containsDeclarationsInAnyOf(b, aNamespaces);

                if (aMakesDeclarationsInBsNamespaces && bMakesDeclarationsInAsNamespaces)
                    throw new Error('Can\'t order externs.');

                return aMakesDeclarationsInBsNamespaces ? 1 : bMakesDeclarationsInAsNamespaces ? -1 : 0;
            });

            if (allExterns)
                fs.writeFileSync(path.join('dist', moduleDescriptor.name + '.externs.js'),
                    allExterns.reduce(function (a, b) { return a + '\n\n' + b + '\n'; }, ''));
        });

        // TODO this is an ugly, ugly hack and i don't like it :(
        registerTask('prepare-apis', function () {
            // *sadface*
            var apiFiles = moduleDescriptor.dependencies.internal
                .map(function (d) { return glob.sync(path.join('bower_components', d, 'dist/**/*.externs.js')); })
                .reduce(function (a, b) { return a.concat(b); }, [])
                .concat(glob.sync('dist/**/*.externs.js'));

            fs.writeFileSync('build/apis.js', [
                '/** @preserve START OF APIs */',
                apiFiles.map(function (f) { return fs.readFileSync(f, 'utf8').trim(); })
                    .reduce(function (a, b) { return a + '\n' + b + '\n'; }, '')
            ].join(''));
        });

        registerTask('drop-apis', function () {
            // *sadface*
            var code = fs.readFileSync(moduleDescriptor.distributionFile, 'utf8');
            code = code.replace(/\/\*\s*START OF APIs\s*\*\/[\s\S]*$/, '');
            fs.writeFileSync(moduleDescriptor.distributionFile, code);
        });

        // TODO fork jaguarjs-jsdoc and have it not be generated in the first place
        registerTask('drop-sources-and-footer', function () {
            glob.sync('dist/**/*.html').forEach(function (documentationFile) {
                var documentation = fs.readFileSync(documentationFile, 'utf8');
                documentation = documentation.replace(/<div class="tag-source">[^<]*<\/div>/g, '');
                documentation = documentation.replace(/<footer>[\s\S]*<\/footer>/g, '');
                fs.writeFileSync(documentationFile, documentation);
            });
        });
    }

    function registerTask(name, task) {
        registeredTasks.push(name);
        grunt.registerTask(name, task);
    }

    function executeConfigured() {
        var targets = Array.prototype.slice.call(arguments);

        logger.writeln('Preparing to execute targets ' + targets.map(util.tick).join(', '));

        function extractTaskName(t) { return t.indexOf(':') >= 0 ? t.substring(0, t.indexOf(':')) : t; }

        function isConfigured(t) { return registeredTasks.indexOf(extractTaskName(t)) >= 0 || !!grunt.config.getRaw(extractTaskName(t)); }

        var unconfigured = targets
            .filter(function (t) { return !isConfigured(t); })
            .map(function (t) { return '`' + t + '`'; });
        if (unconfigured.length)
            logger.writeln('Skipping tasks ' + unconfigured.join(', ') + ' because they are not configured.');

        var configured = targets.filter(isConfigured);
        return taskLoader.load(configured.map(extractTaskName))
            .map(function () {
                logger.writeln('Queuing targets ' + configured.map(util.tick).join(', ') + '.');
                grunt.task.run(configured);
            });
    }

};
