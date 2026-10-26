// Silk fold field adapted from React Bits by David Haz, used within this site.
// See THIRD-PARTY-NOTICES.md for the MIT + Commons Clause license.
export function installAmbientSilk(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const surfaces=[];
 for(const [host,kind] of [[document.body,'page'],[document.querySelector('.site-footer'),'footer']]){
  if(!host)continue;
  const canvas=document.createElement('canvas');canvas.className='ambient-silk ambient-silk-'+kind;canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  if(!gl){canvas.remove();continue}
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null}return s};
  const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 point;void main(){gl_Position=vec4(point,0.,1.);}');
  const fragment=shader(gl.FRAGMENT_SHADER,`precision mediump float;
   uniform vec2 size;uniform float time;uniform vec3 tint;uniform float footer;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 uv=gl_FragCoord.xy/size;
    vec2 tex=uv*1.65;
    float t=time*.45;
    tex.y+=.03*sin(8.*tex.x-t);
    float pattern=.6+.4*sin(5.*(tex.x+tex.y+cos(3.*tex.x+5.*tex.y)+.02*t)+sin(20.*(tex.x+tex.y-.1*t)));
    float light=pow(max(0.,pattern),2.1);
    vec3 col=tint*light*.67-vec3(hash(gl_FragCoord.xy)*.055);
    col*=mix(.32,1.,smoothstep(0.,.85,uv.y)+footer*.2);
    gl_FragColor=vec4(max(vec3(0.),col),1.);
   }`);
  if(!vertex||!fragment){canvas.remove();continue}
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.remove();continue}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const point=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
  const uniforms={size:gl.getUniformLocation(program,'size'),time:gl.getUniformLocation(program,'time'),tint:gl.getUniformLocation(program,'tint'),footer:gl.getUniformLocation(program,'footer')};
  const surface={canvas,gl,program,buffer,point,uniforms,kind,visible:kind==='page',lost:false};surfaces.push(surface);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();surface.lost=true;canvas.style.opacity='0'});
  if(kind==='footer')new IntersectionObserver(([entry])=>{surface.visible=entry.isIntersecting},{rootMargin:'100px'}).observe(host);
 }
 let last=0,frame;
 const palette={default:[.49,.95,.16],forest:[.30,.49,.31],blue:[.36,.40,.68],teal:[.36,.68,.55],red:[.68,.36,.40],pink:[.68,.36,.61],mocha:[.60,.48,.31],surface:[.49,.95,.16],aero:[.18,.58,.82]};
 function draw(now){frame=requestAnimationFrame(draw);if(document.hidden||now-last<40)return;last=now;
  const theme=document.documentElement.dataset.theme||'default',paused=reduced.matches||document.documentElement.dataset.motion==='off';
  for(const s of surfaces){if(s.lost||!s.visible||(s.kind==='page'&&!document.body.classList.contains('utility-page'))||['amoled','dark'].includes(theme))continue;
   const {canvas,gl,program,buffer,point,uniforms}=s,r=canvas.getBoundingClientRect(),scale=Math.min(1,1100/Math.max(r.width,1)),w=Math.max(1,Math.round(r.width*scale)),h=Math.max(1,Math.round(r.height*scale));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
   gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);gl.uniform2f(uniforms.size,w,h);gl.uniform1f(uniforms.time,paused?12:now/1000);gl.uniform1f(uniforms.footer,s.kind==='footer'?1:0);gl.uniform3fv(uniforms.tint,palette[theme]||palette.default);gl.drawArrays(gl.TRIANGLES,0,6);
  }
 }
 frame=requestAnimationFrame(draw);
 window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
 window.addEventListener('pageshow',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)});
}
