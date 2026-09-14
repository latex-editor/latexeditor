const DRAFT_KEY = 'polygon-editor-draft';
const SAVES_KEY = 'polygon-editor-saves';

const initial = {
  name: 'A. Sample Problem',
  time: '2 seconds',
  memory: '256 megabytes',
  legend: '셰프 모노카프(Monocarp)는 $N \\times M \\times K$ 크기의 직육면체 모양의 거대한 고기 블록을 요리하려고 합니다. 고기는 $1 \\times 1 \\times 1$ 크기의 작은 칸들로 이루어져 있으며, 초기 상태에서 모든 칸의 \\textbf{굽기 정도(Doneness)}는 $0$입니다.\n\n고기의 6개 면은 각각 다음과 같이 정의됩니다:\n\\begin{itemize}\n    \\item \\texttt{LEFT}, \\texttt{RIGHT}: $N$ 길이 축의 양쪽 끝 면\n    \\item \\texttt{BOTTOM}, \\texttt{TOP}: $M$ 길이 축의 양쪽 끝 면\n    \\item \\texttt{FRONT}, \\texttt{BACK}: $K$ 길이 축의 양쪽 끝 면\n\\end{itemize}\n\n모노카프는 고기를 굽기 위해 다음 작업을 수행할 수 있습니다:\n\\begin{enumerate}\n    \\item 6개 면 중 하나를 선택합니다. 선택한 면이 속한 축의 길이를 $L$이라 합니다.\n    \\item 양의 정수 화력 $P$ ($P \\ge 1$)를 결정합니다.\n    \\item 선택한 면으로부터 깊이가 $d$번째인 레이어($1 \\le d \\le L$)에 속한 모든 칸의 굽기 정도가 $\\max(0, P - d + 1)$만큼 증가합니다.\n\\end{enumerate}\n\n모노카프는 고기의 \\textbf{모든 칸의 굽기 정도가 $1$ 이상이며 전부 같아지도록} 만들고 싶습니다. \\\\\n목표를 달성하기 위한 \\textbf{최소 작업 횟수}와 그에 해당하는 \\textbf{작업 순서}를 구하는 프로그램을 작성하세요.',
  input: '첫 번째 줄에 세 정수 $N, M, K$ ($1 \\le N, M, K \\le 100$)가 공백으로 구분되어 주어집니다.',
  output: '첫 번째 줄에 최소 작업 횟수 $Q$를 출력합니다.\n다음 $Q$개의 줄에 각 작업의 정보를 출력합니다.',
  interaction: '',
  notes: '예제 1에서 총 2번의 작업으로 모든 칸의 굽기 정도를 $2$로 만들 수 있습니다.',
  examples: [{ input: '2 2 2', output: '2\nLEFT 2\nRIGHT 2' }]
};

const labels = { legend: 'Legend', input: 'Input', output: 'Output', interaction: 'Interaction', notes: 'Note' };

function getSaves() { try { const x = localStorage.getItem(SAVES_KEY); return x ? JSON.parse(x) : {}; } catch (e) { return {}; } }
function setSaves(s) { localStorage.setItem(SAVES_KEY, JSON.stringify(s)); }
function loadDraft() { try { const x = localStorage.getItem(DRAFT_KEY); return x ? JSON.parse(x) : null; } catch (e) { return null; } }
function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {} }

// URL 공유용 Base64 인코딩/디코딩 (유니코드 한글 완벽 지원)
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

// LaTeX 환경(itemize, enumerate) 파싱
function parseEnvironments(str) {
  str = str.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    const items = content.split(/\\item\s*/).filter(item => item.trim() !== '');
    const listHTML = items.map(item => `<li>${item.trim()}</li>`).join('');
    return `<ul class="statement-list">${listHTML}</ul>`;
  });

  str = str.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    const items = content.split(/\\item\s*/).filter(item => item.trim() !== '');
    const listHTML = items.map(item => `<li>${item.trim()}</li>`).join('');
    return `<ol class="statement-list">${listHTML}</ol>`;
  });

  return str;
}

// 완벽한 Polygon/Codeforces LaTeX 렌더러
function renderText(text) {
  if (!text) return '';
  let s = String(text);

  // 1. 수식($...$, $$...$$, \begin{equation} 등) 보호 및 KaTeX 렌더링
  const mathBlocks = [];
  const saveMath = (mathStr, isDisplay) => {
    const id = `___MATH_${mathBlocks.length}___`;
    try {
      const cleanMath = mathStr.replace(/\\\\/g, '\\');
      const html = katex.renderToString(cleanMath, {
        displayMode: isDisplay,
        throwOnError: false
      });
      mathBlocks.push(html);
    } catch (e) {
      mathBlocks.push(`<span class="latex-error">${escapeHTML(mathStr)}</span>`);
    }
    return id;
  };

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => saveMath(m, true));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => saveMath(m, true));
  s = s.replace(/\\begin\{(equation|align|eqnarray)\*?\}([\s\S]+?)\\end\{\1\*?\}/g, (full) => saveMath(full, true));
  s = s.replace(/\$([^\$\n]+?)\$/g, (_, m) => saveMath(m, false));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => saveMath(m, false));

  // 2. HTML 특수문자 이스케이프
  s = escapeHTML(s);

  // 3. LaTeX 텍스트 매크로 처리
  let prev;
  do {
    prev = s;
    s = s.replace(/\\textbf\{([^{}]+)\}/g, '<strong>$1</strong>');
    s = s.replace(/\\textit\{([^{}]+)\}/g, '<em>$1</em>');
    s = s.replace(/\\texttt\{([^{}]+)\}/g, '<code>$1</code>');
    s = s.replace(/\\underline\{([^{}]+)\}/g, '<u>$1</u>');
    s = s.replace(/\\sout\{([^{}]+)\}/g, '<del>$1</del>');
  } while (s !== prev);

  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 4. 리스트 환경 파싱
  s = parseEnvironments(s);

  // 5. 줄바꿈 및 이스케이프 기호 변환
  s = s.replace(/\\\\/g, '<br>');
  s = s.replace(/\\%/g, '%')
       .replace(/\\\_/g, '_')
       .replace(/\\\&/g, '&amp;')
       .replace(/\\\#/g, '#');

  // 문단 분리
  s = s.replace(/\n\s*\n/g, '<br><br>');
  s = s.replace(/\n/g, ' ');

  // 6. 복원된 수식 삽입
  s = s.replace(/___MATH_(\d+)___/g, (_, idx) => mathBlocks[parseInt(idx, 10)]);

  return s;
}

function sectionHTML(title, text) {
  return text ? `<section class="cf-section"><h2>${title}</h2><div>${renderText(text)}</div></section>` : '';
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
  document.getElementById('name').value = data.name;
  document.getElementById('time').value = data.time;
  document.getElementById('memory').value = data.memory;
  const container = document.getElementById('sections');
  container.innerHTML = '';
  for (const k of ['legend', 'input', 'output', 'interaction', 'notes']) {
    const row = document.createElement('div');
    row.className = 'form-row';
    row.innerHTML = `<label>${labels[k]}</label><textarea spellcheck="false" data-key="${k}" placeholder="Write ${labels[k].toLowerCase()} here..."></textarea>`;
    row.querySelector('textarea').value = data[k];
    container.appendChild(row);
  }
  const ex = document.getElementById('examples');
  ex.innerHTML = '';
  data.examples.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'example-edit';
    row.innerHTML = `<span>Example ${i + 1}</span><textarea spellcheck="false" placeholder="Input">${escapeHTML(e.input)}</textarea><textarea spellcheck="false" placeholder="Output">${escapeHTML(e.output)}</textarea><button class="remove-example">Remove</button>`;
    const ts = row.querySelectorAll('textarea');
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
  data.examples.push({ input: '', output: '' });
  renderEditor(); renderPreview(); saveDraft();
});

// 공유 버튼 이벤트 (URL 해시에 데이터 저장)
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