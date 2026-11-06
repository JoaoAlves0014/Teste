export async function decodeCSV(file:File){const bytes=await file.arrayBuffer();try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return new TextDecoder('windows-1252').decode(bytes)}}
export async function fileHash(file:File){const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function extractPDF(file:File,password=''){
 const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),password:password||undefined,useSystemFonts:true});
 try{const pdf=await task.promise;if(pdf.numPages>100)throw Error('Use PDFs de até 100 páginas por arquivo.');const pages:string[]=[];
 for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();const lines:{y:number;items:{x:number;text:string}[]}[]=[];
 for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5],x=item.transform[4];let line=lines.find(l=>Math.abs(l.y-y)<2);if(!line){line={y,items:[]};lines.push(line)}line.items.push({x,text:item.str})}
 pages.push(lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(v=>v.text).join(' ')).join('\n'));page.cleanup()}
 return {text:pages.join('\n'),pages:pdf.numPages};}finally{await task.destroy()}
}
