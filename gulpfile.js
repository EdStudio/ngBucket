var gulp = require('gulp');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var del = require('del');

var name = 'ngBucket';
var paths = {
    scripts: ['./src/*.js']
};

gulp.task('clean', function(cb) {
    del(['build'], cb);
});

gulp.task('lint', function() {
    return gulp.src('./src/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('test', ['lint']);

gulp.task('build', ['clean'], function() {
    return gulp.src(paths.scripts)
        .pipe(uglify())
        .pipe(concat(name + '.min.js'))
        .pipe(gulp.dest('.'))
});

gulp.task('dev', function() {
    gulp.watch(paths.scripts, ['build']);
});
