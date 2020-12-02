const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync')  //搭服务的插件

const loadPlugins = require('gulp-load-plugins')  //将所有的gulp插件引入

const plugins = loadPlugins()
const bs = browserSync.create()

const cwd = process.cwd(); //获取当前目录
let config = {
  // default config
  build:{
    src:'src',
    dist:'dist',
    temp:'temp',
    public:'public',
    paths:{
      styles:'assets/styles/*.scss',
      scripts:'assets/scripts/*.js',
      pages:'*.html',
      images:'assets/images/**',
      fonts:'assets/fonts/**'
    }
  }
};
try{
  const loadConfig = require(`${cwd}/pages.config.js`);
  // console.log('loadConfig',loadConfig);
  config =  Object.assign({},config,loadConfig);
}catch(e){
  console.log('error  ',e);
}

// console.log('config',config);
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))  //在修改信息后，推到浏览器
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {  //不做修改
  return src('**', { base: config.build.public, cwd: config.build.src })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, {cwd: config.build.src},style)
  watch(config.build.paths.scripts, {cwd: config.build.src},script)
  watch(config.build.paths.pages, {cwd: config.build.src},page)

  //在开发环境时，没有必要每次都构建图片等，浪费时间，所以在开发环境直接指向源文件就好
  // 要分清楚哪些需要执行，哪些不需要执行
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], {cwd: config.build.src},bs.reload)

  watch('**',{cwd: config.build.public},bs.reload)

  bs.init({
    notify: false, //不会再次弹出窗口
    port: 2080,
    // open: false,   //是否自动打开浏览器
    // files: 'dist/**',  监听修改相关文件夹下面的文件的修改
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'  //开发环境时路由映射
      }
    }
  })
}

//useref不能单独执行，需要先执行compile，有注释才能执行
const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp ,cwd: config.build.temp})
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))  //创建转换流，将文件当中的构建注释删除， 会将引入的插件转换
    // html js css  压缩文件
    .pipe(plugins.if(/\.js$/, plugins.uglify()))   //if插件，是什么文件，做什么操作
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      // 这个压缩html需要单独配置
      collapseWhitespace: true,   // 删除html内的换行符，
      minifyCSS: true,            // 。。。
      minifyJS: true,             // 。。。
    })))
    .pipe(dest(config.build.dist))  //读写相同的文件会存在写不进去的问题，所以需要将写出的文件换一个文件夹
}

const compile = parallel(style, script, page)  //并行

// 上线之前执行的任务
const build =  series(  //串行
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
