declare module 'unzip-crx' {
  function unzip(crxPath: string, destPath: string): Promise<void>;
  export = unzip;
} 