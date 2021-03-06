'use strict';

var parentRequire = require('parent-require');

var bower = require('bower'),
    chalk = require('chalk'),
    fs = require('fs'),
    glob = require('glob'),
    grunt = parentRequire('grunt'),
    logger = require('./logger'),
    path = require('path'),
    Promise = require('pacta'),
    rimraf = require('rimraf'),
    util = require('./util');

module.exports = {
    determineAllDependencies: determineAllDependencies
};

function determineAllDependencies() {
    logger.subhead('Determining direct as well as transitive dependencies.');
    logger.writeln('Reading `bower.json` to determine direct dependencies.');
    var metadata = JSON.parse(fs.readFileSync('bower.json', 'utf8'));

    return recursivelyDetermineAllDependencies({
        all: [],
        external: [],
        internal: [],
        metadata: util.singletonObject(metadata.name, metadata)
    }).map(addInternalMains).chain(tryLinkingNonLinkedComponents);
}

function recursivelyDetermineAllDependencies(initialDependencies) {
    return loadAllComponentsMetadata(initialDependencies)
        .map(collectAllDependencies)
        .chain(function (dependencies) {
            return discoverAlreadyInstalledButNotYetLoadedDependencies(dependencies)
                .conjoin(installMissingDependencies(dependencies))
                .chain(function (installedDependencies) {
                    return installedDependencies.length
                        ? recursivelyDetermineAllDependencies(dependencies)
                        : Promise.of(dependencies);
                });
        });
}

function loadAllComponentsMetadata(dependencies) {
    logger.subhead('Loading metadata of all currently installed dependencies.');
    return dependencies.all
        .filter(function (d) { return !dependencies.metadata[d]; })
        .map(loadComponentMetadata)
        .reduce(function (a, b) { return a.conjoin(b); }, Promise.of([]))
        .reduce(util.mergeObjects, dependencies.metadata)
        .map(function (metadata) {
            logger.ok('Loaded metadata of all installed dependencies.');
            logger.ok('Dependencies: ' + dependencies.all.map(util.tick).join(', '));
            logger.ok('Metadata loaded for: ' + Object.keys(metadata).map(util.tick).join(', '));

            return {
                all: dependencies.all,
                external: dependencies.external,
                internal: dependencies.internal,
                metadata: metadata
            };
        });
}

function loadComponentMetadata(componentName) {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        logger.writeln('Loading `bower.json` metadata of ' + util.tick(componentName) + '.');
        fs.readFile(path.join('bower_components', componentName, 'bower.json'), 'utf8', function (error, data) {
            promise.resolve(Promise.of(true).chain(function () {
                if (error)
                    return util.rejected(error);
                else {
                    return Promise.of([util.singletonObject(componentName, JSON.parse(data))]);
                }
            }));
        });

        return promise.chain(util.identity);
    });
}

function collectAllDependencies(dependencies) {
    function collect(kind) {
        logger.writeln('Reading metadata of ' + Object.keys(dependencies.metadata).map(util.tick).join(', '));

        return util.dedupe(Object.keys(dependencies.metadata)
            .map(function (k) { return Object.keys(dependencies.metadata[k][kind] || {}); })
            .reduce(function (a, b) { return a.concat(b); }));
    }

    logger.subhead('Collecting all currently visible dependencies.');

    var internal = collect('devDependencies');
    logger.ok('Internal dependencies: ' + (internal.length ? internal.join(', ') : '<none>'));

    // internal dependencies will be included => can be dropped as external dependency
    var external = collect('dependencies').filter(function (d) { return internal.indexOf(d) < 0; });
    logger.ok('External dependencies: ' + (external.length ? external.join(', ') : '<none>'));

    return {
        all: internal.concat(external),
        external: external,
        internal: internal,
        metadata: dependencies.metadata
    };
}

function discoverAlreadyInstalledButNotYetLoadedDependencies(dependencies) {
    return listInstalledComponents()
        .chain(function (installedComponents) {
            return Promise.of(dependencies.all.filter(function (d) {
                return installedComponents.indexOf(d) >= 0
                    && !dependencies.metadata[d];
            }));
        });
}

function installMissingDependencies(dependencies) {
    return listInstalledComponents()
        .chain(function (installedComponents) {
            var missing = dependencies.all.filter(function (d) { return installedComponents.indexOf(d) < 0; });
            logger.writeln('The following dependencies are missing: ' + missing.map(util.tick).join(', '));

            return tryLinkingComponents(missing)
                .chain(function (linkedComponents) {
                    var notLinkable = missing.filter(function (m) { return linkedComponents.indexOf(m) < 0; });

                    if (notLinkable.length === 0) {
                        return Promise.of(missing);
                    } else {
                        logger.writeln('The following dependencies are still missing: ' + notLinkable.map(util.tick).join(', '));

                        return Promise.of(linkedComponents).conjoin(installComponents(notLinkable, dependencies));
                    }
                });
        });
}

function listInstalledComponents() {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        logger.subhead('Checking for missing dependencies.');
        bower.commands.list({paths: true})
            .on('error', function (error) { promise.reject(error); })
            .on('end', function (results) {
                promise.resolve(Promise.of(true).map(function () {
                    var installed = Object.keys(results);
                    logger.ok('Determined installed components: ' + installed.map(util.tick).join(', '));
                    return installed;
                }));
            });

        return promise.chain(util.identity);
    });
}

function installComponents(components, dependencies) {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        var toInstall = components.map(function (d) {
            var version = Object.keys(dependencies.metadata).map(function (k) {
                var m = dependencies.metadata[k];
                return (m.dependencies || {})[d] || (m.devDependencies || {})[d];
            }).reduce(function (a, b) {
                if (a && b && a !== b)
                    throw new Error('Potentially conflicting versions `' + a + '` and `' + b + '` of component `' + d + '`.');
                return a || b;
            });
            return d + (version.indexOf('/') >= 0 ? '=' : '#') + version;
        });

        logger.writeln('Installing ' + toInstall.map(util.tick).join(', ') + '..');
        bower.commands.install(toInstall)
            .on('error', function (error) { promise.reject(error); })
            .on('end', function () { promise.resolve(components); });

        return promise;
    });
}

function addInternalMains(dependencies) {
    return {
        all: dependencies.all,
        external: dependencies.external,
        internal: dependencies.internal,
        metadata: Object.keys(dependencies.metadata).map(function (k) {
            var internalMainMetadata = dependencies.metadata[k].internalMain || dependencies.internal.indexOf(k) < 0
                ? {}
                : {internalMain: determineInternalMain(k)};

            return util.singletonObject(k, util.mergeObjects(internalMainMetadata, dependencies.metadata[k]));
        }).reduce(util.mergeObjects, {})
    };
}

function determineInternalMain(internalDependency) {
    logger.writeln('Looking for internal main of ' + util.tick(internalDependency) + '.');
    var location = path.join('bower_components', internalDependency);
    var internalMainPathsPattern = path.join(location, 'dist/*.internal.js');
    var debugMainPathsPattern = path.join(location, 'dist/*.debug.js');

    var internalMainPaths = glob.sync(internalMainPathsPattern);
    var debugMainPaths = glob.sync(debugMainPathsPattern);

    if (!internalMainPaths.length && !debugMainPaths.length)
        throw new Error('Expected at least one file matching `' + internalMainPathsPattern + '` or `' + debugMainPathsPattern + '`.');

    var mainPathsPattern, mainPaths;
    if (internalMainPaths.length) {
        mainPathsPattern = internalMainPaths.length ? internalMainPathsPattern : debugMainPathsPattern;
        mainPaths = internalMainPaths.length ? internalMainPaths : debugMainPaths;
    } else {
        grunt.log.error(chalk.yellow('No internal distribution file of dependency `' + internalDependency + '` found.'));
        grunt.log.error(chalk.yellow('Falling back to debug distribution file of `' + internalDependency + '`.'));
        mainPathsPattern = debugMainPathsPattern;
        mainPaths = debugMainPaths;
    }

    if (mainPaths.length > 1)
        throw new Error('Expected no more than one file matching `' + mainPathsPattern + '`.');

    var internalMain = path.relative(location, mainPaths[0]);
    logger.ok('Internal dependency of ' + util.tick(internalDependency) + ' is ' + util.tick(internalMain) + '.');
    return internalMain;
}

function tryLinkingNonLinkedComponents(dependencies) {
    logger.subhead('Trying to link components which aren\'t linked yet.');

    var nonLinked = dependencies.all.filter(function (d) {
        return !fs.lstatSync(path.join('bower_components', d)).isSymbolicLink();
    });

    if (!nonLinked.length)
        return Promise.of(dependencies);

    return tryLinkingComponents(nonLinked)
        // TODO order the non-linked so this isn't necessary
        .chain(function () { return tryLinkingComponents(dependencies); })
        .map(function () { return dependencies; });
}

function tryLinkingComponents(components) {
    return Promise.of(components)
        .reduce(function (a, b) {
            return a.chain(function (linkedAndInstalled) {
                return Promise.of(linkedAndInstalled).conjoin(tryLinkingComponent(b));
            });
        }, Promise.of([]))
        .chain(util.identity);
}

function tryLinkingComponent(component) {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        var componentPath = path.join('bower_components', component);
        var backupPath = path.join('bower_components', component + '.bak');

        renameIfExists(componentPath, backupPath);

        logger.writeln('Trying to link ' + util.tick(component) + '.');
        bower.commands.link(component)
            .on('error', function (e) {
                promise.resolve(Promise.of(true).map(function () {
                    logger.error('Component could not be linked (' + e + ').');
                    renameIfExists(backupPath, componentPath);
                    return [];
                }));
            })
            .on('end', function (results) {
                promise.resolve(Promise.of(true).map(function () {
                    logger.ok('Component was successfully linked.');
                    deleteIfExists(backupPath);
                    return [component].concat(results.installed);
                }));
            });

        return promise.chain(util.identity);
    });
}

function renameIfExists(oldPath, newPath) {
    ifExists(oldPath, function () {
        fs.renameSync(oldPath, newPath);
    });
}

function deleteIfExists(path) {
    ifExists(path, function () {
        rimraf.sync(path);
    });
}

function ifExists(path, callback) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        if (e.code === 'ENOENT')
            return;
    }
    callback();
}
