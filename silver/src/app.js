var NUM='{{WA_NUMBER}}';
function wa(m){return 'https://wa.me/'+NUM+'?text='+encodeURIComponent(m)}
var u=wa('Hola, quiero cotizar un servicio');
document.getElementById('wa').href=u;document.getElementById('wa2').href=u;
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.1}):null;
function observe(){document.querySelectorAll('.rv:not(.in)').forEach(function(el,i){if(io){el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)}else el.classList.add('in')})}
function show(t){
  document.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x.dataset.t===t)});
  document.querySelectorAll('section.tab').forEach(function(x){x.classList.toggle('on',x.id===t)});observe()}
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.t);window.scrollTo({top:0,behavior:'smooth'})})});
document.getElementById('goLab').addEventListener('click',function(){show('tienda');setTimeout(function(){document.getElementById('labT').scrollIntoView({behavior:'smooth'})},50)});
observe();
var P={v:'key',t:'Tu nombre',e:'⭐',c:'linear-gradient(135deg,#ff9f0a,#ff375f)'},prod=document.getElementById('prod');
function draw(){prod.className='prod '+(P.v==='key'?'key':'case'+(P.v==='glass'?' glass':''));prod.style.background=P.c;
  document.getElementById('pem').textContent=P.e;document.getElementById('ptx').textContent=P.t||' '}
function group(id,fn){document.querySelectorAll('#'+id+' button').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('#'+id+' button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');fn(b)})})}
group('prodC',function(b){P.v=b.dataset.v;draw()});
group('emC',function(b){P.e=b.textContent;draw()});
group('colC',function(b){P.c=b.dataset.v;draw()});
document.getElementById('txt').addEventListener('input',function(e){P.t=e.target.value;draw()});
document.getElementById('order').addEventListener('click',function(){
  var n={key:'llavero',case:'estuche en aluminio',glass:'estuche en vidrio'}[P.v];
  window.open(wa('Hola, quiero un '+n+' con el texto "'+P.t+'" y el ícono '+P.e+'. ¿Me cotizas?'),'_blank')});
draw();
var ps=['Foto de producto: llavero de aluminio con diseño neón, fondo de estudio, luz suave…','Reel de 15 s mostrando el proceso de estampado en estuches de vidrio…','Calendario de 30 días de contenido para una tienda de regalos personalizados…'],pi=0,pc=0,pe=document.getElementById('pt');
function type(){var t=ps[pi];if(pc<=t.length){pe.textContent=t.slice(0,pc++);setTimeout(type,38)}else{setTimeout(function(){pc=0;pi=(pi+1)%ps.length;type()},2200)}}
type();
var r1=document.getElementById('r1'),on=false;
setInterval(function(){on=!on;r1.classList.toggle('on',on)},1500);

document.getElementById('goCv').addEventListener('click',function(){show('perfil');window.scrollTo({top:0,behavior:'smooth'});setTimeout(function(){var s=document.getElementById('perfil');s.scrollIntoView({behavior:'smooth'})},50)});
