'use strict';

var parentRequire = require('parent-require');

var grunt = parentRequire('grunt');

module.exports = grunt.option('verbose-grunt-commons')
    ? grunt.log
    : grunt.verbose;
