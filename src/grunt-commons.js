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
                : fs.existsSync('test/main.js');

            if (!karmaEnabled)
                logger.warn(chalk.yellow('Warning: No tests found or karma was disabled.'));

            return karmaEnabled;
        },
        less: function (config) {return !!config.less; }
    };

    function initGrunt(config, dependencies) {
        var moduleDescriptor = new ModuleDescriptor(mdl, dependencies);

        var gruntConfig = registerCustomTasks(moduleDescriptor);

        logger.subhead('Initializing grunt..');
        config = config || {};
        Object.keys(config).forEach(function (k) {
            gruntConfig[k] = config[k];
        });

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

    function registerCustomTasks(moduleDescriptor) {
        var gruntConfig = {};

        gruntConfig['concat-externs'] = grunt.registerTask('concat-externs', function () {
            var allExterns = glob.sync('api/**/*.externs.js').map(function (externsFile) {
                return fs.readFileSync(externsFile, 'utf8').trim();
            }).reduce(function (a, b) { return a + '\n\n' + b; }, '');

            if (allExterns)
                fs.writeFileSync(path.join('dist', moduleDescriptor.name + '.externs.js'), allExterns);
        });

        return gruntConfig;
    }

    return {
        initialize: function (config) {
            // TODO default task for watch & karma:development (needs grunt-concurrent)
            registerTask('build', 'less', 'cssmin', 'es6arrowfunction', 'jshint', 'karma:sources', 'requirejs', 'karma:debugDistribution', 'closurecompiler', 'karma:distribution', 'concat-externs', 'jsdoc');
            registerTask('build-skip-tests', 'less', 'cssmin', 'es6arrowfunction', 'jshint', 'requirejs', 'closurecompiler', 'concat-externs', 'jsdoc');
            registerTask('generate-documentation', 'es6arrowfunction', 'jsdoc');
            registerTask('test-interactively', 'karma:development');
            registerTask('test-sources', 'karma:sources');
            registerTask('test-debug-distribution', 'karma:debugDistribution');
            registerTask('test-distribution', 'karma:distribution');

            grunt.initConfig(Object.keys(config)
                .filter(function (k) { return adapters.indexOf(k) < 0; })
                .map(function (k) { return util.singletonObject(k, config[k]); })
                .reduce(util.mergeObjects, {}));

            function registerTask(name) {
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

    function executeConfigured() {
        var targets = Array.prototype.slice.call(arguments);

        logger.writeln('Preparing to execute targets ' + targets.map(util.tick).join(', '));

        function e(t) { return t.indexOf(':') >= 0 ? t.substring(0, t.indexOf(':')) : t; }

        var unconfigured = targets
            .filter(function (t) { return !grunt.config.getRaw(e(t)); })
            .map(function (t) { return '`' + t + '`'; });
        if (unconfigured.length)
            logger.writeln('Skipping tasks ' + unconfigured.join(', ') + ' because they are not configured.');

        var configured = targets.filter(function (t) { return !!grunt.config.getRaw(e(t)); });

        return taskLoader.load(configured.map(e)).map(function () {
            logger.writeln('Queuing targets ' + configured.map(util.tick).join(', ') + '.');
            grunt.task.run(configured);
        });
    }

};
