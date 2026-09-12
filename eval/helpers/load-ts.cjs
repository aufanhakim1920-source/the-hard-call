// Execute local TypeScript with explicit dependency doubles; no browser or network.
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
module.exports = function loadTS(path, dependencies, globals = {}, extraExports = '') {
  const source = fs.readFileSync(path, 'utf8') + '\n' + extraExports;
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exported = {};
  vm.runInNewContext(output, {
    exports: exported, console, ...globals,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Missing test dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: path });
  return exported;
};
