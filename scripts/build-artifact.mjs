// Builds the claude.ai artifact: one HTML file with the app's JS and CSS inlined.
// The Artifact publisher adds the <!doctype>/<html>/<head>/<body> skeleton itself,
// so this writes only the page content: title, font link, styles, root and script.
import { execSync } from 'child_process'
import fs from 'fs'

execSync('npx vite build --mode artifact', { stdio: 'inherit' })
const html = fs.readFileSync('dist-artifact/index.html', 'utf8')

const title = html.match(/<title>[\s\S]*?<\/title>/)[0].replace(/<title>[\s\S]*?<\/title>/, '<title>צמחייה</title>')
const fonts = [...html.matchAll(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g)].map(m => m[0])
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m => m[0])
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map(m => m[0])

const page = [
  title,
  '<meta name="theme-color" content="#d9f7ec">',
  ...fonts,
  // RTL Hebrew app; the skeleton's <html> has no lang/dir, so set them before React renders.
  '<script>document.documentElement.lang="he";document.documentElement.dir="rtl"</script>',
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n')

fs.mkdirSync('claude-artifact', { recursive: true })
fs.writeFileSync('claude-artifact/index.html', page + '\n')
console.log(`claude-artifact/index.html: ${(page.length / 1024).toFixed(0)} KB`)
