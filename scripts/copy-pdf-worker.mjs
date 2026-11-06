import {mkdirSync,copyFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
mkdirSync(new URL('public/',root),{recursive:true});
copyFileSync(new URL('node_modules/pdfjs-dist/build/pdf.worker.min.mjs',root),new URL('public/pdf.worker.min.mjs',root));
