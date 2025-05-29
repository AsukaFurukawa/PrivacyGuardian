const { app, BrowserWindow, ipcMain, dialog, clipboard, Notification, Tray, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const Store = require('electron-store');

// Initialize config store
const store = new Store();

// Default API URL
const DEFAULT_API_URL = 'http://localhost:8000';

// Set API URL from config or use default
let apiUrl = store.get('apiUrl') || DEFAULT_API_URL;

// Global references
let mainWindow = null;
let tray = null;
let websocket = null;

// Queue for pending checks
let checkQueue = [];
let isProcessingQueue = false;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // When window is closed, just hide it unless user is quitting the app
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Connect to WebSocket for real-time events
  connectWebSocket();
}

// Create tray icon
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        mainWindow.show();
      }
    },
    { 
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-settings');
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('WhisperPrint + Privacy-Guardian');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

// Connect to the WebSocket server
function connectWebSocket() {
  if (websocket) {
    websocket.close();
  }
  
  const wsUrl = apiUrl.replace('http', 'ws') + '/ws/dashboard';
  
  websocket = new WebSocket(wsUrl);
  
  websocket.on('open', () => {
    console.log('Connected to WebSocket server');
    mainWindow.webContents.send('websocket-status', 'connected');
  });
  
  websocket.on('message', (data) => {
    try {
      const event = JSON.parse(data);
      mainWindow.webContents.send('websocket-event', event);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  websocket.on('close', () => {
    console.log('Disconnected from WebSocket server');
    mainWindow.webContents.send('websocket-status', 'disconnected');
    
    // Try to reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  });
  
  websocket.on('error', (error) => {
    console.error('WebSocket error:', error);
    mainWindow.webContents.send('websocket-status', 'error');
  });
}

// Monitor clipboard for sensitive data
function setupClipboardMonitor() {
  // Check clipboard every second
  setInterval(async () => {
    try {
      const clipboardText = clipboard.readText();
      
      // Skip if clipboard is empty or unchanged
      if (!clipboardText || clipboardText === store.get('lastClipboardText')) {
        return;
      }
      
      // Save current clipboard text
      store.set('lastClipboardText', clipboardText);
      
      // Add to check queue
      checkQueue.push({
        content: clipboardText,
        contentType: 'clipboard'
      });
      
      // Process queue if not already processing
      if (!isProcessingQueue) {
        processCheckQueue();
      }
    } catch (error) {
      console.error('Error monitoring clipboard:', error);
    }
  }, 1000);
}

// Process check queue
async function processCheckQueue() {
  if (checkQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  
  const checkItem = checkQueue.shift();
  
  try {
    const response = await axios.post(`${apiUrl}/check`, {
      content: checkItem.content,
      content_type: checkItem.contentType
    });
    
    const result = response.data;
    
    // If sensitive data detected and risk score is high, show notification
    if (result.has_sensitive_data && result.risk_score > 0.8) {
      showSensitiveDataNotification(result);
    }
    
    // Send result to main window
    mainWindow.webContents.send('check-result', result);
  } catch (error) {
    console.error('Error checking content:', error);
  }
  
  // Process next item in queue
  processCheckQueue();
}

// Show notification for sensitive data
function showSensitiveDataNotification(result) {
  const detectionCount = result.detections.length;
  
  let detectionInfo = '';
  if (detectionCount > 0) {
    const detectionTypes = [...new Set(result.detections.map(d => d.label))];
    detectionInfo = `Found: ${detectionTypes.join(', ')}`;
  }
  
  const notification = new Notification({
    title: 'Sensitive Data Detected',
    body: `Risk score: ${Math.round(result.risk_score * 100)}%. ${detectionInfo}`,
    icon: path.join(__dirname, 'assets/icon.png')
  });
  
  notification.show();
  
  notification.on('click', () => {
    mainWindow.show();
    mainWindow.webContents.send('show-detection', result);
  });
}

// App ready event
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupClipboardMonitor();
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC events
ipcMain.on('fingerprint-document', async (event, { text, recipientId }) => {
  try {
    const response = await axios.post(`${apiUrl}/fingerprint`, {
      text,
      recipient_id: recipientId
    });
    
    event.reply('fingerprint-result', response.data);
  } catch (error) {
    event.reply('fingerprint-error', error.message);
  }
});

ipcMain.on('identify-document', async (event, { leakedText }) => {
  try {
    const response = await axios.post(`${apiUrl}/identify`, {
      leaked_text: leakedText
    });
    
    event.reply('identify-result', response.data);
  } catch (error) {
    event.reply('identify-error', error.message);
  }
});

ipcMain.on('check-content', async (event, { content, contentType }) => {
  try {
    const response = await axios.post(`${apiUrl}/check`, {
      content,
      content_type: contentType
    });
    
    event.reply('check-result', response.data);
  } catch (error) {
    event.reply('check-error', error.message);
  }
});

ipcMain.on('send-feedback', async (event, { detectionId, action, wasCorrect }) => {
  try {
    const response = await axios.post(`${apiUrl}/feedback`, {
      detection_id: detectionId,
      action,
      was_correct: wasCorrect
    });
    
    event.reply('feedback-result', response.data);
  } catch (error) {
    event.reply('feedback-error', error.message);
  }
});

ipcMain.on('get-stats', async (event) => {
  try {
    const response = await axios.get(`${apiUrl}/stats`);
    event.reply('stats-result', response.data);
  } catch (error) {
    event.reply('stats-error', error.message);
  }
});

ipcMain.on('update-api-url', (event, url) => {
  apiUrl = url;
  store.set('apiUrl', url);
  connectWebSocket();
  event.reply('api-url-updated');
}); 