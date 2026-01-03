// Using electronAPI exposed by preload.js

// Elements
const btnSelectFilesEl = document.getElementById('btnSelectFiles');
const btnCopyAllEl = document.getElementById('btnCopyAll');
const listViewEl = document.getElementById('listView');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const progressIndicatorEl = document.getElementById('progressIndicator');
const containerEl = document.querySelector('.container');

let accessKeys = [];
let selectedIndex = -1;

// Initialize
updateCount();

// File selection
btnSelectFilesEl.addEventListener('click', async () => {
    if (window.electronAPI) {
        const filePaths = await window.electronAPI.openFileDialog();
        if (filePaths && filePaths.length > 0) {
            processFiles(filePaths);
        }
    }
});

// Copy all
btnCopyAllEl.addEventListener('click', () => {
    if (accessKeys.length === 0) {
        showAlert('Nenhuma chave para copiar', 'A lista está vazia.');
        return;
    }
    
    const allKeys = accessKeys.join('\n');
    copyToClipboard(allKeys);
    statusEl.textContent = 'Todas as chaves copiadas para a área de transferência!';
});

// List item click (select)
listViewEl.addEventListener('click', (e) => {
    // Não selecionar se clicar no botão de copiar
    if (e.target.closest('.copy-btn')) {
        return;
    }
    const li = e.target.closest('li');
    if (li) {
        const index = Array.from(listViewEl.children).indexOf(li);
        selectItem(index);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIndex >= 0) {
        e.preventDefault();
        if (accessKeys[selectedIndex]) {
            copyToClipboard(accessKeys[selectedIndex]);
            statusEl.textContent = 'Chave copiada para a área de transferência!';
        }
    }
});

// Drag and drop
containerEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    containerEl.classList.add('drag-over');
});

containerEl.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    containerEl.classList.remove('drag-over');
});

containerEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    containerEl.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length > 0) {
        const filePaths = files.map(f => f.path);
        processFiles(filePaths);
    } else {
        statusEl.textContent = 'Nenhum arquivo PDF encontrado nos arquivos arrastados.';
    }
});

async function processFiles(filePaths) {
    btnSelectFilesEl.disabled = true;
    progressIndicatorEl.style.display = 'block';
    statusEl.textContent = 'Processando arquivos...';
    accessKeys = [];
    listViewEl.innerHTML = '';
    updateCount();
    
    const extractedKeys = [];
    
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const fileName = filePath.split(/[/\\]/).pop();
        
        statusEl.textContent = `Processando ${i + 1} de ${filePaths.length}: ${fileName}`;
        
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
    btnSelectFilesEl.disabled = false;
    progressIndicatorEl.style.display = 'none';
    
    if (extractedKeys.length === 0) {
        statusEl.textContent = 'Nenhuma Chave de Acesso encontrada nos arquivos.';
    } else {
        statusEl.textContent = `Processamento concluído! ${extractedKeys.length} chave(s) encontrada(s).`;
    }
}

function updateListView() {
    listViewEl.innerHTML = '';
    accessKeys.forEach((key, index) => {
        const li = document.createElement('li');
        
        // Criar container para a chave e o botão
        const keyContainer = document.createElement('div');
        keyContainer.className = 'key-container';
        
        // Texto da chave
        const keyText = document.createElement('span');
        keyText.className = 'key-text';
        keyText.textContent = key;
        
        // Botão de copiar
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copiar chave';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que o clique no botão selecione o item
            copyToClipboard(key);
            statusEl.textContent = 'Chave copiada para a área de transferência!';
            
            // Feedback visual
            copyBtn.innerHTML = '✓';
            copyBtn.style.background = '#4caf50';
            setTimeout(() => {
                copyBtn.innerHTML = '📋';
                copyBtn.style.background = '';
            }, 1000);
        });
        
        keyContainer.appendChild(keyText);
        keyContainer.appendChild(copyBtn);
        li.appendChild(keyContainer);
        
        if (index === selectedIndex) {
            li.classList.add('selected');
        }
        listViewEl.appendChild(li);
    });
    updateCount();
}

function selectItem(index) {
    selectedIndex = index;
    updateListView();
    if (index >= 0 && listViewEl.children[index]) {
        listViewEl.children[index].scrollIntoView({ block: 'nearest' });
    }
}

function updateCount() {
    countEl.textContent = `Total: ${accessKeys.length} chave(s)`;
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

