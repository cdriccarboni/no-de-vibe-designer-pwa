const { app, BrowserWindow, Menu, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let projectorWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#09090b',
    title: 'No[co]de Vibe Designer',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev && process.env.DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (projectorWindow) {
      projectorWindow.close();
    }
  });

  // Setup Application Menu
  const menuTemplate = [
    {
      label: 'No[co]de',
      submenu: [
        { role: 'about', label: 'À propos de No[co]de Vibe Designer' },
        { type: 'separator' },
        {
          label: 'Vérifier les mises à jour...',
          click: () => {
            if (!isDev) {
              autoUpdater.checkForUpdatesAndNotify();
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Mises à jour No[co]de',
                message: 'En mode développement, les mises à jour automatiques sont simulées.',
              });
            }
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Masquer No[co]de' },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter No[co]de Vibe Designer' },
      ],
    },
    {
      label: 'Régie & Affichage',
      submenu: [
        {
          label: 'Ouvrir Sortie Vidéoprojecteur Plein Écran',
          accelerator: 'CmdOrCtrl+P',
          click: () => openProjectorWindow(),
        },
        { type: 'separator' },
        { role: 'reload', label: 'Actualiser' },
        { role: 'forceReload', label: 'Forcer l’actualisation' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'zoom', label: 'Agrandir' },
        { type: 'separator' },
        { role: 'front', label: 'Tout ramener au premier plan' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Setup auto-updates
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

function openProjectorWindow() {
  const displays = screen.getAllDisplays();
  // Choose secondary display if available (connected projector)
  const targetDisplay = displays.length > 1 ? displays[1] : displays[0];

  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.focus();
    return;
  }

  projectorWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: displays.length > 1,
    frame: false,
    backgroundColor: '#000000',
    title: 'Sortie Vidéoprojecteur — No[co]de Vibe Designer',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev && process.env.DEV_SERVER_URL) {
    projectorWindow.loadURL(`${process.env.DEV_SERVER_URL}#projector-fullscreen`);
  } else {
    projectorWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'projector-fullscreen',
    });
  }

  projectorWindow.on('closed', () => {
    projectorWindow = null;
  });
}

// Auto-updater lifecycle events
autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour disponible',
      message: `Une nouvelle version (${info.version}) de No[co]de Vibe Designer est prête. Téléchargement en cours en arrière-plan...`,
    });
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    dialog
      .showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Redémarrer et Installer', 'Plus tard'],
        defaultId: 0,
        title: 'Mise à jour prête',
        message: 'La mise à jour a été téléchargée avec succès. Voulez-vous redémarrer No[co]de maintenant ?',
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
