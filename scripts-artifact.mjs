// dist-artifact/app.js + app.css 를 아티팩트 한 장짜리 HTML 로 합친다.
import { readFileSync, writeFileSync } from 'node:fs';
const js = readFileSync('dist-artifact/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync('dist-artifact/app.css', 'utf8');
const html = `<title>베이스볼 라이프</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="나만의 야구선수를 키워 드래프트부터 명예의 전당까지. 야구 커리어 시뮬레이션.">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
window.ReactJSXRuntime = (function (R) {
  function jsx(type, props, key) {
    return R.createElement(type, key === undefined ? props : Object.assign({}, props, { key: key }));
  }
  return { jsx: jsx, jsxs: jsx, Fragment: R.Fragment };
})(React);
</script>
<script>${js}</script>
`;
writeFileSync(process.argv[2] ?? 'dist-artifact/baseball-life.html', html);
console.log('bytes', html.length);
