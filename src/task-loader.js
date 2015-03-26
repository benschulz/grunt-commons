'use strict';

var parentRequire = require('parent-require');

var dependencyVersions = require('./dependency-versions.json'),
    grunt = parentRequire('grunt'),
    logger = require('./logger'),
    npm = require('npm'),
    path = require('path'),
    Promise = require('pacta'),
    util = require('./util');

module.exports = {
    load: loadTasks
};

function loadTasks(tasks) {
    logger.writeln('Loading tasks ' + tasks.map(util.tick).join(', '));
    var plugins = tasks
        .map(pluginFor)
        .reduce(function (a, b) {return a.concat(b);}, [])
        .filter(function (p) { return !!p; });

    return installMissingNodePackages(plugins)
        .map(function () {
            plugins.forEach(grunt.task.loadNpmTasks);
        });

}

function pluginFor(taskId) {
    return {
        closurecompiler: ['grunt-closurecompiler'],
        cssmin: ['grunt-contrib-cssmin'],
        es6arrowfunction: ['es6-arrow-function'],
        jsdoc: ['grunt-jsdoc', 'jaguarjs-jsdoc'],
        jshint: ['grunt-contrib-jshint'],
        karma: ['chai', 'grunt-karma', 'karma', 'karma-babel-preprocessor', 'karma-chai', 'karma-chrome-launcher', 'karma-coverage', 'karma-firefox-launcher', 'karma-html-reporter', 'karma-mocha', 'karma-phantomjs-launcher', 'karma-requirejs'],
        less: ['grunt-contrib-less'],
        requirejs: ['grunt-contrib-requirejs', 'requirejs-plugins'],
        watch: ['grunt-contrib-watch']
    }[taskId];
}

function installMissingNodePackages(packages) {
    logger.subhead('Installing required npm dependencies.');

    return loadNpm()
        .chain(listInstalledNodePackages)
        .chain(function (installed) {
            var packagesWithVersion = packages
                .filter(function (name) { return installed.indexOf(name) < 0; })
                .map(function (name) { return name + '@' + (dependencyVersions[name] || 'latest'); });

            if (packagesWithVersion.length) {
                logger.writeln('Some required packages are missing.');
                return installNodePackages(packagesWithVersion);
            } else {
                logger.ok('All required packages are installed.');
                return Promise.of([]);
            }
        });
}

function loadNpm() {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        logger.writeln('Loading npm...');
        npm.load({loglevel: 'silent'}, function (loadError) {
            promise.resolve(Promise.of(true).chain(function () {
                logger.writeln('NPM loaded.');
                return loadError
                    ? util.rejected(loadError)
                    : Promise.of(true);
            }));
        });

        return promise.chain(util.identity);
    });
}

function listInstalledNodePackages() {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        logger.writeln('Listing installed node packages...');
        npm.commands.ls([], true, function (lsError, lsData) {
            promise.resolve(Promise.of(true).chain(function () {
                return lsError
                    ? util.rejected(lsError)
                    : Promise.of(Object.keys(lsData.dependencies));
            }));
        });

        return promise.chain(util.identity);
    });
}

function installNodePackages(packagesWithVersion) {
    return Promise.of(true).chain(function () {
        var promise = new Promise();

        logger.writeln('Installing the following packages: ' + packagesWithVersion.join(', '));
        npm.commands.install(packagesWithVersion, function (installError) {
            promise.resolve(Promise.of(true).chain(function () {
                if (installError)
                    return util.rejected(installError);
                else {
                    logger.ok('Required packages were successfully installed.');
                    return Promise.of(packagesWithVersion);
                }
            }));
        });

        return promise.chain(util.identity);
    });
}
