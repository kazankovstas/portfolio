const { src, dest, watch, parallel, series } = require("gulp");
const plumber = require("gulp-plumber");
const sourcemap = require("gulp-sourcemaps");
const scss = require("gulp-sass");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const csso = require("postcss-csso");
const rename = require("gulp-rename");
const htmlmin = require("gulp-htmlmin");
const terser = require("gulp-terser");
const imagemin = require("gulp-imagemin");
const webp = require("gulp-webp");
const svgstore = require("gulp-svgstore");
const del = require("del");
const sync = require("browser-sync").create();
const ghPages = require("gh-pages");
const path = require("path");

// --------------------------------------------------------------------- GH-Pages

function deploy(cb) {
  ghPages.publish(path.join(process.cwd(), "./build"), cb);
}

// ---------------------------------------------------------------- HTML, CSS, JS
const html = () => {
  return src("source/*.html")
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest("build"));
};

const styles = () => {
  return src("source/scss/style.scss")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(scss())
    .pipe(postcss([autoprefixer(), csso()]))
    .pipe(rename("style.min.css"))
    .pipe(sourcemap.write("."))
    .pipe(dest("build/css"))
    .pipe(sync.stream());
};

const scripts = () => {
  return src("source/js/*.js")
    .pipe(terser())
    .pipe(dest("build/js"))
    .pipe(sync.stream());
};

// ------------------------------------------------------------------------- Images
const optimizeImages = () => {
  return src("source/img/**/*.{png,jpg,svg}")
    .pipe(
      imagemin([
        imagemin.mozjpeg({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 3 }),
        imagemin.svgo(),
      ])
    )
    .pipe(dest("build/img"));
};

const copyImages = () => {
  return src("source/img/**/*.{png,jpg,svg,pdf}").pipe(dest("build/img"));
};

const createWebp = () => {
  return src("source/img/**/*.{jpg,png}")
    .pipe(webp({ quality: 90 }))
    .pipe(dest("build/img"));
};

const createSprite = () => {
  return src("source/img/sprite/*.svg")
    .pipe(
      svgstore({
        inlineSvg: true,
      })
    )
    .pipe(rename("sprites.svg"))
    .pipe(dest("build/img"));
};

// -------------------------------------------------------------------------------------- Copy
const copy = (done) => {
  src(
    [
      "source/fonts/**/*.{woff2,woff}",
      "source/*.ico",
      "source/img/**/*.svg",
      "!source/img/icons/*.svg",
    ],
    {
      base: "source",
    }
  ).pipe(dest("build"));
  done();
};

// --------------------------------------------------------------------------------------- Clean
const clean = () => {
  return del("build");
};

// --------------------------------------------------------------------------------------- Reload
const reload = (done) => {
  sync.reload();
  done();
};

// -------------------------------------------------------------------------------------- Server
const server = (done) => {
  sync.init({
    server: {
      baseDir: "build",
    },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
};

// --------------------------------------------------------------------------------------- Watcher
const watcher = () => {
  watch("source/scss/**/*.scss", series(styles));
  watch("source/js/script.js", series(scripts));
  watch("source/*.html", series(html, reload));
};

// ----------------------------------------------------------------------------------------- Build
const build = series(
  clean,
  copy,
  optimizeImages,
  parallel(styles, html, scripts, createSprite, createWebp)
);

// ---------------------------------------------------------------------------------------- Default
exports.default = series(
  clean,
  copy,
  copyImages,
  parallel(styles, html, scripts, createSprite, createWebp),
  series(server, watcher)
);

exports.deploy = deploy;
exports.html = html;
exports.styles = styles;
exports.scripts = scripts;
exports.optimizeImages = optimizeImages;
exports.copyImages = copyImages;
exports.createWebp = createWebp;
exports.createSprite = createSprite;
exports.copy = copy;
exports.server = server;
exports.build = build;
