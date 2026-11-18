const languages = {
  ar: 'Arabic', bn: 'Bengali', 'zh-CN': 'Chinese (Simplified)', nl: 'Dutch', en: 'English',
  fa: 'Persian', fr: 'French', de: 'German', hi: 'Hindi', id: 'Indonesian', it: 'Italian',
  ja: 'Japanese', ko: 'Korean', pl: 'Polish', pt: 'Portuguese', ru: 'Russian',
  es: 'Spanish', tr: 'Turkish', uk: 'Ukrainian', ur: 'Urdu',
};
const get = id => document.getElementById(id);
const input = get('input');
const output = get('output');
const source = get('source');
const target = get('target');
const status = get('status');
const provider = get('provider');
const copy = get('copy');
let request;

for (const [code, label] of Object.entries(languages).sort((a, b) => a[1].localeCompare(b[1]))) {
  source.add(new Option(label, code));
  target.add(new Option(label, code));
}
source.value = 'en';
target.value = 'ur';

async function fetchJson(url, signal) {
  if (signal.aborted) throw signal.reason;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

function splitForMyMemory(text) {
  const encoder = new TextEncoder();
  const chunks = [];
  let chunk = '';
  let size = 0;
  for (const word of text.match(/\S+|\s+/gu) ?? []) {
    const bytes = encoder.encode(word).length;
    if (size + bytes > 450 && chunk) {
      chunks.push(chunk);
      chunk = '';
      size = 0;
    }
    // Split very long tokens on code points so their UTF-8 sequences remain intact.
    if (bytes > 450) {
      for (const character of word) {
        const length = encoder.encode(character).length;
        if (size + length > 450) {
          chunks.push(chunk);
          chunk = '';
          size = 0;
        }
        chunk += character;
        size += length;
      }
    } else {
      chunk += word;
      size += bytes;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function decodeEntities(text) {
  // Escape literal markup before decoding provider-encoded entities.
  const decoder = document.createElement('textarea');
  decoder.innerHTML = text.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return decoder.value;
}

async function myMemory(text, from, to, signal) {
  const results = [];
  for (const chunk of splitForMyMemory(text)) {
    if (!chunk.trim()) {
      results.push(chunk);
      continue;
    }
    const url = new URL('https://api.mymemory.translated.net/get');
    url.search = new URLSearchParams({ q: chunk.trim(), langpair: `${from}|${to}` });
    const data = await fetchJson(url, signal);
    const translated = data.responseData?.translatedText;
    if (Number(data.responseStatus) !== 200 || typeof translated !== 'string' || !translated.trim()) {
      throw new Error('MyMemory could not translate this text.');
    }
    results.push(chunk.match(/^\s*/u)[0] + decodeEntities(translated) + chunk.match(/\s*$/u)[0]);
  }
  return results.join('');
}

const apertiumCodes = {
  ar: 'ara', bn: 'ben', 'zh-CN': 'zho', nl: 'nld', en: 'eng', fa: 'fas', fr: 'fra',
  de: 'deu', hi: 'hin', id: 'ind', it: 'ita', ja: 'jpn', ko: 'kor', pl: 'pol',
  pt: 'por', ru: 'rus', es: 'spa', tr: 'tur', uk: 'ukr', ur: 'urd',
};

async function apertium(text, from, to, signal) {
  const langpair = `${apertiumCodes[from]}|${apertiumCodes[to]}`;
  const results = [];
  for (const chunk of splitForMyMemory(text)) {
    if (!chunk.trim()) {
      results.push(chunk);
      continue;
    }
    const url = new URL('https://www.apertium.org/apy/translate');
    url.search = new URLSearchParams({ q: chunk, langpair, markUnknown: 'no' });
    const data = await fetchJson(url, signal);
    const translated = data.responseData?.translatedText;
    if (Number(data.responseStatus) !== 200 || typeof translated !== 'string' || !translated.trim()) {
      throw new Error('Apertium could not translate this language pair.');
    }
    results.push(translated);
  }
  return results.join('');
}

async function onDevice(text, from, to, signal) {
  const api = globalThis.Translator;
  if (!api) throw new Error('On-device translation unavailable.');
  const options = { sourceLanguage: from, targetLanguage: to, signal };
  const translator = await api.create(options);
  try {
    return await translator.translate(text, { signal });
  } finally {
    translator.destroy();
  }
}

function clearResult() {
  request?.abort();
  request = null;
  output.value = '';
  copy.disabled = true;
  get('translate').disabled = false;
  status.textContent = '';
}

get('translation').addEventListener('submit', async event => {
  event.preventDefault();
  clearResult();
  const text = input.value.trim();
  const from = source.value;
  const to = target.value;
  if (!text || from === to) {
    status.textContent = text ? 'Choose two different languages.' : 'Enter text to translate.';
    return;
  }

  const controller = new AbortController();
  request = controller;
  get('translate').disabled = true;
  const providers = {
    device: ['On-device translation', onDevice],
    memory: ['MyMemory', myMemory],
    apertium: ['Apertium', apertium],
  };
  const selected = provider.value === 'auto'
    ? (globalThis.Translator ? Object.values(providers) : [providers.memory, providers.apertium])
    : [providers[provider.value]];
  for (const [name, translate] of selected) {
    status.textContent = `Trying ${name}…`;
    try {
      const translated = await translate(text, from, to, controller.signal);
      if (request !== controller) return;
      output.value = translated;
      copy.disabled = false;
      status.textContent = `Translated with ${name}.`;
      break;
    } catch {
      if (request !== controller) return;
    }
  }
  if (!output.value) status.textContent = 'Translation unavailable. Try a shorter text, another language pair, or retry later.';
  request = null;
  get('translate').disabled = false;
});

for (const element of [input, source, target]) element.addEventListener('input', clearResult);
provider.addEventListener('change', clearResult);
get('swap').addEventListener('click', () => {
  [source.value, target.value] = [target.value, source.value];
  if (output.value) input.value = output.value;
  clearResult();
});
get('clear').addEventListener('click', () => { input.value = ''; clearResult(); input.focus(); });

for (const id of ['paste', 'append']) {
  get(id).addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      input.value = id === 'append' && input.value ? `${input.value}\n${text}` : text;
      clearResult();
    } catch {
      status.textContent = 'Paste into the input box using your browser or keyboard menu.';
    }
    input.focus();
  });
}
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    status.textContent = 'Translation copied.';
  } catch {
    output.focus();
    output.select();
    status.textContent = 'Translation selected. Use your browser or keyboard menu to copy.';
  }
});
