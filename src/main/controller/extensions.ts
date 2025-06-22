import { app, session, ipcMain } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import unzip from 'unzip-crx';

const EXT_DIR = path.join(app.getPath('userData'), 'extensions');
fs.mkdirSync(EXT_DIR, { recursive: true });

// Helper: download a URL to disk
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed (${res.statusCode})`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

ipcMain.on('extensions.install', async (event, extId: string) => {
  console.log("received request to install extension", extId);
  // try {
  //   const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${app.getVersion()}&x=id%3D${extId}%26installsource%3Dondemand%26uc`;
  //   const tmpCrx = path.join(app.getPath('temp'), `${extId}.crx`);
  //   await downloadFile(crxUrl, tmpCrx);

  //   const extractDir = path.join(EXT_DIR, `${extId}@${Date.now()}`);
  //   await unzip(tmpCrx, extractDir);

  //   await session.defaultSession.loadExtension(extractDir);
  //   event.reply('extensions.install', { success: true, id: extId, path: extractDir });
  // } catch (err: any) {
  //   console.error('Extension install error', err);
  //   event.reply('extensions.install', { success: false, error: err.message });
  // }
});
