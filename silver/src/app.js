var NUM=window.CFG.wa,T=window.T;
function wa(m){return 'https://wa.me/'+NUM+'?text='+encodeURIComponent(m)}
var u=wa(T('Hola, quiero cotizar un servicio'));
document.getElementById('wa').href=u;document.getElementById('wa2').href=u;
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.1}):null;
function observe(){document.querySelectorAll('.rv:not(.in)').forEach(function(el,i){if(io){el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)}else el.classList.add('in')})}
function show(t){
  document.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x.dataset.t===t)});
  document.querySelectorAll('section.tab').forEach(function(x){x.classList.toggle('on',x.id===t)});observe()}
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.t);window.scrollTo({top:0,behavior:'smooth'})})});
document.getElementById('goLab').addEventListener('click',function(){show('tienda');setTimeout(function(){document.getElementById('labT').scrollIntoView({behavior:'smooth'})},50)});
observe();
var P={v:'key',t:T('Tu nombre'),e:'⭐',c:'linear-gradient(135deg,#ff9f0a,#ff375f)'},prod=document.getElementById('prod');
function draw(){prod.className='prod '+(P.v==='key'?'key':'case'+(P.v==='glass'?' glass':''))+(P.img?' hasimg':'');prod.style.background=P.img?'#fff url('+P.img+') center/cover no-repeat':P.c;
  document.getElementById('ring').style.display=P.v==='key'?'block':'none';document.getElementById('modelF').hidden=P.v==='key';
  document.getElementById('pem').textContent=P.e;document.getElementById('ptx').textContent=P.t||' '}
function group(id,fn){document.querySelectorAll('#'+id+' button').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('#'+id+' button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');fn(b)})})}
group('prodC',function(b){P.v=b.dataset.v;draw()});
group('emC',function(b){P.e=b.textContent;draw()});
group('colC',function(b){P.c=b.dataset.v;draw()});
document.getElementById('txt').addEventListener('input',function(e){P.t=e.target.value;draw()});
document.getElementById('order').addEventListener('click',function(){
  var n=T({key:'llavero',case:'estuche en aluminio',glass:'estuche en vidrio'}[P.v]);
  var m=T('Hola, quiero un {n} con el texto "{t}" y el ícono {e}. ¿Me cotizas?').replace('{n}',function(){return n}).replace('{t}',function(){return P.t}).replace('{e}',function(){return P.e});
  var q=Math.max(1,parseInt(document.getElementById('qty').value,10)||1);
  if(q>1)m+=' '+T('Cantidad: {q}.').replace('{q}',q);
  var mod=document.getElementById('model').value.trim();
  if(P.v!=='key'&&mod)m+=' '+T('Modelo de celular: {m}.').replace('{m}',function(){return mod});
  if(P.img)m+=' '+T('Voy a enviarte mi imagen por este chat.');
  window.open(wa(m),'_blank')});
/* imagen propia: se redimensiona en el navegador y no se sube a ningún servidor */
var imgIn=document.getElementById('imgIn'),imgClr=document.getElementById('imgClr');
imgIn.addEventListener('change',function(e){var f=e.target.files[0];if(!f||!/^image\//.test(f.type))return;
  var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
    var s=Math.min(1,700/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);P.img=c.toDataURL('image/jpeg',.85);imgClr.hidden=false;draw()};im.src=r.result};r.readAsDataURL(f);e.target.value=''});
imgClr.addEventListener('click',function(){P.img='';imgClr.hidden=true;draw()});
document.getElementById('qty').addEventListener('change',function(e){var v=Math.min(999,Math.max(1,parseInt(e.target.value,10)||1));e.target.value=v});
document.querySelectorAll('.idea-go').forEach(function(b){b.addEventListener('click',function(){window.open(wa(T(b.dataset.msg)),'_blank')})});
draw();
var ps=[T('Foto de producto: llavero de aluminio con diseño neón, fondo de estudio, luz suave…'),T('Reel de 15 s mostrando el proceso de estampado en estuches de vidrio…'),T('Calendario de 30 días de contenido para una tienda de regalos personalizados…')],pi=0,pc=0,pe=document.getElementById('pt');
function type(){var t=ps[pi];if(pc<=t.length){pe.textContent=t.slice(0,pc++);setTimeout(type,38)}else{setTimeout(function(){pc=0;pi=(pi+1)%ps.length;type()},2200)}}
type();
var r1=document.getElementById('r1'),on=false;
setInterval(function(){on=!on;r1.classList.toggle('on',on)},1500);

document.getElementById('goCv').addEventListener('click',function(){show('perfil');window.scrollTo({top:0,behavior:'smooth'});setTimeout(function(){var s=document.getElementById('perfil');s.scrollIntoView({behavior:'smooth'})},50)});

/* ---------- Mejoras: enlaces por pestaña (#perfil, #tienda…), accesibilidad y tema ---------- */
(function(){
  var tabs=document.querySelector('.tabs');tabs.setAttribute('role','tablist');
  var base=show;
  show=function(t){
    base(t);
    document.querySelectorAll('.tabs button').forEach(function(b){b.setAttribute('role','tab');b.setAttribute('aria-selected',b.dataset.t===t?'true':'false')});
    try{history.replaceState(null,'','#'+t)}catch(e){}
    var names={perfil:'Perfil',proyectos:'Proyectos',tienda:'Tienda',imp3d:'Impresión 3D',video:'Audiovisual',juegos:'Juegos',auto:'Automatización',ia:'Contenido IA',ing:'Ingeniería',tools:'Herramientas',blog:'Blog',contacto:'Contacto'};
    document.title=(names[t]?T(names[t])+' · ':'')+'Juan Sebastián Sánchez';
    var lb=document.getElementById('langBtn');if(lb)lb.href=lb.getAttribute('data-base')+'#'+t;
  };
  function fromHash(){var id=location.hash.slice(1),el=id&&document.getElementById(id);if(el&&el.classList.contains('tab'))show(id)}
  window.addEventListener('hashchange',fromHash);
  var first=document.querySelector('section.tab.on');
  if(location.hash)fromHash();else if(first)show(first.id);
  /* tema claro/oscuro manual */
  var root=document.documentElement,btn=document.getElementById('themeBtn');
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches}
  try{var saved=localStorage.getItem('theme');if(saved)root.setAttribute('data-theme',saved)}catch(e){}
  btn.addEventListener('click',function(){
    var next=isDark()?'light':'dark';root.setAttribute('data-theme',next);
    try{localStorage.setItem('theme',next)}catch(e){}
  });
  /* botón flotante de WhatsApp aparece al hacer scroll */
  var fab=document.querySelector('.fab');
  window.addEventListener('scroll',function(){fab.classList.toggle('show',window.scrollY>400)},{passive:true});
})();

document.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(b){show(b.dataset.go);window.scrollTo({top:0,behavior:'smooth'})}});

/* ---------- Idioma (ES/EN) y app instalable (PWA) ---------- */
(function(){
  var lb=document.getElementById('langBtn');
  if(lb&&location.hash)lb.href=lb.getAttribute('data-base')+location.hash;
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',function(){navigator.serviceWorker.register(window.CFG.root+'sw.js').catch(function(){})});
  }
})();

/* ---------- Barra de pestañas: rueda del mouse, arrastre, flechas, teclado y centrado ---------- */
(function(){
  var tabs=document.getElementById('tabs'),prev=document.querySelector('.tnav.prev'),next=document.querySelector('.tnav.next');
  if(!tabs||!prev||!next)return;
  var raf=0;
  function state(){raf=0;var max=tabs.scrollWidth-tabs.clientWidth,x=tabs.scrollLeft,l=x>2,r=x<max-2;tabs.classList.toggle('fl',l);tabs.classList.toggle('fr',r);prev.hidden=!l;next.hidden=!r}
  function queue(){if(!raf)raf=requestAnimationFrame(state)}
  function center(smooth){var b=tabs.querySelector('button.on');if(!b)return;var left=b.offsetLeft-(tabs.clientWidth-b.offsetWidth)/2;tabs.scrollTo({left:Math.max(0,left),behavior:smooth===false?'auto':'smooth'})}
  function reveal(b){var pad=48,l=b.offsetLeft,r=l+b.offsetWidth;if(l<tabs.scrollLeft+pad)tabs.scrollTo({left:Math.max(0,l-pad),behavior:'smooth'});else if(r>tabs.scrollLeft+tabs.clientWidth-pad)tabs.scrollTo({left:r-tabs.clientWidth+pad,behavior:'smooth'})}
  tabs.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',function(){queue();center(false)});
  if(window.ResizeObserver)new ResizeObserver(queue).observe(tabs);
  /* flechas */
  [prev,next].forEach(function(b,i){b.addEventListener('click',function(){tabs.scrollBy({left:(i?1:-1)*tabs.clientWidth*0.65,behavior:'smooth'})})});
  /* rueda del mouse: el giro vertical mueve la barra */
  var wt=0;
  tabs.parentNode.addEventListener('wheel',function(e){
    if(tabs.scrollWidth<=tabs.clientWidth)return;var d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;if(e.deltaMode===1)d*=16;
    var max=tabs.scrollWidth-tabs.clientWidth;if((d<0&&tabs.scrollLeft<=0)||(d>0&&tabs.scrollLeft>=max))return;
    e.preventDefault();tabs.style.scrollBehavior='auto';tabs.scrollLeft+=d;clearTimeout(wt);wt=setTimeout(function(){tabs.style.scrollBehavior=''},140)
  },{passive:false});
  /* arrastrar con el mouse */
  var down=null,moved=false;
  tabs.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'||e.button!==0)return;down={x:e.clientX,s:tabs.scrollLeft};moved=false});
  window.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-down.x;if(!moved&&Math.abs(dx)>5){moved=true;tabs.classList.add('drag');tabs.style.scrollBehavior='auto'}if(moved)tabs.scrollLeft=down.s-dx});
  window.addEventListener('pointerup',function(){if(!down)return;down=null;if(moved){tabs.classList.remove('drag');tabs.style.scrollBehavior='';var stop=function(ev){ev.stopPropagation();ev.preventDefault()};tabs.addEventListener('click',stop,{capture:true,once:true});setTimeout(function(){tabs.removeEventListener('click',stop,true)},60)}});
  /* teclado: flechas, Inicio y Fin */
  tabs.addEventListener('keydown',function(e){
    var list=[].slice.call(tabs.querySelectorAll('button')),i=list.indexOf(document.activeElement);if(i<0)return;var n=null;
    if(e.key==='ArrowRight')n=list[(i+1)%list.length];else if(e.key==='ArrowLeft')n=list[(i-1+list.length)%list.length];else if(e.key==='Home')n=list[0];else if(e.key==='End')n=list[list.length-1];
    if(n){e.preventDefault();n.focus({preventScroll:true});reveal(n)}
  });
  tabs.addEventListener('focusin',function(e){if(e.target.tagName==='BUTTON')reveal(e.target)});
  /* al elegir una pestaña, centrarla en la barra */
  var base=show;show=function(t){base(t);center(true);queue()};
  window.addEventListener('load',function(){center(false);queue()});queue();center(false);
})();
