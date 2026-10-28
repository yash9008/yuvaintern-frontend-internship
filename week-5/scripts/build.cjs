// Development-only tools: the distributed page needs no installation.
const fs = require('node:fs');
const path = require('node:path');
const { transform } = require('lightningcss');
const { minify } = require('terser');
const { optimize } = require('svgo');
const root = path.resolve(__dirname, '..');
(async () => {
  const css = transform({ filename: 'styles.css', code: fs.readFileSync(path.join(root, 'src/styles.css')), minify: true, targets: { chrome: 109 << 16, safari: 16 << 16, firefox: 115 << 16 } });
  fs.writeFileSync(path.join(root, 'styles.css'), css.code);
  for (const name of ['app.js', 'notes-data.js', 'guide-data.js']) {
    const sourcePath = name === 'app.js' ? path.join(root, 'src/app.js') : path.join(root, name);
    const js = await minify(fs.readFileSync(sourcePath, 'utf8'), { compress: true, mangle: false, format: { comments: false } });
    fs.writeFileSync(path.join(root, name), js.code + '\n');
  }
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  for (const name of fs.readdirSync(path.join(root, 'src/assets'))) {
    const result = optimize(fs.readFileSync(path.join(root, 'src/assets', name), 'utf8'), { multipass: true, plugins: ['preset-default'] });
    fs.writeFileSync(path.join(root, 'assets', name), result.data + '\n');
  }
  console.log('Built minified CSS, three JavaScript files, and five SVGs.');
})().catch(e => { console.error(e); process.exit(1); });
