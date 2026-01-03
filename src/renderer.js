// Using electronAPI exposed by preload.js

// Elements
const btnSelectFiles = document.getElementById('btnSelectFiles');
const btnCopyAll = document.getElementById('btnCopyAll');
const listView = document.getElementById('listView');
const status = document.getElementById('status');
const count = document.getElementById('count');
const progressIndicator = document.getElementById('progressIndicator');
const container = document.querySelector('.container');

let accessKeys = [];
let selectedIndex = -1;

// Initialize
updateCount();

// File selection
btnSelectFiles.addEventListener('click', async () => {
    if (window.electronAPI) {
        const filePaths = await window.electronAPI.openFileDialog();
        if (filePaths && filePaths.length > 0) {
            processFiles(filePaths);
        }
    }
});

// Copy all
btnCopyAll.addEventListener('click', () => {
    if (accessKeys.length === 0) {
        showAlert('Nenhuma chave para copiar', 'A lista está vazia.');
        return;
    }
    
    const allKeys = accessKeys.join('\n');
    copyToClipboard(allKeys);
    status.textContent = 'Todas as chaves copiadas para a área de transferência!';
});

// List item double click to copy
listView.addEventListener('dblclick', (e) => {
    const li = e.target.closest('li');
    if (li) {
        const index = Array.from(listView.children).indexOf(li);
        if (index >= 0 && accessKeys[index]) {
            copyToClipboard(accessKeys[index]);
            status.textContent = 'Chave copiada para a área de transferência!';
            // Visual feedback
            li.style.background = '#d4e6f1';
            setTimeout(() => {
                li.style.background = '';
            }, 200);
        }
    }
});

// List item click (select)
listView.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) {
        const index = Array.from(listView.children).indexOf(li);
        selectItem(index);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIndex >= 0) {
        e.preventDefault();
        if (accessKeys[selectedIndex]) {
            copyToClipboard(accessKeys[selectedIndex]);
            status.textContent = 'Chave copiada para a área de transferência!';
        }
    }
});

// Drag and drop
container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.add('drag-over');
});

container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
});

container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length > 0) {
        const filePaths = files.map(f => f.path);
        processFiles(filePaths);
    } else {
        status.textContent = 'Nenhum arquivo PDF encontrado nos arquivos arrastados.';
    }
});

async function processFiles(filePaths) {
    btnSelectFiles.disabled = true;
    progressIndicator.style.display = 'block';
    status.textContent = 'Processando arquivos...';
    accessKeys = [];
    listView.innerHTML = '';
    updateCount();
    
    const extractedKeys = [];
    
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const fileName = filePath.split(/[/\\]/).pop();
        
        status.textContent = `Processando ${i + 1} de ${filePaths.length}: ${fileName}`;
        
        try {
            console.log(`\n=== Processando: ${fileName} ===`);
            
            if (window.electronAPI) {
                const key = await window.electronAPI.extractAccessKey(filePath);
                
                if (key && key.length > 0) {
                    console.log(`✓ Chave encontrada: ${key}`);
                    extractedKeys.push(key);
                } else {
                    console.log(`✗ Chave de Acesso não encontrada em: ${fileName}`);
                }
            }
        } catch (error) {
            console.error(`Erro ao processar ${fileName}:`, error);
        }
    }
    
    // Update UI
    accessKeys = extractedKeys;
    updateListView();
    btnSelectFiles.disabled = false;
    progressIndicator.style.display = 'none';
    
    if (extractedKeys.length === 0) {
        status.textContent = 'Nenhuma Chave de Acesso encontrada nos arquivos.';
    } else {
        status.textContent = `Processamento concluído! ${extractedKeys.length} chave(s) encontrada(s).`;
    }
}

function updateListView() {
    listView.innerHTML = '';
    accessKeys.forEach((key, index) => {
        const li = document.createElement('li');
        li.textContent = key;
        if (index === selectedIndex) {
            li.classList.add('selected');
        }
        listView.appendChild(li);
    });
    updateCount();
}

function selectItem(index) {
    selectedIndex = index;
    updateListView();
    if (index >= 0 && listView.children[index]) {
        listView.children[index].scrollIntoView({ block: 'nearest' });
    }
}

function updateCount() {
    count.textContent = `Total: ${accessKeys.length} chave(s)`;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Texto copiado para a área de transferência');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

function showAlert(title, message) {
    alert(`${title}\n\n${message}`);
}

