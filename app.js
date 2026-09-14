const DRAFT_KEY = 'polygon-editor-draft';
const SAVES_KEY = 'polygon-editor-saves';

// 초기 문제를 깔끔한 A+B 문제로 설정
const initial = {
  name: 'A. A+B Problem',
  time: '1.0 second',
  memory: '256 megabytes',
  legend: '두 정수 $a$와 $b$가 주어졌을 때, $a + b$의 값을 구하는 프로그램을 작성하세요.',
  input: '첫 번째 줄에 두 정수 $a$와 $b$ ($1 \\le a, b \\le 10^9$)가 공백으로 구분되어 주어집니다.',
  output: '$a + b$의 결과를 출력합니다.',
  interaction: '',
  notes: '첫 번째 예제에서 $1 + 2 = 3$입니다.',
  examples: [
    { input: '1 2', output: '3' },
    { input: '5 7', output: '12' }
  ]
};

const labels = { legend: 'Legend', input: 'Input', output: 'Output', interaction: 'Interaction', notes: 'Note' };

function getSaves() { try { const x = localStorage.getItem(SAVES_KEY); return x ? JSON.parse(x) : {}; } catch (e) { return {}; } }
function setSaves(s) { localStorage.setItem(SAVES_KEY, JSON.stringify(s)); }
function loadDraft() { try { const x = localStorage.getItem(DRAFT_KEY); return x ? JSON.parse(x) : null; } catch (e) { return null; } }
function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {} }

function toBase64(obj) {
  const str = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function loadSharedData() {
  let hash = window.location.hash;
  if (!hash && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) hash = '#share=' + params.get('share');
  }
  if (hash.startsWith('#share=')) {
    try {
      const encoded = hash.substring(7);
      const parsed = fromBase64(encoded);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.error('Failed to parse share link:', e);
    }
  }
  return null;
}

let data = loadSharedData() || loadDraft() || structuredClone(initial);

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseLatexContent(text) {
  if (!text) return '';
  let s = String(text);

  const mathBlocks = [];
  const renderMath = (mathCode, display) => {
    const placeholder = `___MATH_BLOCK_${mathBlocks.length}___`;
    try {
      if (window.katex) {
        const html = katex.renderToString(mathCode.trim(), { displayMode: display, throwOnError: false });
        mathBlocks.push(html);
      } else {
        mathBlocks.push(`<code>${escapeHTML(mathCode)}</code>`);
      }
    } catch (e) {
      mathBlocks.push(`<span class="latex-error">${escapeHTML(mathCode)}</span>`);
    }
    return placeholder;
  };

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => renderMath(m, true));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => renderMath(m, true));
  s = s.replace(/\\begin\{(equation|align|eqnarray)\*?\}([\s\S]+?)\\end\{\1\*?\}/g, (_, env, m) => renderMath(`\\begin{${env}}${m}\\end{${env}}`, true));
  s = s.replace(/\$([^\$\n]+?)\$/g, (_, m) => renderMath(m, false));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => renderMath(m, false));

  s = escapeHTML(s);

  const parseList = (content, tagClass) => {
    const rawItems = content.split(/\\item\s*/);
    const items = rawItems.filter(item => item.trim().length > 0);
    const listItemsHTML = items.map(item => `<li>${item.trim()}</li>`).join('');
    return `<${tagClass} class="cf-list">${listItemsHTML}</${tagClass}>`;
  };

  s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => parseList(content, 'ul'));
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => parseList(content, 'ol'));

  s = s.replace(/\\textbf\{([\s\S]*?)\}/g, '<strong>$1</strong>');
  s = s.replace(/\\texttt\{([\s\S]*?)\}/g, '<code class="tt-text">$1</code>');
  s = s.replace(/\\textit\{([\s\S]*?)\}/g, '<em>$1</em>');
  s = s.replace(/\\underline\{([\s\S]*?)\}/g, '<u>$1</u>');
  s = s.replace(/`([^`]+)`/g, '<code class="tt-text">$1</code>');

  s = s.replace(/\\\\/g, '<br>');
  s = s.replace(/\n\s*\n/g, '<div class="paragraph-gap"></div>');
  s = s.replace(/\n/g, ' ');

  s = s.replace(/___MATH_BLOCK_(\d+)___/g, (_, idx) => mathBlocks[parseInt(idx, 10)]);

  return s;
}

function sectionHTML(title, text) {
  return text ? `<section class="cf-section"><h2>${title}</h2><div class="section-content">${parseLatexContent(text)}</div></section>` : '';
}

function renderPreview() {
  const p = document.getElementById('preview');
  let html = `<div class="statement-title"><b>${escapeHTML(data.name)}</b></div><div class="limits"><span>time limit per test</span> ${escapeHTML(data.time)} <span>memory limit per test</span> ${escapeHTML(data.memory)}</div>`;
  for (const k of ['legend', 'input', 'output', 'interaction']) html += sectionHTML(labels[k], data[k]);
  if (data.examples?.length) {
    html += `<section class="cf-section"><h2>Examples</h2><div class="samples">${data.examples.map(e => `<div class="sample"><div class="sample-label">Input</div><pre>${escapeHTML(e.input)}</pre><div class="sample-label">Output</div><pre>${escapeHTML(e.output)}</pre></div>`).join('')}</div></section>`;
  }
  html += sectionHTML('Note', data.notes);
  p.innerHTML = html;
}

function renderEditor() {
  document.getElementById('name').value = data.name || '';
  document.getElementById('time').value = data.time || '';
  document.getElementById('memory').value = data.memory || '';
  const container = document.getElementById('sections');
  container.innerHTML = '';
  for (const k of ['legend', 'input', 'output', 'interaction', 'notes']) {
    const row = document.createElement('div');
    row.className = 'form-row';
    row.innerHTML = `<label>${labels[k]}</label><textarea spellcheck="false" data-key="${k}" placeholder="Write ${labels[k].toLowerCase()} here..."></textarea>`;
    row.querySelector('textarea').value = data[k] || '';
    container.appendChild(row);
  }
  const ex = document.getElementById('examples');
  ex.innerHTML = '';
  (data.examples || []).forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'example-edit';
    row.innerHTML = `<span>Example ${i + 1}</span><textarea spellcheck="false" placeholder="Input">${escapeHTML(e.input)}</textarea><textarea spellcheck="false" placeholder="Output">${escapeHTML(e.output)}</textarea><button class="remove-example">Remove</button>`;
    const ts = row.querySelectorAll('textarea');
    ts[0].value = e.input;
    ts[1].value = e.output;
    ts[0].addEventListener('input', ev => { data.examples[i].input = ev.target.value; changed(); });
    ts[1].addEventListener('input', ev => { data.examples[i].output = ev.target.value; changed(); });
    row.querySelector('.remove-example').addEventListener('click', () => { data.examples.splice(i, 1); renderEditor(); renderPreview(); saveDraft(); });
    ex.appendChild(row);
  });
}

function changed() { saveDraft(); renderPreview(); }

['name', 'time', 'memory'].forEach(k => document.getElementById(k).addEventListener('input', e => { data[k] = e.target.value; changed(); }));

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('workspace').className = 'workspace ' + btn.dataset.mode;
}));

document.getElementById('sections').addEventListener('input', e => {
  if (e.target.dataset.key) { data[e.target.dataset.key] = e.target.value; changed(); }
});

document.getElementById('addExample').addEventListener('click', () => {
  if (!data.examples) data.examples = [];
  data.examples.push({ input: '', output: '' });
  renderEditor(); renderPreview(); saveDraft();
});

// 수정 및 강화된 Paste TeX 기능 (섹션 이탈 버그 방지)
document.getElementById('pasteTexBtn').addEventListener('click', () => {
  const raw = prompt('Polygon 문제 지문 전체(Legend ~ Note)를 붙여넣으세요:');
  if (!raw || !raw.trim()) return;

  const lines = raw.split(/\r?\n/);
  let curSection = 'legend';
  const secBuffers = { legend: [], input: [], output: [], interaction: [], examples: [], notes: [] };

  for (let line of lines) {
    const trimmed = line.trim();
    if (/^Legend$/i.test(trimmed)) { curSection = 'legend'; continue; }
    // 예제 섹션 진행 중일 때는 input/output 키워드에 의한 메인 섹션 재전환 방지
    if (curSection !== 'examples' && /^Input$/i.test(trimmed)) { curSection = 'input'; continue; }
    if (curSection !== 'examples' && /^Output$/i.test(trimmed)) { curSection = 'output'; continue; }
    if (curSection !== 'examples' && /^Interaction$/i.test(trimmed)) { curSection = 'interaction'; continue; }
    if (/^Examples?$/i.test(trimmed)) { curSection = 'examples'; continue; }
    if (/^Notes?$/i.test(trimmed)) { curSection = 'notes'; continue; }

    secBuffers[curSection].push(line);
  }

  data.legend = secBuffers.legend.join('\n').trim();
  data.input = secBuffers.input.join('\n').trim();
  data.output = secBuffers.output.join('\n').trim();
  data.interaction = secBuffers.interaction.join('\n').trim();
  data.notes = secBuffers.notes.join('\n').trim();

  const exRaw = secBuffers.examples.join('\n').trim();
  if (exRaw) {
    const exPairs = [];
    
    // 1. 일반 텍스트 붙여넣기 방식 (input ... output ...)
    const matches = [...exRaw.matchAll(/(?:input|Input)\s*\n([\s\S]*?)(?:output|Output)\s*\n([\s\S]*?)(?=(?:input|Input|$))/gi)];
    if (matches.length > 0) {
      matches.forEach(m => {
        exPairs.push({ input: m[1].trim(), output: m[2].trim() });
      });
    } else {
      // 2. LaTeX \ex{in}{out} 구문 방식
      const texMatches = [...exRaw.matchAll(/\\ex\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/g)];
      if (texMatches.length > 0) {
        texMatches.forEach(m => {
          exPairs.push({ input: m[1].trim(), output: m[2].trim() });
        });
      }
    }

    if (exPairs.length > 0) {
      data.examples = exPairs;
    }
  }

  saveDraft();
  renderEditor();
  renderPreview();
});

// Copy TeX 기능
document.getElementById('copyTexBtn')?.addEventListener('click', () => {
  const sections = [];

  if (data.legend && data.legend.trim()) sections.push(`Legend\n${data.legend.trim()}`);
  if (data.input && data.input.trim()) sections.push(`Input\n${data.input.trim()}`);
  if (data.output && data.output.trim()) sections.push(`Output\n${data.output.trim()}`);
  if (data.interaction && data.interaction.trim()) sections.push(`Interaction\n${data.interaction.trim()}`);
  if (data.examples && data.examples.length > 0) {
    let exStr = 'Examples\n';
    data.examples.forEach((ex) => {
      exStr += `input\n${ex.input.trim()}\noutput\n${ex.output.trim()}\n`;
    });
    sections.push(exStr.trim());
  }
  if (data.notes && data.notes.trim()) sections.push(`Note\n${data.notes.trim()}`);

  const fullTex = sections.join('\n\n');

  if (!fullTex) {
    alert('복사할 지문 내용이 없습니다.');
    return;
  }

  navigator.clipboard.writeText(fullTex).then(() => {
    const btn = document.getElementById('copyTexBtn');
    const oldText = btn.textContent;
    btn.textContent = 'Copied TeX!';
    setTimeout(() => btn.textContent = oldText, 1500);
  }).catch(() => {
    prompt('클립보드 자동 복사에 실패했습니다. 아래 텍스트를 복사하세요:', fullTex);
  });
});

document.getElementById('shareBtn').addEventListener('click', () => {
  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${toBase64(data)}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    const b = document.getElementById('shareBtn');
    const old = b.textContent;
    b.textContent = 'Copied!';
    setTimeout(() => b.textContent = old, 1500);
  }).catch(() => {
    prompt('공유 링크 URL입니다:', shareUrl);
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const saveName = prompt('저장할 이름을 입력하세요:', data.name || 'Untitled');
  if (saveName === null) return;
  const key = saveName.trim();
  if (!key) { alert('이름을 입력해야 합니다.'); return; }
  const saves = getSaves();
  if (saves[key] && !confirm(`"${key}" 이름으로 저장된 데이터가 이미 있습니다. 덮어씌우시겠습니까?`)) return;
  saves[key] = structuredClone(data);
  setSaves(saves);
  const b = document.getElementById('saveBtn');
  const old = b.textContent;
  b.textContent = 'Saved!';
  setTimeout(() => b.textContent = old, 1000);
});

document.getElementById('loadBtn').addEventListener('click', () => {
  const saves = getSaves();
  const keys = Object.keys(saves);
  if (keys.length === 0) { alert('저장된 데이터가 없습니다.'); return; }
  const listText = keys.map((k, i) => `${i + 1}. ${k}`).join('\n');
  const input = prompt(`불러올 데이터의 이름이나 번호를 입력하세요:\n\n[저장된 목록]\n${listText}`, keys[0]);
  if (input === null) return;
  const keyInput = input.trim();
  let targetKey = keyInput;
  const num = parseInt(keyInput, 10);
  if (!isNaN(num) && num >= 1 && num <= keys.length && String(num) === keyInput) targetKey = keys[num - 1];
  if (saves[targetKey]) {
    data = structuredClone(saves[targetKey]);
    saveDraft(); renderEditor(); renderPreview();
  } else {
    alert(`"${keyInput}" 이름의 저장 데이터를 찾을 수 없습니다.`);
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.name || 'problem').replace(/[^\w가-힣.-]+/g, '_') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const x = JSON.parse(await f.text());
    if (!x || typeof x !== 'object' || !Array.isArray(x.examples)) throw new Error();
    data = { ...structuredClone(initial), ...x };
    saveDraft(); renderEditor(); renderPreview();
  } catch {
    alert('올바른 Polygon Editor JSON 파일이 아닙니다.');
  }
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('현재 내용을 초기화할까요?')) {
    data = structuredClone(initial);
    saveDraft(); renderEditor(); renderPreview();
  }
});

renderEditor();
renderPreview();