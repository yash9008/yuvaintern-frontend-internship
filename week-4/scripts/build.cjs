// Development-only tools: the distributed page needs no installation.
const fs = require('node:fs');
const path = require('node:path');
const { transform } = require('lightningcss');
const { minify } = require('terser');
const { optimize } = require('svgo');
const root = path.resolve(__dirname, '..');
(async () => {
  const css = transform({filename:'styles.css', code:fs.readFileSync(path.join(root,'src/styles.css')), minify:true, targets:{chrome:109<<16,safari:16<<16,firefox:115<<16}});
  fs.writeFileSync(path.join(root,'styles.css'),css.code);
  const js = await minify(fs.readFileSync(path.join(root,'src/script.js'),'utf8'),{compress:true,mangle:true,format:{comments:false}});
  fs.writeFileSync(path.join(root,'script.js'),js.code+'\n');
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  for(const name of fs.readdirSync(path.join(root,'src/assets'))) {
    const result=optimize(fs.readFileSync(path.join(root,'src/assets',name),'utf8'),{multipass:true,plugins:['preset-default']});
    fs.writeFileSync(path.join(root,'assets',name),result.data+'\n');
  }
  console.log('Built minified CSS, JavaScript, and five SVGs.');
})().catch(e=>{console.error(e);process.exit(1)});
