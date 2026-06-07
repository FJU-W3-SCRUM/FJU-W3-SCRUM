const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'app', 'api');
function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full);
    } else if (name.isFile() && full.endsWith('.ts')) {
      let text = fs.readFileSync(full, 'utf8');
      let newText = text;
      newText = newText.replace(/catch \(e: any\)/g, 'catch (err: unknown)');
      newText = newText.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
      newText = newText.replace(/const body = await request\.json\(\);/g, 'const body = (await request.json()) as Record<string, unknown>;');
      newText = newText.replace(/const \{([^}]+)\} = await request\.json\(\);/g, 'const body = (await request.json()) as Record<string, unknown>;\n  const {$1} = body;');
      newText = newText.replace(/error: e\.message \|\| String\(e\)/g, 'error: err instanceof Error ? err.message : String(err)');
      newText = newText.replace(/error: e\.message/g, 'error: err instanceof Error ? err.message : String(err)');
      newText = newText.replace(/error: err\.message \|\| String\(err\)/g, 'error: err instanceof Error ? err.message : String(err)');
      newText = newText.replace(/error: err\.message/g, 'error: err instanceof Error ? err.message : String(err)');
      if (newText !== text) {
        fs.writeFileSync(full, newText, 'utf8');
      }
    }
  }
}
walk(root);
console.log('API type patch complete');
