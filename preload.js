const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    extractAccessKey: (filePath) => ipcRenderer.invoke('extract-access-key', filePath),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog')
});

