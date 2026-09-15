import fs from 'node:fs';
const pages=['index.html','habits.html','finances.html','work.html','studies.html','roadmap.html'];
let failed=false;
for(const page of pages){const html=fs.readFileSync(page,'utf8');for(const match of html.matchAll(/(?:href|src)="([^"#?]+)"/g)){const ref=match[1];if(ref.startsWith('http')||ref.startsWith('mailto:'))continue;if(!fs.existsSync(ref)){console.error(`${page}: link ausente ${ref}`);failed=true}}}
for(const json of ['assets/data/dashboard.json','assets/data/habits.json'])JSON.parse(fs.readFileSync(json,'utf8'));
if(failed)process.exit(1);console.log(`OK: ${pages.length} páginas, links locais e JSON validados.`);
