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
    document.title=(names[t]?T(names[t])+' · ':'')+'JSebasurb';
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

/* ---------- Pestaña "Proyectos" agrupa Portafolio, Apps creadas y Herramientas (subpestañas) ---------- */
(function(){
  var HUB={proyectos:'Portafolio',cato:'Apps creadas',tools:'Herramientas',tienda:'Tienda',imp3d:'Impresión 3D',video:'Audiovisual',juegos:'Juegos',ia:'Contenido IA'};
  var base=show, sub=null;
  function ensureSub(){
    if(sub) return sub;
    sub=document.createElement('div'); sub.className='hubnav'; sub.setAttribute('role','tablist');
    Object.keys(HUB).forEach(function(k){
      var b=document.createElement('button'); b.type='button'; b.dataset.hub=k; b.textContent=T(HUB[k]);
      b.addEventListener('click',function(){show(k);window.scrollTo({top:0,behavior:'smooth'})});
      sub.appendChild(b);
    });
    return sub;
  }
  show=function(t){
    var h=(t==='hub')?'proyectos':(HUB[t]?t:null);
    base(h||t);
    if(!h) return;
    document.querySelectorAll('.tabs button').forEach(function(x){var on=x.dataset.t==='hub';x.classList.toggle('on',on);x.setAttribute('aria-selected',on?'true':'false')});
    var s=ensureSub(), sec=document.getElementById(h);
    s.querySelectorAll('button').forEach(function(b){var on=b.dataset.hub===h;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false')});
    if(sec && s.parentNode!==sec) sec.insertBefore(s,sec.firstChild);
    var act=s.querySelector('button.on'); if(act && act.scrollIntoView && s.scrollWidth>s.clientWidth) act.scrollIntoView({inline:'center',block:'nearest'});
  };
  /* enlace directo (#cato, #tools, #proyectos): aplicar la vista ahora que la capa ya existe */
  var k=location.hash.slice(1);
  if(HUB[k]) show(k);
})();

/* ---------- Mensaje introductorio por área (titular, etiqueta y descripción del inicio) ---------- */
(function(){
  var MSG={
    perfil:{es:['Machine Learning · Ventas · Power BI · IA','Hola, soy ','Sebas.','Ingeniero en automática industrial enfocado en ML, ventas técnicas e IA. Aquí están mi perfil, mis proyectos y mi taller 3D.'],
            en:['Machine Learning · Sales · Power BI · AI','Hi, I’m ','Sebas.','Industrial automation engineer focused on ML, technical sales and AI. Here are my profile, my projects and my 3D workshop.']},
    proyectos:{es:['Portafolio','Lo que he ','construido.','Proyectos de datos, automatización y producción, con sus herramientas listas para probar.'],
            en:['Portfolio','What I have ','built.','Data, automation and production projects, with their tools ready to try.']},
    cato:{es:['Academia','Aprende ','tornillería.','Preguntas por niveles, curiosidades y referencias de roscas, cabezas y puntas.'],
            en:['Academy','Learn ','about fasteners.','Leveled questions, curiosities and references on threads, heads and points.']},
    tools:{es:['Herramientas','Pruébalas ','aquí.','Calculadoras, ETL, mantenimiento predictivo, visión y producción. Todo corre en tu navegador.'],
            en:['Tools','Try them ','here.','Calculators, ETL, predictive maintenance, vision and production. Everything runs in your browser.']},
    tienda:{es:['Estampados · Taller 3D','Hazlo ','tuyo.','Llaveros y estuches personalizados. Diseña el tuyo y pídelo por WhatsApp.'],
            en:['Prints · 3D workshop','Make it ','yours.','Custom keychains and cases. Design yours and order it on WhatsApp.']},
    imp3d:{es:['Impresión 3D','Piezas ','en 3D.','Prototipos, repuestos y piezas funcionales en PLA, PETG y más.'],
            en:['3D printing','Parts ','in 3D.','Prototypes, spare parts and functional pieces in PLA, PETG and more.']},
    video:{es:['Audiovisual · IA','Mira mi ','contenido.','Videos, shorts y avatares con IA. Conoce mi canal Akazu IA.'],
            en:['Audiovisual · AI','Watch my ','content.','AI videos, shorts and avatars. Check out my Akazu AI channel.']},
    juegos:{es:['Arcade · Agilidad mental','Juega ','y mejora.','Juegos para el celular y ejercicios de agilidad mental tipo entrevista.'],
            en:['Arcade · Mental agility','Play ','and improve.','Mobile games and interview-style mental agility exercises.']},
    auto:{es:['Automatización · n8n','Tu negocio, ','en piloto automático.','Conecta tus herramientas con flujos, APIs y chatbots 24/7.'],
            en:['Automation · n8n','Your business, ','on autopilot.','Connect your tools with workflows, APIs and 24/7 chatbots.']},
    ia:{es:['Contenido IA','Contenido que ','vende.','Imágenes, videos y textos con inteligencia artificial para tu marca.'],
            en:['AI content','Content that ','sells.','Images, videos and texts made with artificial intelligence for your brand.']},
    ing:{es:['Ingeniería','Ingeniería ','que funciona.','Automatización industrial, PLC, programación y asesoría técnica.'],
            en:['Engineering','Engineering ','that works.','Industrial automation, PLC, programming and technical consulting.']},
    blog:{es:['Blog técnico','Notas ','de ingeniería.','Ideas cortas sobre datos, automatización y producción.'],
            en:['Technical blog','Engineering ','notes.','Short ideas on data, automation and production.']},
    contacto:{es:['Contacto','Hablemos de ','tu proyecto.','Cuéntame tu idea y te respondo con una cotización.'],
            en:['Contact','Let’s talk about ','your project.','Tell me your idea and I’ll reply with a quote.']}
  };
  function setHero(key){
    var m=MSG[key]; if(!m) return;
    var l=(window.LANG==='en')?'en':'es', v=m[l], hero=document.querySelector('.hero'); if(!hero) return;
    hero.classList.toggle('is-card', key==='perfil');
    var eb=hero.querySelector('.eyebrow'), h1=hero.querySelector('h1'), lead=hero.querySelector('.lead');
    if(eb) eb.textContent=v[0];
    if(h1) h1.innerHTML=v[1].replace(/&/g,'&amp;').replace(/</g,'&lt;')+'<span>'+v[2].replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span>';
    if(lead) lead.textContent=v[3];
  }
  var base=show;
  show=function(t){
    base(t);
    setHero(t==='hub'?'proyectos':t);
  };
  var k=location.hash.slice(1);
  setHero(k?(k==='hub'?'proyectos':k):'perfil');
})();

/* ---------- Carga diferida de módulos: cada sección descarga su código al abrirse por primera vez ---------- */
(function(){
  var LAZY={juegos:['games'],cato:['cato'],imp3d:['stl'],
            tools:['tools','threads','quote','etl','csvview','maint','vision','prod','fichas']};
  var loaded={};
  function loadMod(n){
    return new Promise(function(res,rej){
      if(loaded[n]||window.LAZY_READY){loaded[n]=1;return res();}
      var s=document.createElement('script');
      s.src=((window.CFG&&window.CFG.root)||'')+'assets/js/'+n+'.js';
      s.onload=function(){loaded[n]=1;res();};
      s.onerror=function(){rej(new Error('No se pudo cargar '+n));};
      document.body.appendChild(s);
    });
  }
  function loadGroup(list){
    return list.reduce(function(p,n){return p.then(function(){return loadMod(n);});},Promise.resolve());
  }
  window.LAZY_LOAD=loadGroup;
  var base=show;
  show=function(t){
    base(t);
    if(LAZY[t]) loadGroup(LAZY[t]).catch(function(e){console.warn(e);});
  };
  /* precarga en segundo plano, sin bloquear la primera carga */
  window.addEventListener('load',function(){
    setTimeout(function(){
      Object.keys(LAZY).forEach(function(k){loadGroup(LAZY[k]).catch(function(){});});
    },4000);
  });
  var k=location.hash.slice(1);
  if(LAZY[k]) loadGroup(LAZY[k]).catch(function(){});
})();

/* Tarjeta 3D: gira al tocarla e inclina siguiendo el puntero */
(function(){
  var el=document.getElementById('bc3d'), card=document.getElementById('bc3dCard'); if(!el||!card) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var flipped=false, base={x:0,y:0};
  function apply(x,y){ card.style.transform=(flipped?'rotateY(180deg) ':'')+'rotateX('+x+'deg) rotateY('+y+'deg)'; }
  function flip(){ flipped=!flipped; el.classList.toggle('flipped',flipped); apply(0,0); }
  el.addEventListener('click',flip);
  el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); } });
  if(!reduce){
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect(), px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      apply(-py*12, px*14);
    });
    el.addEventListener('pointerleave',function(){ apply(0,0); });
  }
})();
