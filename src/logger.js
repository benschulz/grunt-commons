'use strict';

var grunt = require('grunt');

module.exports = grunt.option('verbose-grunt-commons')
    ? grunt.log
    : grunt.verbose;
