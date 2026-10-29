import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),stage=path.resolve(root,'../spex-stage');fs.mkdirSync(stage,{recursive:true});fs.rmSync(path.join(stage,'404.html'),{force:true});
const exclude=new Set(['build-design.mjs','design-styles.json','404.html']);
const files=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&!exclude.has(e.name)&&(/\.(?:js|mjs|css|json|svg|html|txt)$/.test(e.name)||['_headers','_redirects','.nojekyll'].includes(e.name))).map(e=>e.name);
for(const name of files){if(name==='index.html')fs.writeFileSync(path.join(stage,name),fs.readFileSync(path.join(root,name),'utf8').replace('<base href="/spx/">','<base href="/">'));else fs.copyFileSync(path.join(root,name),path.join(stage,name));}
for(const dir of ['fonts','vendor'])fs.cpSync(path.join(root,dir),path.join(stage,dir),{recursive:true});
const version=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).version;
fs.writeFileSync(path.resolve(root,'../firebase-release.json'),JSON.stringify({hosting:{site:'spx7',public:stage,ignore:['**/.*','**/_headers'],headers:[{source:'**',headers:[{key:'Cache-Control',value:'no-cache, max-age=0, must-revalidate'},{key:'X-Spex-Release',value:version}]}],rewrites:[{source:'**',destination:'/index.html'}]}},null,2));
console.log(JSON.stringify({files:files.length,stage,version}));

