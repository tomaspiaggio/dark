// Extension installation/enable/disable events (rare for normal extensions).

import { app, session } from "electron";
import fs from "fs";
import https from "https";
import path from "path";
import unzip from "unzip-crx";

const EXT_DIR = path.join(app.getPath("userData"), "extensions");
fs.mkdirSync(EXT_DIR, { recursive: true });

// Helper: download a URL to disk
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed (${res.statusCode})`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

export async function installExtension(extId: string): Promise<void> {
  try {
    const crxUrl =
      `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${app.getVersion()}&x=id%3D${extId}%26installsource%3Dondemand%26uc`;
    const tmpCrx = path.join(app.getPath("temp"), `${extId}.crx`);
    await downloadFile(crxUrl, tmpCrx);

    const extractDir = path.join(EXT_DIR, `${extId}@${Date.now()}`);
    await unzip(tmpCrx, extractDir);

    await session.defaultSession.loadExtension(extractDir);
  } catch (err: any) {
    console.error("Extension install error", err);
  }
}
