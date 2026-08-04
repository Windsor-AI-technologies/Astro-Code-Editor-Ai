import type * as Monaco from 'monaco-editor';

// Registrar providers de autocompletado para cada lenguaje
export function registerCompletionProviders(monaco: typeof Monaco) {
  // ── JavaScript / TypeScript ────────────────────────────────────────────
  const jstsSnippets: Monaco.languages.CompletionItem[] = [
    // React
    snip('rfc', 'React Functional Component', "import React from 'react';\n\ninterface ${1:Component}Props {\n  $2\n}\n\nexport default function ${1:Component}({ $3 }: ${1:Component}Props) {\n  return (\n    <div>\n      $0\n    </div>\n  );\n}"),
    snip('useState', 'React useState Hook', "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initial});"),
    snip('useEffect', 'React useEffect Hook', "useEffect(() => {\n  $1\n  return () => {\n    $2\n  };\n}, [$3]);"),
    snip('useRef', 'React useRef Hook', "const ${1:ref} = useRef<${2:HTMLDivElement}>(null);"),
    snip('useMemo', 'React useMemo Hook', "const ${1:value} = useMemo(() => {\n  $2\n  return $3;\n}, [$4]);"),
    snip('useCallback', 'React useCallback Hook', "const ${1:fn} = useCallback(($2) => {\n  $3\n}, [$4]);"),
    snip('useContext', 'React useContext', "const ${1:value} = useContext(${2:MyContext});"),
    // Imports
    snip('imp', 'Import module', "import { $2 } from '$1';"),
    snip('impd', 'Import default', "import $2 from '$1';"),
    snip('impr', 'Import React', "import React from 'react';"),
    snip('imps', 'Import styled', "import styled from 'styled-components';"),
    // Functions
    snip('fn', 'Arrow function', "const ${1:name} = ($2) => {\n  $0\n};"),
    snip('afn', 'Async arrow function', "const ${1:name} = async ($2) => {\n  $0\n};"),
    snip('ef', 'Export function', "export function ${1:name}($2): ${3:void} {\n  $0\n}"),
    snip('eaf', 'Export async function', "export async function ${1:name}($2): Promise<${3:void}> {\n  $0\n}"),
    // Classes/interfaces
    snip('int', 'Interface', "interface ${1:Name} {\n  $0\n}"),
    snip('type', 'Type alias', "type ${1:Name} = $0;"),
    snip('enum', 'Enum', "enum ${1:Name} {\n  $0\n}"),
    snip('cls', 'Class', "class ${1:Name} {\n  constructor($2) {\n    $0\n  }\n}"),
    // Control flow
    snip('if', 'If statement', "if ($1) {\n  $0\n}"),
    snip('ife', 'If-else', "if ($1) {\n  $2\n} else {\n  $0\n}"),
    snip('for', 'For loop', "for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n  $0\n}"),
    snip('forof', 'For...of', "for (const ${1:item} of ${2:array}) {\n  $0\n}"),
    snip('forin', 'For...in', "for (const ${1:key} in ${2:object}) {\n  $0\n}"),
    snip('map', 'Array map', "${1:array}.map((${2:item}) => {\n  $0\n})"),
    snip('filter', 'Array filter', "${1:array}.filter((${2:item}) => $0)"),
    snip('reduce', 'Array reduce', "${1:array}.reduce((${2:acc}, ${3:item}) => {\n  $0\n  return ${2:acc};\n}, ${4:initial})"),
    // Async
    snip('prom', 'New Promise', "new Promise<${1:void}>((resolve, reject) => {\n  $0\n})"),
    snip('try', 'Try-catch', "try {\n  $1\n} catch (${2:error}) {\n  $0\n}"),
    snip('trya', 'Try-catch async', "try {\n  $1\n} catch (${2:error}) {\n  console.error(${2:error});\n  $0\n}"),
    // Console
    snip('cl', 'console.log', "console.log($1);"),
    snip('ce', 'console.error', "console.error($1);"),
    snip('cw', 'console.warn', "console.warn($1);"),
    // Next.js / Frameworks
    snip('gsp', 'getServerSideProps', "export async function getServerSideProps(context) {\n  $0\n  return { props: {} };\n}"),
    snip('gstp', 'getStaticProps', "export async function getStaticProps() {\n  $0\n  return { props: {} };\n}"),
    snip('api', 'API route handler', "export default function handler(req, res) {\n  $0\n  res.status(200).json({ });\n}"),
    // Testing
    snip('desc', 'describe block', "describe('${1:description}', () => {\n  $0\n});"),
    snip('it', 'it block', "it('${1:should}', () => {\n  $0\n});"),
    snip('test', 'test block', "test('${1:description}', () => {\n  $0\n});"),
    snip('exp', 'expect', "expect($1).${2:toBe}($3);"),
  ];

  // ── HTML snippets ──────────────────────────────────────────────────────
  const htmlSnippets: Monaco.languages.CompletionItem[] = [
    snip('!', 'HTML5 boilerplate', "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>"),
    snip('div', 'Div', "<div class=\"$1\">\n  $0\n</div>"),
    snip('section', 'Section', "<section class=\"$1\">\n  $0\n</section>"),
    snip('a', 'Anchor', "<a href=\"$1\">$0</a>"),
    snip('img', 'Image', "<img src=\"$1\" alt=\"$2\" />"),
    snip('input', 'Input', "<input type=\"${1:text}\" name=\"$2\" id=\"$3\" />"),
    snip('btn', 'Button', "<button type=\"${1:button}\" class=\"$2\">$0</button>"),
    snip('form', 'Form', "<form action=\"$1\" method=\"${2:post}\">\n  $0\n</form>"),
    snip('ul', 'Unordered list', "<ul>\n  <li>$0</li>\n</ul>"),
    snip('link', 'Link stylesheet', "<link rel=\"stylesheet\" href=\"$1\" />"),
    snip('script', 'Script tag', "<script src=\"$1\"></script>"),
  ];

  // ── CSS snippets ───────────────────────────────────────────────────────
  const cssSnippets: Monaco.languages.CompletionItem[] = [
    snip('flex', 'Flexbox container', "display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};"),
    snip('grid', 'Grid container', "display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};"),
    snip('center', 'Center element', "display: flex;\njustify-content: center;\nalign-items: center;"),
    snip('abs', 'Absolute position', "position: absolute;\ntop: ${1:0};\nleft: ${2:0};"),
    snip('fixed', 'Fixed position', "position: fixed;\ntop: ${1:0};\nleft: ${2:0};\nwidth: 100%;\nz-index: ${3:100};"),
    snip('trans', 'Transition', "transition: ${1:all} ${2:0.3s} ${3:ease};"),
    snip('anim', 'Animation', "@keyframes ${1:name} {\n  from { $2 }\n  to { $3 }\n}\n\nanimation: ${1:name} ${4:1s} ${5:ease};"),
    snip('shadow', 'Box shadow', "box-shadow: ${1:0} ${2:2px} ${3:8px} ${4:rgba(0,0,0,0.1)};"),
    snip('media', 'Media query', "@media (max-width: ${1:768px}) {\n  $0\n}"),
    snip('var', 'CSS variable', "var(--${1:name})"),
    snip('clamp', 'Clamp', "clamp(${1:1rem}, ${2:2vw}, ${3:3rem})"),
  ];

  // ── Python snippets ────────────────────────────────────────────────────
  const pythonSnippets: Monaco.languages.CompletionItem[] = [
    snip('def', 'Function', "def ${1:name}(${2:params}):\n    $0"),
    snip('adef', 'Async function', "async def ${1:name}(${2:params}):\n    $0"),
    snip('cls', 'Class', "class ${1:Name}:\n    def __init__(self${2:, params}):\n        $0"),
    snip('if', 'If', "if ${1:condition}:\n    $0"),
    snip('ife', 'If-else', "if ${1:condition}:\n    $2\nelse:\n    $0"),
    snip('for', 'For loop', "for ${1:item} in ${2:iterable}:\n    $0"),
    snip('while', 'While loop', "while ${1:condition}:\n    $0"),
    snip('try', 'Try-except', "try:\n    $1\nexcept ${2:Exception} as ${3:e}:\n    $0"),
    snip('with', 'With statement', "with ${1:expression} as ${2:var}:\n    $0"),
    snip('lam', 'Lambda', "lambda ${1:x}: $0"),
    snip('comp', 'List comprehension', "[${1:x} for ${1:x} in ${2:iterable}${3: if condition}]"),
    snip('main', 'Main block', "if __name__ == '__main__':\n    $0"),
    snip('imp', 'Import', "import ${1:module}"),
    snip('from', 'From import', "from ${1:module} import ${2:name}"),
  ];

  // ── Rust snippets ──────────────────────────────────────────────────────
  const rustSnippets: Monaco.languages.CompletionItem[] = [
    snip('fn', 'Function', "fn ${1:name}(${2:params}) -> ${3:()} {\n    $0\n}"),
    snip('pfn', 'Pub function', "pub fn ${1:name}(${2:params}) -> ${3:()} {\n    $0\n}"),
    snip('afn', 'Async function', "async fn ${1:name}(${2:params}) -> ${3:Result<()>} {\n    $0\n}"),
    snip('struct', 'Struct', "#[derive(Debug)]\nstruct ${1:Name} {\n    $0\n}"),
    snip('impl', 'Impl block', "impl ${1:Type} {\n    $0\n}"),
    snip('trait', 'Trait', "trait ${1:Name} {\n    $0\n}"),
    snip('enum', 'Enum', "#[derive(Debug)]\nenum ${1:Name} {\n    $0\n}"),
    snip('match', 'Match', "match ${1:value} {\n    $2 => $3,\n    _ => $0,\n}"),
    snip('if let', 'If let', "if let ${1:Some(val)} = ${2:option} {\n    $0\n}"),
    snip('test', 'Test function', "#[test]\nfn ${1:test_name}() {\n    $0\n}"),
    snip('println', 'Println', "println!(\"$1\", $2);"),
  ];

  // ── Go snippets ─────────────────────────────────────────────────────────
  const goSnippets: Monaco.languages.CompletionItem[] = [
    snip('func', 'Function', "func ${1:name}(${2:params}) ${3:error} {\n\t$0\n}"),
    snip('mfunc', 'Method', "func (${1:r} *${2:Type}) ${3:Name}(${4:params}) ${5:error} {\n\t$0\n}"),
    snip('main', 'Main function', "func main() {\n\t$0\n}"),
    snip('if', 'If statement', "if ${1:condition} {\n\t$0\n}"),
    snip('ife', 'If-else', "if ${1:condition} {\n\t$2\n} else {\n\t$0\n}"),
    snip('iferr', 'If error', "if err != nil {\n\t${1:return err}\n}"),
    snip('for', 'For loop', "for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t$0\n}"),
    snip('forr', 'For range', "for ${1:i}, ${2:v} := range ${3:slice} {\n\t$0\n}"),
    snip('switch', 'Switch', "switch ${1:v} {\ncase ${2:val}:\n\t$3\ndefault:\n\t$0\n}"),
    snip('struct', 'Struct', "type ${1:Name} struct {\n\t$0\n}"),
    snip('interface', 'Interface', "type ${1:Name} interface {\n\t$0\n}"),
    snip('map', 'Map', "map[${1:string}]${2:interface{}}"),
    snip('make', 'Make slice', "make([]${1:type}, ${2:0}, ${3:cap})"),
    snip('chan', 'Channel', "make(chan ${1:type}, ${2:1})"),
    snip('go', 'Goroutine', "go func() {\n\t$0\n}()"),
    snip('defer', 'Defer', "defer ${1:func}()"),
    snip('select', 'Select', "select {\ncase ${1:v} := <-${2:ch}:\n\t$3\ndefault:\n\t$0\n}"),
    snip('test', 'Test function', "func Test${1:Name}(t *testing.T) {\n\t$0\n}"),
    snip('bench', 'Benchmark', "func Benchmark${1:Name}(b *testing.B) {\n\tfor i := 0; i < b.N; i++ {\n\t\t$0\n\t}\n}"),
    snip('http', 'HTTP handler', "func ${1:handler}(w http.ResponseWriter, r *http.Request) {\n\t$0\n}"),
  ];

  // ── Java snippets ──────────────────────────────────────────────────────
  const javaSnippets: Monaco.languages.CompletionItem[] = [
    snip('main', 'Main method', "public static void main(String[] args) {\n\t$0\n}"),
    snip('sout', 'System.out.println', "System.out.println($1);"),
    snip('serr', 'System.err.println', "System.err.println($1);"),
    snip('class', 'Class', "public class ${1:Name} {\n\t$0\n}"),
    snip('interface', 'Interface', "public interface ${1:Name} {\n\t$0\n}"),
    snip('method', 'Method', "public ${1:void} ${2:name}(${3:params}) {\n\t$0\n}"),
    snip('pmethod', 'Private method', "private ${1:void} ${2:name}(${3:params}) {\n\t$0\n}"),
    snip('for', 'For loop', "for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}"),
    snip('fore', 'For-each', "for (${1:Type} ${2:item} : ${3:collection}) {\n\t$0\n}"),
    snip('while', 'While loop', "while (${1:condition}) {\n\t$0\n}"),
    snip('if', 'If statement', "if (${1:condition}) {\n\t$0\n}"),
    snip('ife', 'If-else', "if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}"),
    snip('try', 'Try-catch', "try {\n\t$1\n} catch (${2:Exception} ${3:e}) {\n\t$0\n}"),
    snip('tryf', 'Try-finally', "try {\n\t$1\n} finally {\n\t$0\n}"),
    snip('switch', 'Switch', "switch (${1:var}) {\n\tcase ${2:value}:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$0\n}"),
    snip('singleton', 'Singleton', "private static ${1:Name} instance;\n\nprivate ${1:Name}() {}\n\npublic static ${1:Name} getInstance() {\n\tif (instance == null) {\n\t\tinstance = new ${1:Name}();\n\t}\n\treturn instance;\n}"),
    snip('test', 'JUnit test', "@Test\npublic void ${1:testName}() {\n\t$0\n}"),
    snip('getter', 'Getter', "public ${1:Type} get${2:Name}() {\n\treturn this.${3:field};\n}"),
    snip('setter', 'Setter', "public void set${1:Name}(${2:Type} ${3:value}) {\n\tthis.${4:field} = ${3:value};\n}"),
  ];

  // ── C/C++ snippets ─────────────────────────────────────────────────────
  const cppSnippets: Monaco.languages.CompletionItem[] = [
    snip('main', 'Main function', "int main(int argc, char *argv[]) {\n\t$0\n\treturn 0;\n}"),
    snip('inc', 'Include', "#include <${1:iostream}>"),
    snip('incs', 'Include string', "#include \"${1:header}.h\""),
    snip('ifndef', 'Header guard', "#ifndef ${1:HEADER}_H\n#define ${1:HEADER}_H\n\n$0\n\n#endif // ${1:HEADER}_H"),
    snip('class', 'Class', "class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~${1:Name}();\n\nprivate:\n\t$0\n};"),
    snip('struct', 'Struct', "struct ${1:Name} {\n\t$0\n};"),
    snip('for', 'For loop', "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}"),
    snip('fore', 'Range-based for', "for (auto& ${1:item} : ${2:container}) {\n\t$0\n}"),
    snip('while', 'While loop', "while (${1:condition}) {\n\t$0\n}"),
    snip('if', 'If statement', "if (${1:condition}) {\n\t$0\n}"),
    snip('ife', 'If-else', "if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}"),
    snip('switch', 'Switch', "switch (${1:var}) {\n\tcase ${2:val}:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$0\n}"),
    snip('try', 'Try-catch', "try {\n\t$1\n} catch (const ${2:std::exception}& ${3:e}) {\n\t$0\n}"),
    snip('cout', 'cout', "std::cout << $1 << std::endl;"),
    snip('cerr', 'cerr', "std::cerr << $1 << std::endl;"),
    snip('vec', 'Vector', "std::vector<${1:int}> ${2:v};"),
    snip('map', 'Map', "std::map<${1:string}, ${2:int}> ${3:m};"),
    snip('up', 'Unique pointer', "std::unique_ptr<${1:Type}> ${2:p} = std::make_unique<${1:Type}>($3);"),
    snip('sp', 'Shared pointer', "std::shared_ptr<${1:Type}> ${2:p} = std::make_shared<${1:Type}>($3);"),
    snip('lam', 'Lambda', "[${1:&}](${2:params}) {\n\t$0\n}"),
    snip('template', 'Template', "template <typename ${1:T}>\n$0"),
  ];

  // ── PHP snippets ───────────────────────────────────────────────────────
  const phpSnippets: Monaco.languages.CompletionItem[] = [
    snip('php', 'PHP tag', "<?php\n$0\n?>"),
    snip('class', 'Class', "class ${1:Name} {\n\tpublic function __construct($2) {\n\t\t$0\n\t}\n}"),
    snip('fn', 'Function', "function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}"),
    snip('pfn', 'Public method', "public function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}"),
    snip('prfn', 'Private method', "private function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}"),
    snip('if', 'If', "if (${1:condition}) {\n\t$0\n}"),
    snip('ife', 'If-else', "if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}"),
    snip('for', 'For loop', "for (\\$${1:i} = 0; \\$${1:i} < ${2:count}; \\$${1:i}++) {\n\t$0\n}"),
    snip('foreach', 'Foreach', "foreach (\\$${1:array} as \\$${2:key} => \\$${3:value}) {\n\t$0\n}"),
    snip('try', 'Try-catch', "try {\n\t$1\n} catch (${2:Exception} \\$${3:e}) {\n\t$0\n}"),
    snip('echo', 'Echo', "echo ${1:''};"),
    snip('match', 'Match', "match(${1:value}) {\n\t${2:pattern} => ${3:result},\n\tdefault => $0,\n};"),
    snip('arr', 'Array', "\\$${1:arr} = [$0];"),
    snip('route', 'Laravel route', "Route::${1:get}('/${2:path}', [${3:Controller}::class, '${4:method}']);"),
  ];

  // ── Ruby snippets ──────────────────────────────────────────────────────
  const rubySnippets: Monaco.languages.CompletionItem[] = [
    snip('def', 'Method', "def ${1:name}(${2:params})\n  $0\nend"),
    snip('class', 'Class', "class ${1:Name}\n  def initialize(${2:params})\n    $0\n  end\nend"),
    snip('module', 'Module', "module ${1:Name}\n  $0\nend"),
    snip('if', 'If', "if ${1:condition}\n  $0\nend"),
    snip('ife', 'If-else', "if ${1:condition}\n  $2\nelse\n  $0\nend"),
    snip('unless', 'Unless', "unless ${1:condition}\n  $0\nend"),
    snip('each', 'Each', "${1:collection}.each do |${2:item}|\n  $0\nend"),
    snip('map', 'Map', "${1:collection}.map do |${2:item}|\n  $0\nend"),
    snip('do', 'Do block', "do |${1:var}|\n  $0\nend"),
    snip('begin', 'Begin-rescue', "begin\n  $1\nrescue ${2:StandardError} => ${3:e}\n  $0\nend"),
    snip('attr', 'attr_accessor', "attr_accessor :${1:name}"),
    snip('init', 'Initialize', "def initialize(${1:params})\n  $0\nend"),
    snip('test', 'RSpec it', "it '${1:description}' do\n  $0\nend"),
    snip('desc', 'RSpec describe', "describe '${1:subject}' do\n  $0\nend"),
  ];

  // ── SQL snippets ───────────────────────────────────────────────────────
  const sqlSnippets: Monaco.languages.CompletionItem[] = [
    snip('sel', 'SELECT', "SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};"),
    snip('selj', 'SELECT JOIN', "SELECT ${1:columns}\nFROM ${2:table1} t1\nJOIN ${3:table2} t2 ON t1.${4:id} = t2.${5:id}\nWHERE ${6:condition};"),
    snip('ins', 'INSERT', "INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});"),
    snip('upd', 'UPDATE', "UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};"),
    snip('del', 'DELETE', "DELETE FROM ${1:table}\nWHERE ${2:condition};"),
    snip('crt', 'CREATE TABLE', "CREATE TABLE ${1:name} (\n\tid SERIAL PRIMARY KEY,\n\t${2:column} ${3:type} NOT NULL,\n\tcreated_at TIMESTAMP DEFAULT NOW()\n);"),
    snip('alt', 'ALTER TABLE', "ALTER TABLE ${1:table}\nADD COLUMN ${2:column} ${3:type};"),
    snip('idx', 'CREATE INDEX', "CREATE INDEX idx_${1:name}\nON ${2:table} (${3:column});"),
    snip('view', 'CREATE VIEW', "CREATE VIEW ${1:name} AS\nSELECT ${2:columns}\nFROM ${3:table}\nWHERE ${4:condition};"),
    snip('trx', 'Transaction', "BEGIN;\n\t$0\nCOMMIT;"),
    snip('case', 'CASE', "CASE\n\tWHEN ${1:condition} THEN ${2:result}\n\tELSE ${3:default}\nEND"),
    snip('cte', 'CTE', "WITH ${1:name} AS (\n\t${2:query}\n)\nSELECT * FROM ${1:name};"),
  ];

  // ── Shell/Bash snippets ────────────────────────────────────────────────
  const shellSnippets: Monaco.languages.CompletionItem[] = [
    snip('shebang', 'Shebang', "#!/bin/bash\nset -euo pipefail\n\n$0"),
    snip('fn', 'Function', "${1:name}() {\n\t$0\n}"),
    snip('if', 'If', "if [[ ${1:condition} ]]; then\n\t$0\nfi"),
    snip('ife', 'If-else', "if [[ ${1:condition} ]]; then\n\t$2\nelse\n\t$0\nfi"),
    snip('for', 'For loop', "for ${1:i} in ${2:items}; do\n\t$0\ndone"),
    snip('while', 'While loop', "while ${1:condition}; do\n\t$0\ndone"),
    snip('case', 'Case', "case \\$${1:var} in\n\t${2:pattern})\n\t\t$3\n\t\t;;\n\t*)\n\t\t$0\n\t\t;;\nesac"),
    snip('read', 'Read input', "read -p \"${1:prompt}: \" ${2:var}"),
    snip('arr', 'Array', "${1:arr}=(${2:items})"),
    snip('trap', 'Trap', "trap '${1:cleanup}' EXIT"),
    snip('getopts', 'Getopts', "while getopts \"${1:h}\" opt; do\n\tcase \\$opt in\n\t\th) echo \"Usage\"; exit 0;;\n\t\t*) exit 1;;\n\tesac\ndone"),
  ];

  // ── Kotlin snippets ────────────────────────────────────────────────────
  const kotlinSnippets: Monaco.languages.CompletionItem[] = [
    snip('fun', 'Function', "fun ${1:name}(${2:params}): ${3:Unit} {\n\t$0\n}"),
    snip('sfun', 'Suspend function', "suspend fun ${1:name}(${2:params}): ${3:Unit} {\n\t$0\n}"),
    snip('main', 'Main', "fun main(args: Array<String>) {\n\t$0\n}"),
    snip('class', 'Class', "class ${1:Name}(${2:params}) {\n\t$0\n}"),
    snip('dclass', 'Data class', "data class ${1:Name}(\n\tval ${2:field}: ${3:Type},\n)"),
    snip('object', 'Object', "object ${1:Name} {\n\t$0\n}"),
    snip('interface', 'Interface', "interface ${1:Name} {\n\t$0\n}"),
    snip('if', 'If', "if (${1:condition}) {\n\t$0\n}"),
    snip('when', 'When', "when (${1:value}) {\n\t${2:pattern} -> $3\n\telse -> $0\n}"),
    snip('for', 'For loop', "for (${1:item} in ${2:collection}) {\n\t$0\n}"),
    snip('try', 'Try-catch', "try {\n\t$1\n} catch (e: ${2:Exception}) {\n\t$0\n}"),
    snip('coroutine', 'Launch coroutine', "launch {\n\t$0\n}"),
    snip('flow', 'Flow', "flow {\n\temit($1)\n\t$0\n}"),
    snip('lazy', 'Lazy', "val ${1:name} by lazy {\n\t$0\n}"),
  ];

  // ── Swift snippets ─────────────────────────────────────────────────────
  const swiftSnippets: Monaco.languages.CompletionItem[] = [
    snip('func', 'Function', "func ${1:name}(${2:params}) -> ${3:Void} {\n\t$0\n}"),
    snip('class', 'Class', "class ${1:Name} {\n\tinit(${2:params}) {\n\t\t$0\n\t}\n}"),
    snip('struct', 'Struct', "struct ${1:Name} {\n\t$0\n}"),
    snip('enum', 'Enum', "enum ${1:Name} {\n\tcase $0\n}"),
    snip('protocol', 'Protocol', "protocol ${1:Name} {\n\t$0\n}"),
    snip('ext', 'Extension', "extension ${1:Type} {\n\t$0\n}"),
    snip('guard', 'Guard', "guard ${1:condition} else {\n\t$0\n\treturn\n}"),
    snip('if let', 'If let', "if let ${1:value} = ${2:optional} {\n\t$0\n}"),
    snip('switch', 'Switch', "switch ${1:value} {\ncase ${2:pattern}:\n\t$3\ndefault:\n\t$0\n}"),
    snip('for', 'For-in', "for ${1:item} in ${2:collection} {\n\t$0\n}"),
    snip('closure', 'Closure', "{ (${1:params}) -> ${2:Void} in\n\t$0\n}"),
    snip('async', 'Async function', "func ${1:name}(${2:params}) async throws -> ${3:Void} {\n\t$0\n}"),
    snip('task', 'Task', "Task {\n\t$0\n}"),
    snip('view', 'SwiftUI View', "struct ${1:Name}View: View {\n\tvar body: some View {\n\t\t$0\n\t}\n}"),
  ];

  // ── Dart snippets ──────────────────────────────────────────────────────
  const dartSnippets: Monaco.languages.CompletionItem[] = [
    snip('main', 'Main', "void main() {\n\t$0\n}"),
    snip('fn', 'Function', "${1:void} ${2:name}(${3:params}) {\n\t$0\n}"),
    snip('afn', 'Async function', "Future<${1:void}> ${2:name}(${3:params}) async {\n\t$0\n}"),
    snip('class', 'Class', "class ${1:Name} {\n\t${1:Name}(${2:params});\n\t$0\n}"),
    snip('stful', 'StatefulWidget', "class ${1:Name} extends StatefulWidget {\n\tconst ${1:Name}({super.key});\n\n\t@override\n\tState<${1:Name}> createState() => _${1:Name}State();\n}\n\nclass _${1:Name}State extends State<${1:Name}> {\n\t@override\n\tWidget build(BuildContext context) {\n\t\treturn $0;\n\t}\n}"),
    snip('stless', 'StatelessWidget', "class ${1:Name} extends StatelessWidget {\n\tconst ${1:Name}({super.key});\n\n\t@override\n\tWidget build(BuildContext context) {\n\t\treturn $0;\n\t}\n}"),
    snip('if', 'If', "if (${1:condition}) {\n\t$0\n}"),
    snip('for', 'For loop', "for (var ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n\t$0\n}"),
    snip('fore', 'For-in', "for (final ${1:item} in ${2:list}) {\n\t$0\n}"),
    snip('switch', 'Switch', "switch (${1:value}) {\n\tcase ${2:pattern}:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$0\n}"),
    snip('try', 'Try-catch', "try {\n\t$1\n} catch (${2:e}) {\n\t$0\n}"),
    snip('stream', 'Stream builder', "StreamBuilder<${1:Type}>(\n\tstream: ${2:stream},\n\tbuilder: (context, snapshot) {\n\t\t$0\n\t},\n)"),
    snip('future', 'FutureBuilder', "FutureBuilder<${1:Type}>(\n\tfuture: ${2:future},\n\tbuilder: (context, snapshot) {\n\t\t$0\n\t},\n)"),
  ];

  // Registrar providers
  registerProvider(monaco, ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'], jstsSnippets);
  registerProvider(monaco, ['html'], htmlSnippets);
  registerProvider(monaco, ['css', 'scss', 'less'], cssSnippets);
  registerProvider(monaco, ['python'], pythonSnippets);
  registerProvider(monaco, ['rust'], rustSnippets);
  registerProvider(monaco, ['go'], goSnippets);
  registerProvider(monaco, ['java'], javaSnippets);
  registerProvider(monaco, ['c', 'cpp', 'csharp'], cppSnippets);
  registerProvider(monaco, ['php'], phpSnippets);
  registerProvider(monaco, ['ruby'], rubySnippets);
  registerProvider(monaco, ['sql', 'mysql', 'pgsql'], sqlSnippets);
  registerProvider(monaco, ['shell', 'shellscript', 'bash'], shellSnippets);
  registerProvider(monaco, ['kotlin'], kotlinSnippets);
  registerProvider(monaco, ['swift'], swiftSnippets);
  registerProvider(monaco, ['dart'], dartSnippets);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function snip(prefix: string, label: string, body: string): any {
  return { prefix, label, body };
}

function registerProvider(
  monaco: typeof Monaco,
  languages: string[],
  snippets: any[]
) {
  for (const lang of languages) {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: Monaco.languages.CompletionItem[] = snippets.map(s => ({
          label: { label: s.prefix, description: s.label },
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: s.label,
          range,
        }));

        return { suggestions };
      },
      triggerCharacters: ['.', '<', '"', "'", '/', '@', '#'],
    });
  }
}

// ── Keywords & Built-ins ─────────────────────────────────────────────────────

function registerKeywords(monaco: typeof Monaco, languages: string[], keywords: string[], builtins: string[]) {
  for (const lang of languages) {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywordSuggestions: Monaco.languages.CompletionItem[] = keywords.map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
          sortText: '1_' + kw,
        }));

        const builtinSuggestions: Monaco.languages.CompletionItem[] = builtins.map(b => ({
          label: b,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: b,
          range,
          sortText: '2_' + b,
        }));

        // Extract all unique words from the document (variables, functions, etc.)
        const text = model.getValue();
        const wordPattern = /\b[a-zA-Z_]\w{2,}\b/g;
        const docWords = new Set<string>();
        let match;
        while ((match = wordPattern.exec(text)) !== null) {
          docWords.add(match[0]);
        }
        // Remove keywords and builtins from doc words (avoid duplicates)
        const allKnown = new Set([...keywords, ...builtins]);
        const currentWord = word.word.toLowerCase();
        const docSuggestions: Monaco.languages.CompletionItem[] = [...docWords]
          .filter(w => !allKnown.has(w) && w.toLowerCase() !== currentWord)
          .map(w => ({
            label: w,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: w,
            range,
            sortText: '0_' + w, // Higher priority than keywords
          }));

        return { suggestions: [...docSuggestions, ...keywordSuggestions, ...builtinSuggestions] };
      },
    });
  }
}

// ── Register keywords for all languages ──────────────────────────────────────

export function registerLanguageKeywords(monaco: typeof Monaco) {
  // Python
  registerKeywords(monaco, ['python'], [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield', 'self', 'super',
  ], [
    'print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict',
    'set', 'tuple', 'bool', 'type', 'isinstance', 'issubclass',
    'input', 'open', 'enumerate', 'zip', 'map', 'filter', 'sorted',
    'reversed', 'min', 'max', 'sum', 'abs', 'round', 'any', 'all',
    'hasattr', 'getattr', 'setattr', 'delattr', 'callable', 'staticmethod',
    'classmethod', 'property', 'super', 'object', 'Exception',
    'ValueError', 'TypeError', 'KeyError', 'IndexError', 'AttributeError',
    'RuntimeError', 'StopIteration', 'FileNotFoundError', 'IOError',
  ]);

  // Rust
  registerKeywords(monaco, ['rust'], [
    'as', 'async', 'await', 'break', 'const', 'continue', 'crate',
    'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if',
    'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut',
    'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
    'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
    'yield', 'macro_rules',
  ], [
    'Vec', 'String', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err',
    'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'Mutex', 'HashMap', 'HashSet',
    'BTreeMap', 'BTreeSet', 'VecDeque', 'LinkedList',
    'println', 'eprintln', 'format', 'panic', 'assert', 'assert_eq',
    'assert_ne', 'debug_assert', 'todo', 'unimplemented', 'unreachable',
    'clone', 'to_string', 'into', 'from', 'unwrap', 'expect',
    'unwrap_or', 'unwrap_or_else', 'map', 'and_then', 'or_else',
    'is_some', 'is_none', 'is_ok', 'is_err', 'iter', 'into_iter',
    'collect', 'filter', 'map', 'fold', 'for_each',
  ]);

  // C#
  registerKeywords(monaco, ['csharp'], [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch',
    'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default',
    'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit',
    'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach',
    'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal',
    'is', 'lock', 'long', 'namespace', 'new', 'null', 'object',
    'operator', 'out', 'override', 'params', 'private', 'protected',
    'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short',
    'sizeof', 'static', 'string', 'struct', 'switch', 'this', 'throw',
    'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe',
    'ushort', 'using', 'var', 'virtual', 'void', 'volatile', 'while',
    'async', 'await', 'yield', 'record', 'init', 'required', 'global',
  ], [
    'Console', 'Math', 'String', 'Int32', 'Int64', 'Double', 'Boolean',
    'List', 'Dictionary', 'HashSet', 'Queue', 'Stack', 'Array',
    'Task', 'Func', 'Action', 'IEnumerable', 'IDisposable',
    'Exception', 'ArgumentException', 'NullReferenceException',
    'InvalidOperationException', 'NotImplementedException',
    'WriteLine', 'ReadLine', 'ToString', 'Parse', 'TryParse',
    'Add', 'Remove', 'Contains', 'Count', 'Length', 'Where',
    'Select', 'FirstOrDefault', 'Any', 'All', 'OrderBy', 'GroupBy',
    'ToList', 'ToArray', 'ToDictionary',
    'Enumerable', 'Linq', 'Threading', 'Tasks', 'Collections', 'Generic',
  ]);

  // Go
  registerKeywords(monaco, ['go'], [
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer',
    'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if',
    'import', 'interface', 'map', 'package', 'range', 'return',
    'select', 'struct', 'switch', 'type', 'var', 'nil', 'true', 'false',
    'iota', 'append', 'cap', 'close', 'copy', 'delete', 'len', 'make', 'new',
  ], [
    'fmt', 'Println', 'Printf', 'Sprintf', 'Errorf',
    'errors', 'New', 'Is', 'As', 'Unwrap',
    'context', 'Background', 'WithCancel', 'WithTimeout',
    'sync', 'Mutex', 'RWMutex', 'WaitGroup', 'Once',
    'http', 'HandleFunc', 'ListenAndServe', 'Get', 'Post',
    'json', 'Marshal', 'Unmarshal', 'NewDecoder', 'NewEncoder',
    'os', 'Open', 'Create', 'ReadFile', 'WriteFile',
    'strings', 'Contains', 'HasPrefix', 'HasSuffix', 'Split', 'Join', 'Replace',
    'strconv', 'Itoa', 'Atoi', 'ParseInt', 'FormatInt',
    'time', 'Now', 'Sleep', 'Duration', 'After', 'Tick',
  ]);

  // Java
  registerKeywords(monaco, ['java'], [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
    'char', 'class', 'const', 'continue', 'default', 'do', 'double',
    'else', 'enum', 'extends', 'final', 'finally', 'float', 'for',
    'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'null', 'package', 'private',
    'protected', 'public', 'return', 'short', 'static', 'strictfp',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while', 'var', 'record',
    'sealed', 'permits', 'yield', 'true', 'false',
  ], [
    'System', 'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean',
    'Object', 'Class', 'Math', 'Arrays', 'Collections',
    'List', 'ArrayList', 'LinkedList', 'Map', 'HashMap', 'TreeMap',
    'Set', 'HashSet', 'TreeSet', 'Queue', 'Stack', 'Deque',
    'Optional', 'Stream', 'Collectors',
    'Thread', 'Runnable', 'Callable', 'Future', 'CompletableFuture',
    'Exception', 'RuntimeException', 'IOException', 'NullPointerException',
    'Override', 'Deprecated', 'SuppressWarnings', 'FunctionalInterface',
    'println', 'printf', 'format', 'valueOf', 'parseInt', 'toString',
    'equals', 'hashCode', 'compareTo', 'iterator', 'size', 'isEmpty',
    'add', 'remove', 'contains', 'get', 'put', 'keySet', 'values',
  ]);

  // PHP
  registerKeywords(monaco, ['php'], [
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case',
    'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default',
    'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor',
    'endforeach', 'endif', 'endswitch', 'endwhile', 'enum', 'extends',
    'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global',
    'if', 'implements', 'include', 'instanceof', 'interface', 'isset',
    'list', 'match', 'namespace', 'new', 'null', 'or', 'print',
    'private', 'protected', 'public', 'readonly', 'require', 'return',
    'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use',
    'var', 'while', 'yield', 'true', 'false', 'self', 'parent',
  ], [
    'array_map', 'array_filter', 'array_reduce', 'array_merge',
    'array_push', 'array_pop', 'array_shift', 'array_unshift',
    'array_keys', 'array_values', 'array_slice', 'array_splice',
    'count', 'strlen', 'strpos', 'substr', 'str_replace', 'explode',
    'implode', 'trim', 'strtolower', 'strtoupper', 'sprintf', 'printf',
    'json_encode', 'json_decode', 'file_get_contents', 'file_put_contents',
    'preg_match', 'preg_replace', 'in_array', 'is_array', 'is_string',
    'is_null', 'is_numeric', 'intval', 'floatval', 'var_dump', 'print_r',
    'die', 'exit', 'header', 'session_start', 'setcookie',
  ]);

  // C/C++
  registerKeywords(monaco, ['c', 'cpp'], [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default',
    'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto',
    'if', 'int', 'long', 'register', 'return', 'short', 'signed',
    'sizeof', 'static', 'struct', 'switch', 'typedef', 'union',
    'unsigned', 'void', 'volatile', 'while',
    // C++ extras
    'alignas', 'alignof', 'and', 'asm', 'bool', 'catch', 'class',
    'constexpr', 'const_cast', 'decltype', 'delete', 'dynamic_cast',
    'explicit', 'export', 'false', 'friend', 'inline', 'mutable',
    'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'or',
    'override', 'private', 'protected', 'public', 'reinterpret_cast',
    'static_assert', 'static_cast', 'template', 'this', 'throw',
    'true', 'try', 'typeid', 'typename', 'using', 'virtual',
    'co_await', 'co_return', 'co_yield', 'concept', 'requires',
  ], [
    'std', 'cout', 'cin', 'cerr', 'endl', 'string', 'vector', 'map',
    'set', 'unordered_map', 'unordered_set', 'pair', 'tuple',
    'array', 'deque', 'list', 'queue', 'stack', 'priority_queue',
    'unique_ptr', 'shared_ptr', 'weak_ptr', 'make_unique', 'make_shared',
    'move', 'forward', 'swap', 'sort', 'find', 'count', 'accumulate',
    'transform', 'for_each', 'begin', 'end', 'size', 'empty',
    'push_back', 'pop_back', 'front', 'back', 'insert', 'erase',
    'emplace', 'emplace_back', 'reserve', 'resize', 'clear',
    'printf', 'scanf', 'malloc', 'free', 'memcpy', 'memset', 'strlen',
    'NULL', 'EOF', 'stdin', 'stdout', 'stderr',
  ]);

  // Ruby
  registerKeywords(monaco, ['ruby'], [
    'BEGIN', 'END', 'alias', 'and', 'begin', 'break', 'case', 'class',
    'def', 'defined?', 'do', 'else', 'elsif', 'end', 'ensure', 'false',
    'for', 'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo',
    'rescue', 'retry', 'return', 'self', 'super', 'then', 'true',
    'undef', 'unless', 'until', 'when', 'while', 'yield',
    'require', 'require_relative', 'include', 'extend', 'prepend',
    'attr_accessor', 'attr_reader', 'attr_writer', 'private', 'protected', 'public',
  ], [
    'puts', 'print', 'p', 'gets', 'chomp', 'to_s', 'to_i', 'to_f',
    'length', 'size', 'each', 'map', 'select', 'reject', 'reduce',
    'inject', 'collect', 'find', 'detect', 'any?', 'all?', 'none?',
    'include?', 'empty?', 'nil?', 'is_a?', 'respond_to?',
    'new', 'initialize', 'freeze', 'frozen?', 'dup', 'clone',
    'raise', 'rescue', 'Integer', 'Float', 'String', 'Array', 'Hash',
    'Proc', 'Lambda', 'Block', 'Enumerable', 'Comparable',
  ]);

  // Kotlin
  registerKeywords(monaco, ['kotlin'], [
    'abstract', 'actual', 'annotation', 'as', 'break', 'by', 'catch',
    'class', 'companion', 'const', 'constructor', 'continue', 'crossinline',
    'data', 'delegate', 'do', 'else', 'enum', 'expect', 'external',
    'false', 'final', 'finally', 'for', 'fun', 'get', 'if', 'import',
    'in', 'infix', 'init', 'inline', 'inner', 'interface', 'internal',
    'is', 'it', 'lateinit', 'lazy', 'noinline', 'null', 'object',
    'open', 'operator', 'out', 'override', 'package', 'private',
    'protected', 'public', 'reified', 'return', 'sealed', 'set',
    'super', 'suspend', 'this', 'throw', 'true', 'try', 'typealias',
    'typeof', 'val', 'var', 'vararg', 'when', 'where', 'while',
  ], [
    'println', 'print', 'readLine', 'listOf', 'mutableListOf',
    'mapOf', 'mutableMapOf', 'setOf', 'mutableSetOf',
    'arrayOf', 'intArrayOf', 'arrayListOf',
    'to', 'Pair', 'Triple', 'also', 'apply', 'let', 'run', 'with',
    'takeIf', 'takeUnless', 'repeat', 'require', 'check',
    'launch', 'async', 'runBlocking', 'coroutineScope', 'withContext',
    'Dispatchers', 'IO', 'Main', 'Default', 'flow', 'collect', 'emit',
    'String', 'Int', 'Long', 'Double', 'Float', 'Boolean', 'Unit', 'Any',
  ]);

  // Swift
  registerKeywords(monaco, ['swift'], [
    'associatedtype', 'break', 'case', 'catch', 'class', 'continue',
    'default', 'defer', 'deinit', 'do', 'else', 'enum', 'extension',
    'fallthrough', 'false', 'fileprivate', 'for', 'func', 'guard',
    'if', 'import', 'in', 'init', 'inout', 'internal', 'is', 'let',
    'nil', 'open', 'operator', 'private', 'protocol', 'public',
    'repeat', 'rethrows', 'return', 'self', 'Self', 'static', 'struct',
    'subscript', 'super', 'switch', 'throw', 'throws', 'true', 'try',
    'typealias', 'var', 'where', 'while', 'async', 'await', 'actor',
  ], [
    'print', 'String', 'Int', 'Double', 'Float', 'Bool', 'Array',
    'Dictionary', 'Set', 'Optional', 'Any', 'AnyObject',
    'map', 'filter', 'reduce', 'flatMap', 'compactMap', 'forEach',
    'sorted', 'reversed', 'contains', 'count', 'isEmpty', 'first', 'last',
    'append', 'insert', 'remove', 'removeAll',
    'DispatchQueue', 'main', 'global', 'async', 'Task', 'TaskGroup',
    'URLSession', 'shared', 'data', 'upload', 'download',
    'Codable', 'Encodable', 'Decodable', 'JSONEncoder', 'JSONDecoder',
    'View', 'body', 'some', 'Text', 'Button', 'NavigationView', 'List',
  ]);

  // Dart
  registerKeywords(monaco, ['dart'], [
    'abstract', 'as', 'assert', 'async', 'await', 'break', 'case',
    'catch', 'class', 'const', 'continue', 'covariant', 'default',
    'deferred', 'do', 'dynamic', 'else', 'enum', 'export', 'extends',
    'extension', 'external', 'factory', 'false', 'final', 'finally',
    'for', 'Function', 'get', 'hide', 'if', 'implements', 'import',
    'in', 'interface', 'is', 'late', 'library', 'mixin', 'new', 'null',
    'on', 'operator', 'part', 'required', 'rethrow', 'return', 'sealed',
    'set', 'show', 'static', 'super', 'switch', 'sync', 'this', 'throw',
    'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield',
  ], [
    'print', 'int', 'double', 'String', 'bool', 'List', 'Map', 'Set',
    'Future', 'Stream', 'Iterable', 'Iterator', 'Duration', 'DateTime',
    'num', 'Object', 'dynamic', 'Never', 'Null', 'Type',
    'setState', 'initState', 'dispose', 'build', 'context',
    'Widget', 'StatelessWidget', 'StatefulWidget', 'State',
    'Container', 'Column', 'Row', 'Stack', 'Scaffold', 'AppBar',
    'Text', 'Icon', 'Image', 'ListView', 'GridView', 'Navigator',
    'MaterialApp', 'ThemeData', 'Colors', 'EdgeInsets', 'Padding',
    'Center', 'Expanded', 'Flexible', 'SizedBox', 'GestureDetector',
  ]);

  // SQL
  registerKeywords(monaco, ['sql', 'mysql', 'pgsql'], [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
    'LIKE', 'IS', 'NULL', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
    'OUTER', 'FULL', 'CROSS', 'UNION', 'ALL', 'DISTINCT', 'ORDER', 'BY',
    'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO',
    'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
    'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'DATABASE',
    'IF', 'EXISTS', 'NOT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'SERIAL',
    'INT', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP',
    'FLOAT', 'DOUBLE', 'DECIMAL', 'BLOB', 'JSON', 'JSONB', 'UUID',
    'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'CASCADE', 'RESTRICT',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'CAST', 'CONVERT', 'WITH', 'RECURSIVE',
  ], []);

  // Shell/Bash
  registerKeywords(monaco, ['shell', 'shellscript', 'bash'], [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while',
    'until', 'case', 'esac', 'in', 'function', 'return', 'local',
    'export', 'readonly', 'declare', 'typeset', 'unset', 'shift',
    'break', 'continue', 'exit', 'source', 'eval', 'exec', 'trap',
    'set', 'true', 'false',
  ], [
    'echo', 'printf', 'read', 'cat', 'grep', 'sed', 'awk', 'cut',
    'sort', 'uniq', 'wc', 'head', 'tail', 'find', 'xargs', 'tee',
    'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'ln', 'chmod', 'chown',
    'ls', 'pwd', 'cd', 'pushd', 'popd', 'basename', 'dirname',
    'curl', 'wget', 'ssh', 'scp', 'tar', 'gzip', 'gunzip', 'zip',
    'git', 'docker', 'npm', 'node', 'python', 'pip',
    'test', 'expr', 'let', 'seq', 'date', 'sleep', 'kill', 'ps', 'top',
  ]);
}
