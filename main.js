const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { extractAccessKey } = require('./src/extractor');

// Hot reload em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
            hardResetMethod: 'exit',
            // Monitora mudanças em todos os arquivos relevantes
            ignored: [
                /node_modules[\/\\]/,
                /dist[\/\\]/,
                /\.git[\/\\]/
            ]
        });
        console.log('🔥 Hot reload ativado! Alterações serão aplicadas automaticamente.');
    } catch (error) {
        console.log('electron-reload não disponível:', error.message);
    }
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 700,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
    });

    mainWindow.loadFile('src/index.html');


    mainWindow.setTitle('Extrator de Chave de Acesso');
}

// IPC Handlers
ipcMain.handle('extract-access-key', async (event, filePath) => {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const key = await extractAccessKey(pdfBuffer);
        return key;
    } catch (error) {
        console.error('Erro ao extrair chave:', error);
        throw error;
    }
});

ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecione os arquivos PDF de Chave de Acesso',
        filters: [
            { name: 'Arquivos PDF', extensions: ['pdf'] }
        ],
        properties: ['openFile', 'multiSelections']
    });
    
    if (result.canceled) {
        return [];
    }
    
    return result.filePaths;
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

