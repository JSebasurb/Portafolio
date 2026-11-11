/* CATO · Academia de tornillería: quiz por niveles, curiosidades, referencias y progreso (XP) */
(function(){
  var T = window.T || function(s){return s};
  var root = document.getElementById('cato'); if(!root) return;
  var BANK = null, KEY = 'gm-cato-v1', state = load(), cur = null;
  function load(){try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)return s}catch(e){}return {xp:0,done:{},best:{},streak:0,lastDay:''}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){} renderStats()}
  function rank(){var x=state.xp;return x>=1800?'Maestro CATO':x>=1200?'Especialista':x>=700?'Técnico':x>=300?'Inspector':'Aprendiz'}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function $(s){return root.querySelector(s)}
  function $$(s){return [...root.querySelectorAll(s)]}
  function view(id){$$('.cv').forEach(function(v){v.hidden=v.id!==id});var top=Math.max(0,root.getBoundingClientRect().top+scrollY-64);var de=document.documentElement,prev=de.style.scrollBehavior;de.style.scrollBehavior='auto';window.scrollTo(0,top);de.style.scrollBehavior=prev}
  function renderStats(){
    $('#cStats').innerHTML='<span><b>'+state.xp+'</b> XP</span><span>'+esc(rank())+'</span><span>'+Object.keys(state.done).length+'/'+(BANK?BANK.q.length:0)+' '+T('completadas')+'</span>';
  }
  function levels(){
    var m={};BANK.q.forEach(function(q){(m[q.l]=m[q.l]||[]).push(q)});return m;
  }
  function renderHome(){
    view('cHome');
    var L=levels(),html='';
    Object.keys(L).sort(function(a,b){return a-b}).forEach(function(l){
      var qs=L[l],ok=qs.filter(function(q){return state.done[q.t]}).length;
      var pct=Math.round(ok/qs.length*100);
      html+='<button class="clvl" data-l="'+l+'"><b>'+T('Nivel')+' '+l+'</b><small>'+qs.length+' '+T('preguntas')+' · '+ok+' '+T('listas')+'</small><span class="cbar"><i style="width:'+pct+'%"></i></span></button>';
    });
    $('#cLevels').innerHTML=html;
    var cats=[];BANK.q.forEach(function(q){if(cats.indexOf(q.c)<0)cats.push(q.c)});
    $('#cCats').innerHTML=cats.map(function(c){return '<button class="chip" data-c="'+esc(c)+'">'+esc(c)+'</button>'}).join('');
  }
  function startQuiz(list,title){
    cur={list:list,i:0,ok:0,title:title,answered:false};
    view('cQuiz');$('#cQTitle').textContent=title;next();
  }
  function next(){
    if(cur.i>=cur.list.length){return finish()}
    var q=cur.list[cur.i];cur.answered=false;
    $('#cProg').style.width=(cur.i/cur.list.length*100)+'%';
    $('#cCount').textContent=(cur.i+1)+' / '+cur.list.length;
    $('#cCat').textContent=q.c+' · '+T('Nivel')+' '+q.l;
    $('#cQ').textContent=q.t;
    $('#cOpts').innerHTML=q.o.map(function(o,i){return '<button class="copt" data-i="'+i+'">'+esc(o)+'</button>'}).join('');
    $('#cExp').hidden=true;$('#cNext').hidden=true;
  }
  function answer(i){
    if(cur.answered)return;cur.answered=true;
    var q=cur.list[cur.i],btns=$$('.copt'),good=i===q.a;
    btns.forEach(function(b,k){b.disabled=true;if(k===q.a)b.classList.add('ok');else if(k===i)b.classList.add('no')});
    if(good){cur.ok++;state.xp+=10+q.l*2;flash(true)}else{flash(false)}
    state.done[q.t]=1;
    $('#cExp').textContent=(good?'✔ '+T('Correcto. '):'✖ '+T('Incorrecto. '))+q.e;$('#cExp').hidden=false;
    $('#cNext').hidden=false;$('#cNext').textContent=cur.i+1<cur.list.length?T('Siguiente ›'):T('Ver resultado');
    save();
  }
  function flash(ok){var c=$('#cQCard');c.classList.remove('gl','bd');void c.offsetWidth;c.classList.add(ok?'gl':'bd')}
  function finish(){
    var pct=Math.round(cur.ok/cur.list.length*100);
    var b=state.best[cur.title]||0;if(pct>b)state.best[cur.title]=pct;save();
    $('#cResTitle').textContent=pct>=80?T('¡Excelente!'):pct>=50?T('Buen trabajo'):T('Sigue practicando');
    $('#cResBody').textContent=T('Acertaste')+' '+cur.ok+' '+T('de')+' '+cur.list.length+' ('+pct+'%). '+T('Mejor resultado')+': '+(state.best[cur.title]||0)+'%.';
    view('cResult');
  }
  function renderCuriosity(){
    var c=BANK.cu[Math.floor(Math.random()*BANK.cu.length)];
    $('#cCuCat').textContent=c.c;$('#cCuT').textContent=c.t;$('#cCuF').textContent=c.f;$('#cCuQ').textContent=c.q;
    view('cCuri');
  }
  function renderRef(kind){
    view('cRef');
    var list={ref:BANK.ref,mt:BANK.mt,dc:BANK.dc}[kind]||BANK.ref;
    $('#cRefBody').innerHTML='<div class="rtab">'+[['ref',T('Referencias')],['mt',T('Abreviaturas')],['dc',T('Decodificar')]].map(function(t){return '<button data-r="'+t[0]+'" class="'+(t[0]===kind?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div>'+
      '<div class="rlist">'+list.map(function(r){return '<div class="ritem"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>'}).join('')+'</div>';
  }
  /* ----- eventos ----- */
  root.addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;
    if(t.dataset.app==='academia'){ $('#appGrid').hidden=true; $('#academyView').hidden=false; if(BANK) renderHome(); return; }
    if(t.id==='appBack'){ $('#academyView').hidden=true; $('#appGrid').hidden=false; window.scrollTo({top:Math.max(0,root.getBoundingClientRect().top+window.scrollY-64),behavior:'auto'}); return; }
    if(t.classList.contains('clvl')){var l=+t.dataset.l;startQuiz(BANK.q.filter(function(q){return q.l===l}).sort(function(){return Math.random()-.5}).slice(0,10),T('Nivel')+' '+l);return}
    if(t.classList.contains('chip')){var c=t.dataset.c;startQuiz(BANK.q.filter(function(q){return q.c===c}).sort(function(){return Math.random()-.5}).slice(0,10),c);return}
    if(!BANK) return;
    if(t.id==='cMixBtn'){startQuiz(BANK.q.slice().sort(function(){return Math.random()-.5}).slice(0,10),T('Repaso mixto'));return}
    if(t.dataset.cato){var g=t.dataset.cato;if(g==='cHome')renderHome();else if(g==='cCuri')renderCuriosity();else if(g==='cRef')renderRef('ref');return}
    if(t.classList.contains('copt')){answer(+t.dataset.i);return}
    if(t.id==='cNext'){cur.i++;next();return}
    if(t.dataset.r){renderRef(t.dataset.r);return}
    if(t.id==='cReset'){if(confirm(T('¿Borrar tu progreso en la academia?'))){state={xp:0,done:{},best:{},streak:0,lastDay:''};save();renderHome()}return}
  });
  function useBank(b){
    var en=(window.LANG==='en'&&b.en)?b.en:null;
    var qs=en?b.q.map(function(q){var x=en[q.t];return x?{c:q.c,l:q.l,t:x.t,o:x.o,a:q.a,e:x.e}:q;}):b.q;
    BANK={q:qs,cu:b.cu,ref:b.ref,mt:b.mt,dc:b.dc}; renderHome(); renderStats();
  }
  function init(){
    if(window.CATO_BANK){ useBank(window.CATO_BANK); return; }
    if(window.CATO_BANK_PENDING){ window.CATO_BANK_PENDING.then(useBank); return; }
    fetch(window.CFG.root+'assets/apps/cato/bank.json').then(function(r){return r.json()}).then(useBank).catch(function(){
      $('#cLevels').innerHTML='<p>'+T('No se pudo cargar el contenido. Intenta de nuevo.')+'</p>';
    });
  }
  init();
})();
