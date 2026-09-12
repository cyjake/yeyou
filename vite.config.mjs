import { copyFileSync, cpSync, mkdirSync, readFile } from 'node:fs';
import { basename, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const kuromojiDictionary = resolve(import.meta.dirname, 'node_modules/@faanau/kuromoji/dict');
const dictionaryFiles = new Set([
  'base.dat.gz', 'cc.dat.gz', 'check.dat.gz', 'tid.dat.gz', 'tid_map.dat.gz', 'tid_pos.dat.gz',
  'unk.dat.gz', 'unk_char.dat.gz', 'unk_compat.dat.gz', 'unk_invoke.dat.gz', 'unk_map.dat.gz', 'unk_pos.dat.gz'
]);

const serveAndCopyDictionaries = {
  name: 'serve-and-copy-dictionaries',
  configureServer(server) {
    server.middlewares.use('/kuromoji', (request, response, next) => {
      const fileName = basename(request.url ?? '');
      if (!dictionaryFiles.has(fileName)) return next();
      readFile(resolve(kuromojiDictionary, fileName), (error, contents) => {
        if (error) return next(error);
        response.setHeader('Content-Type', 'application/gzip');
        response.end(contents);
      });
    });
  },
  closeBundle() {
    mkdirSync(resolve(import.meta.dirname, 'dist'), { recursive: true });
    copyFileSync(
      resolve(import.meta.dirname, 'kanji_to_hiragana.json'),
      resolve(import.meta.dirname, 'dist/kanji_to_hiragana.json')
    );
    cpSync(kuromojiDictionary, resolve(import.meta.dirname, 'dist/kuromoji'), { recursive: true });
  }
};

export default defineConfig({
  plugins: [react(), serveAndCopyDictionaries],
  resolve: {
    // The package's ESM wrapper uses node:createRequire; its CommonJS entry is
    // the browser-compatible implementation Vite can bundle for our Worker.
    alias: {
      '@faanau/kuromoji': resolve(import.meta.dirname, 'node_modules/@faanau/kuromoji/src/kuromoji.js')
    }
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        legacy: resolve(import.meta.dirname, 'legacy.html'),
        studio: resolve(import.meta.dirname, 'studio.html')
      }
    }
  }
});
