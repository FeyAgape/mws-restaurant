// Requiring Gulp
var gulp = require('gulp');
// Requires the gulp-sass plugin
var sass = require('gulp-sass');

gulp.task('sass', function(){
  //return gulp.src('app/scss/styles.scss') // this only lets us compile .scss file
  // using globbing allow us to compile more than one
  return gulp.src('app/scss/**/*.scss') // using Globbing gets all files ending with .scss in app/scss and children dirs
    .pipe(sass()) // Converts Sass to CSS with gulp-sass
    .pipe(gulp.dest('app/css'))
});