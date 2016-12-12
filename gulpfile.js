var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');

gulp.task('browserify', function() {

    browserify({
        entries: './GenericSqlParser.js',
        debug: true,
        standalone: 'GenericSqlParser'
    })
        .transform(babelify, {presets: ['es2015']})
        .bundle()
        .pipe(source('browser.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('./'));

});

gulp.task('watch', function() {
    gulp.watch(['GenericSqlParser.js', 'ReadableCharacters.js', 'Tokenizer.js', 'TokenizerAsync.js'], ['browserify']);
});

gulp.task('default', ['browserify', 'watch']);