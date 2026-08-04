const EXT_MAP: Record<string, string> = {
  // Web — JSX/TSX como lenguajes separados (Monaco los soporta nativo)
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',  // Monaco maneja JSX dentro de javascript
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescript',  // Monaco maneja TSX dentro de typescript
  // Frameworks web
  vue: 'html',        // Vue SFC — Monaco lo renderiza como HTML con scripts
  svelte: 'html',    // Svelte — similar a HTML
  astro: 'html',     // Astro — similar a HTML
  // HTML/CSS
  html: 'html', htm: 'html', xhtml: 'html',
  css: 'css',
  scss: 'scss', sass: 'scss',
  less: 'less',
  styl: 'css',       // Stylus
  pcss: 'css',       // PostCSS
  // Data
  json: 'json', jsonc: 'json', json5: 'json',
  jsonl: 'json',
  xml: 'xml', svg: 'xml', xsl: 'xml', xslt: 'xml', xsd: 'xml',
  plist: 'xml',
  // Markup
  md: 'markdown', mdx: 'markdown',
  txt: 'plaintext', text: 'plaintext',
  rst: 'plaintext',
  tex: 'plaintext', latex: 'plaintext',
  // Config
  yaml: 'yaml', yml: 'yaml',
  toml: 'toml',
  ini: 'ini', cfg: 'ini', conf: 'ini',
  env: 'plaintext',
  editorconfig: 'ini',
  properties: 'ini',
  // Sistemas
  rs: 'rust',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp', hh: 'cpp',
  cs: 'csharp', csx: 'csharp',
  fs: 'fsharp', fsx: 'fsharp', fsi: 'fsharp',
  go: 'go', mod: 'go',
  java: 'java',
  kt: 'kotlin', kts: 'kotlin',
  swift: 'swift',
  m: 'objective-c', mm: 'objective-c',
  zig: 'plaintext',
  nim: 'plaintext',
  v: 'plaintext',    // V lang
  // Scripts
  py: 'python', pyw: 'python', pyx: 'python', pyi: 'python',
  rb: 'ruby', rake: 'ruby', gemspec: 'ruby',
  php: 'php', phtml: 'php',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', ksh: 'shell',
  ps1: 'powershell', psm1: 'powershell', psd1: 'powershell',
  bat: 'bat', cmd: 'bat',
  // JVM
  groovy: 'groovy', gradle: 'groovy',
  scala: 'scala', sc: 'scala',
  clj: 'clojure', cljs: 'clojure', cljc: 'clojure', edn: 'clojure',
  // Functional
  hs: 'haskell', lhs: 'haskell',
  ex: 'elixir', exs: 'elixir',
  erl: 'erlang', hrl: 'erlang',
  ml: 'plaintext', mli: 'plaintext',  // OCaml
  // Web frameworks / templating
  ejs: 'html',
  hbs: 'html', handlebars: 'html',
  pug: 'pug',
  jade: 'pug',
  twig: 'html',
  njk: 'html',      // Nunjucks
  liquid: 'html',
  blade: 'php',     // Laravel Blade
  erb: 'html',      // Ruby ERB
  haml: 'plaintext',
  // Mobile
  dart: 'dart',
  // Data/Query
  sql: 'sql', mysql: 'sql', pgsql: 'sql',
  graphql: 'graphql', gql: 'graphql',
  prisma: 'graphql', // Prisma schema
  // Shell/DevOps
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  tf: 'hcl', hcl: 'hcl', tfvars: 'hcl',
  // Scripting
  r: 'r', rmd: 'r',
  lua: 'lua',
  perl: 'perl', pl: 'perl', pm: 'perl',
  // Protocol/Schema
  proto: 'protobuf',
  thrift: 'plaintext',
  avsc: 'json',     // Avro schema
  // Build/Package
  cmake: 'plaintext',
  meson: 'plaintext',
  bazel: 'plaintext', bzl: 'plaintext',
  // Misc
  diff: 'plaintext', patch: 'plaintext',
  log: 'plaintext',
  csv: 'plaintext', tsv: 'plaintext',
  vim: 'plaintext',
  asm: 'plaintext', s: 'plaintext',
  wasm: 'plaintext', wat: 'plaintext',
  sol: 'sol',       // Solidity
};

export function getLanguageFromPath(path: string): string {
  const filename = path.split(/[\\/]/).pop() ?? '';
  const lower = filename.toLowerCase();

  // Archivos especiales por nombre exacto
  const SPECIAL: Record<string, string> = {
    dockerfile: 'dockerfile',
    'dockerfile.dev': 'dockerfile',
    'dockerfile.prod': 'dockerfile',
    'docker-compose.yml': 'yaml',
    'docker-compose.yaml': 'yaml',
    makefile: 'makefile',
    gnumakefile: 'makefile',
    cmakelists: 'plaintext',
    '.gitignore': 'plaintext',
    '.dockerignore': 'plaintext',
    '.eslintignore': 'plaintext',
    '.prettierignore': 'plaintext',
    '.env': 'plaintext',
    '.env.local': 'plaintext',
    '.env.development': 'plaintext',
    '.env.production': 'plaintext',
    '.bashrc': 'shell',
    '.zshrc': 'shell',
    '.bash_profile': 'shell',
    '.profile': 'shell',
    'tsconfig.json': 'json',
    'package.json': 'json',
    'package-lock.json': 'json',
    '.eslintrc': 'json',
    '.eslintrc.json': 'json',
    '.prettierrc': 'json',
    '.babelrc': 'json',
    'tailwind.config.js': 'javascript',
    'tailwind.config.ts': 'typescript',
    'vite.config.ts': 'typescript',
    'vite.config.js': 'javascript',
    'next.config.js': 'javascript',
    'next.config.mjs': 'javascript',
    'nuxt.config.ts': 'typescript',
    'svelte.config.js': 'javascript',
    'astro.config.mjs': 'javascript',
    'angular.json': 'json',
    'cargo.toml': 'toml',
    'cargo.lock': 'toml',
    'go.mod': 'go',
    'go.sum': 'plaintext',
    'gemfile': 'ruby',
    'rakefile': 'ruby',
    'pipfile': 'toml',
    'requirements.txt': 'plaintext',
  };

  if (SPECIAL[lower]) return SPECIAL[lower];

  // Extensión
  const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? '' : '';
  return EXT_MAP[ext] ?? 'plaintext';
}

export function getLanguageLabel(language: string): string {
  const LABELS: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
    json: 'JSON', xml: 'XML',
    rust: 'Rust', c: 'C', cpp: 'C++', csharp: 'C#', fsharp: 'F#',
    go: 'Go', java: 'Java', kotlin: 'Kotlin', swift: 'Swift',
    'objective-c': 'Objective-C',
    python: 'Python', ruby: 'Ruby', php: 'PHP',
    shell: 'Shell', powershell: 'PowerShell', bat: 'Batch',
    yaml: 'YAML', toml: 'TOML', ini: 'INI',
    markdown: 'Markdown', plaintext: 'Plain Text',
    sql: 'SQL', graphql: 'GraphQL', protobuf: 'Protocol Buffers',
    dockerfile: 'Dockerfile', makefile: 'Makefile',
    r: 'R', lua: 'Lua', dart: 'Dart',
    elixir: 'Elixir', erlang: 'Erlang', haskell: 'Haskell',
    scala: 'Scala', groovy: 'Groovy', clojure: 'Clojure',
    perl: 'Perl', pug: 'Pug', hcl: 'HCL',
    sol: 'Solidity',
  };
  return LABELS[language] ?? language;
}

export const ALL_LANGUAGES = [
  'javascript', 'typescript', 'html', 'css', 'scss', 'less',
  'json', 'xml', 'markdown', 'yaml', 'toml', 'ini',
  'rust', 'c', 'cpp', 'csharp', 'fsharp', 'go', 'java', 'kotlin', 'swift', 'objective-c',
  'python', 'ruby', 'php', 'perl', 'lua', 'r', 'dart',
  'shell', 'powershell', 'bat',
  'sql', 'graphql', 'protobuf',
  'haskell', 'elixir', 'erlang', 'scala', 'groovy', 'clojure',
  'dockerfile', 'makefile', 'hcl',
  'pug', 'sol', 'plaintext',
].sort();
