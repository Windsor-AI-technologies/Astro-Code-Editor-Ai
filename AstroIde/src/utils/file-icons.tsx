// ── Material Icon Theme for AstroIde ─────────────────────────────────────────
// Uses real SVG icons from the material-icon-theme package (MIT license).
// Icons are served from public/icons/ as static assets.

interface IconProps {
  size?: number;
}

function MaterialIcon({ src, size = 16 }: { src: string; size?: number }) {
  return <img src={src} width={size} height={size} alt="" style={{ display: 'block' }} />;
}

// ── Extension → file icon SVG name mapping ───────────────────────────────────

const extensionMap: Record<string, string> = {
  ts: 'typescript', tsx: 'react_ts', js: 'javascript', jsx: 'react',
  mjs: 'javascript', cjs: 'javascript',
  html: 'html', htm: 'html',
  css: 'css', scss: 'sass', sass: 'sass', less: 'css',
  json: 'json', jsonc: 'json',
  md: 'markdown', mdx: 'markdown',
  rs: 'rust',
  py: 'python',
  go: 'go',
  java: 'java',
  kt: 'kotlin', kts: 'kotlin',
  swift: 'swift',
  dart: 'dart',
  cpp: 'cpp', cc: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  vue: 'vue',
  svelte: 'svelte',
  svg: 'svg',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
  webp: 'image', ico: 'image', bmp: 'image',
  yml: 'yaml', yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  sql: 'database',
  sh: 'console', bash: 'console', zsh: 'console',
  ps1: 'powershell', bat: 'console', cmd: 'console',
  lua: 'lua',
  lock: 'lock',
  env: 'key',
};

// ── Filename → file icon SVG name mapping (exact match) ──────────────────────

const filenameMap: Record<string, string> = {
  'Dockerfile': 'docker', 'docker-compose.yml': 'docker', 'docker-compose.yaml': 'docker',
  '.dockerignore': 'docker',
  '.gitignore': 'git', '.gitattributes': 'git', '.gitmodules': 'git',
  'package.json': 'nodejs', 'package-lock.json': 'lock',
  'yarn.lock': 'lock', 'pnpm-lock.yaml': 'lock', 'Cargo.lock': 'lock',
  'Cargo.toml': 'rust',
  'tsconfig.json': 'typescript', 'tsconfig.node.json': 'typescript',
  'vite.config.ts': 'vite', 'vite.config.js': 'vite',
  'next.config.js': 'next', 'next.config.mjs': 'next', 'next.config.ts': 'next',
  'tailwind.config.js': 'tailwindcss', 'tailwind.config.ts': 'tailwindcss',
  '.eslintrc': 'eslint', '.eslintrc.js': 'eslint', '.eslintrc.json': 'eslint',
  'eslint.config.js': 'eslint', 'eslint.config.mjs': 'eslint',
  '.prettierrc': 'prettier', '.prettierrc.json': 'prettier', 'prettier.config.js': 'prettier',
  '.env': 'key', '.env.local': 'key', '.env.development': 'key', '.env.production': 'key',
  'README.md': 'readme', 'readme.md': 'readme',
  'LICENSE': 'license', 'LICENSE.md': 'license',
  '.npmrc': 'npm', '.nvmrc': 'nodejs',
};

// ── Folder name → folder icon SVG name mapping ──────────────────────────────

const folderMap: Record<string, string> = {
  src: 'folder-src', 'src-tauri': 'folder-src-tauri',
  components: 'folder-components',
  node_modules: 'folder-node',
  public: 'folder-public',
  dist: 'folder-dist', build: 'folder-dist', out: 'folder-dist',
  config: 'folder-config', '.config': 'folder-config',
  api: 'folder-api',
  app: 'folder-app',
  scripts: 'folder-scripts',
  test: 'folder-test', tests: 'folder-test', __tests__: 'folder-test', spec: 'folder-test',
  docs: 'folder-docs', doc: 'folder-docs',
  images: 'folder-images', img: 'folder-images', imgs: 'folder-images',
  utils: 'folder-utils', util: 'folder-utils', helpers: 'folder-utils',
  hooks: 'folder-hook',
  styles: 'folder-styles', style: 'folder-styles', css: 'folder-css', scss: 'folder-sass',
  lib: 'folder-lib', libs: 'folder-lib',
  types: 'folder-typescript',
  server: 'folder-server',
  routes: 'folder-routes', router: 'folder-routes',
  layout: 'folder-layout', layouts: 'folder-layout',
  assets: 'folder-images',
  '.vscode': 'folder-vscode',
  '.git': 'folder-git',
  '.github': 'folder-git',
};

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns an icon component for a given file name/path */
export function getFileIcon(filename: string): React.FC<IconProps> {
  const name = filename.split(/[\\/]/).pop() ?? filename;

  // Check exact filename first
  let iconName = filenameMap[name];
  if (!iconName) {
    // Check extension
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    iconName = extensionMap[ext] ?? 'file';
  }

  const src = `/icons/files/${iconName}.svg`;
  return ({ size }: IconProps) => <MaterialIcon src={src} size={size} />;
}

/** Returns folder icon components (closed & open) for a given folder name */
export function getFolderIcon(folderName: string): { closed: React.FC<IconProps>; open: React.FC<IconProps> } {
  const name = folderName.toLowerCase();
  const base = folderMap[name] ?? 'folder';

  const closedSrc = `/icons/folders/${base}.svg`;
  const openSrc = `/icons/folders/${base}-open.svg`;

  return {
    closed: ({ size }: IconProps) => <MaterialIcon src={closedSrc} size={size} />,
    open: ({ size }: IconProps) => <MaterialIcon src={openSrc} size={size} />,
  };
}
