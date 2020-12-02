#!/usr/bin/env node

// console.log('lyh')
// console.log(process.argv)  //前两个参数为，node地址和当前文件的地址，后面的参数就是敲指令输入的参数 ，所以可以往里面push参数
process.argv.push('--cwd');
process.argv.push(process.cwd());
process.argv.push('--gulpfile');
process.argv.push(require.resolve('../lib/index'));
// console.log(process.argv)
require('gulp/bin/gulp');