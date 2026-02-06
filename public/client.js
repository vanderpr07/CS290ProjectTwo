const editor = document.getElementById('editor');
const docIdSpan = document.getElementById('docId');


// Determine document from URL: /?doc=my-doc
const params = new URLSearchParams(window.location.search);
const docId = params.get('doc') || 'default';
docIdSpan.textContent = docId;


const ws = new WebSocket(`ws://${location.host}?doc=${encodeURIComponent(docId)}`);


let isRemoteUpdate = false;


ws.onmessage = (event) => {
const msg = JSON.parse(event.data);


if (msg.type === 'init') {
editor.textContent = msg.content;
}


if (msg.type === 'update') {
isRemoteUpdate = true;
editor.textContent = msg.content;
placeCursorAtEnd();
isRemoteUpdate = false;
}
};


// Send updates on input (debounced)
let pending = false;
editor.addEventListener('input', () => {
if (isRemoteUpdate) return;
if (pending) return;
pending = true;
setTimeout(() => {
ws.send(JSON.stringify({ type: 'update', content: editor.textContent }));
pending = false;
}, 150); // simple debounce
});


function placeCursorAtEnd() {
const range = document.createRange();
const sel = window.getSelection();
range.selectNodeContents(editor);
range.collapse(false);
sel.removeAllRanges();
sel.addRange(range);
}

// Send updates on input (debounced)
let pending = false;
