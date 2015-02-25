'use strict';

var logger = require('./logger'),
    path = require('path');

module.exports = function ModuleDescriptor(data, dependencies) {
    logger.writeln('Creating module descriptor for `' + data.name + '`.');

    this.name = data.name;
    this.dependencies = dependencies;

    this.basename = data.basename || data.name;
    this.debugBasename = this.basename + '.debug';
    this.main = data.main;
    this.internalMain = data.internalMain;

    this.distributionDirectory = 'dist';
    this.internalDistributionFile = path.join(this.distributionDirectory, this.basename + '.internal.js');
    this.debugDistributionFile = path.join(this.distributionDirectory, this.debugBasename + '.js');
    this.distributionFile = path.join(this.distributionDirectory, this.basename + '.js');

    this.cssDebugDistributionFile = path.join(this.distributionDirectory, this.debugBasename + '.css');
    this.cssDistributionFile = path.join(this.distributionDirectory, this.basename + '.css');

    this.shims = data.shims || {};
    this.shimmedExternalDependencies = dependencies.external.filter(function (d) { return Object.keys(this.shims).indexOf(d) >= 0; }, this);
    this.unshimmedExternalDependencies = dependencies.external.filter(function (d) { return this.shimmedExternalDependencies.indexOf(d) < 0; }, this);
    this.orderedExternalDependencies = this.shimmedExternalDependencies.concat(this.unshimmedExternalDependencies);
};
