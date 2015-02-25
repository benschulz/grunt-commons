'use strict';

module.exports = {
    configure: function () {
        return {
            options: {
                livereload: true
            },
            livereload: {
                files: ['<%= jshint.sources.files.src %>', '<%= jshint.testSources.files.src %>', 'test/**/*.html']
            },
            js: {
                files: ['<%= jshint.gruntfile.files.src %>', '<%= jshint.sources.files.src %>', '<%= jshint.testSources.files.src %>'],
                tasks: ['jshint']
            }
        };
    }
};