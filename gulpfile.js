'use strict';
var gulp = require('gulp');
var gutil = require('gulp-util');
var del = require('del');
var uglify = require('gulp-uglify');
var gulpif = require('gulp-if');
var exec = require('child_process').exec;

var notify = require('gulp-notify');

var buffer = require('vinyl-buffer');
var argv = require('yargs').argv;
// sass
var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var sourcemaps = require('gulp-sourcemaps');
// BrowserSync
var browserSync = require('browser-sync');
// js
var watchify = require('watchify');
var source = require('vinyl-source-stream');
// linting
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
// testing/mocha
var mocha = require('gulp-mocha');

// gulp build --production
var production = !!argv.production;
// determine if we're doing a build
// and if so, bypass the livereload
var build = argv._.length ? argv._[0] === 'build' : false;
var watch = argv._.length ? argv._[0] === 'watch' : true;

// ----------------------------
// Error notification methods
// ----------------------------
var beep = function() {
  var os = require('os');
  var file = 'gulp/error.wav';
  if (os.platform() === 'linux') {
    // linux
    exec("aplay " + file);
  } else {
    // mac
    console.log("afplay " + file);
    exec("afplay " + file);
  }
};
var handleError = function(task) {
  return function(err) {
    beep();

      notify.onError({
        message: task + ' failed, check the logs..',
        sound: false
      })(err);

    gutil.log(gutil.colors.bgRed(task + ' error:'), gutil.colors.red(err));
  };
};
// --------------------------
// CUSTOM TASK METHODS
// --------------------------
var tasks = {
  // --------------------------
  // Delete build folder
  // --------------------------
  clean: function(cb) {
    del(['dist/'], cb);
  },
  
  // --------------------------
  // SASS (libsass)
  // --------------------------
  sass: function() {
    return gulp.src('./assets/scss/*.scss')
      // sourcemaps + sass + error handling
      .pipe(gulpif(!production, sourcemaps.init()))
      .pipe(sass({
        sourceComments: !production,
        outputStyle: production ? 'compressed' : 'nested'
      }))
      .on('error', handleError('SASS'))
      // generate .maps
      .pipe(gulpif(!production, sourcemaps.write({
        'includeContent': false,
        'sourceRoot': '.'
      })))
      // autoprefixer
      .pipe(gulpif(!production, sourcemaps.init({
        'loadMaps': true
      })))
      .pipe(postcss([autoprefixer({browsers: ['last 2 versions']})]))
      // we don't serve the source files
      // so include scss content inside the sourcemaps
      .pipe(sourcemaps.write({
        'includeContent': true
      }))
      // write sourcemaps to a specific directory
      // give it a file and save
      .pipe(gulp.dest('dist/css'));
  },

  // --------------------------
  // linting
  // --------------------------
  lintjs: function() {
    return gulp.src([
        'gulpfile.js',
        './assets/js/**/*.js'
      ]).pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .on('error', function() {
        beep();
      });
  },

  // --------------------------
  // Uglify
  // --------------------------
  uglify: function() {
    return gulp.src('assets/js/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'));
  },

  // --------------------------
  // Testing with mocha
  // --------------------------
  test: function() {
    return gulp.src('./assets/**/*test.js', {read: false})
      .pipe(mocha({
        'ui': 'bdd',
        'reporter': 'spec'
      })
    );
  },


};

gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: "./"
        },
        port: process.env.PORT || 8000
    });
});

gulp.task('reload-sass', ['sass'], function(){
  browserSync.reload();
});
gulp.task('reload-js', [], function(){
  browserSync.reload();
});
gulp.task('reload-templates', ['templates'], function(){
  browserSync.reload();
});

// --------------------------
// CUSTOMS TASKS
// --------------------------
gulp.task('clean', tasks.clean);
// for production we require the clean method on every individual task
var req = build ? ['clean'] : [];
// individual tasks
gulp.task('templates', req, tasks.templates);
gulp.task('sass', req, tasks.sass);
gulp.task('uglify', req, tasks.uglify);
gulp.task('lint:js', tasks.lintjs);
gulp.task('test', tasks.test);

// --------------------------
// DEV/WATCH TASK
// --------------------------
gulp.task('watch', ['sass', 'uglify', 'browser-sync'], function() {

  // --------------------------
  // watch:sass
  // --------------------------
  gulp.watch('./assets/scss/**/*.scss', ['reload-sass']);

  // --------------------------
  // watch:js
  // --------------------------
  gulp.watch('./assets/js/**/*.js', ['lint:js', 'uglify', 'reload-js']);

  gutil.log(gutil.colors.bgGreen('Watching for changes...'));
});

// build task
gulp.task('build', [
  'clean',
  'sass'
]);

gulp.task('default', ['watch']);

// gulp (watch) : for development and livereload
// gulp build : for a one off development build
// gulp build --production : for a minified production build
