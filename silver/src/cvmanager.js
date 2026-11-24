/* Gestión de CV: áreas, versiones con PDF, ficha de postulaciones con seguimiento.
   Datos en localStorage ('cvmgr.v1'); PDF en IndexedDB. Todo queda en este navegador. */
(function(){
  var root=document.getElementById('cvMgr'); if(!root) return;
  var EN=window.LANG==='en';
  function L(es,en){return EN?en:es;}
  var KEY='cvmgr.v1';
  var ESTADOS=[['enviada',L('Enviada','Sent')],['revision',L('En revisión','Under review')],['entrevista',L('Entrevista','Interview')],['oferta',L('Oferta','Offer')],['rechazada',L('No seleccionado','Not selected')]];
  var ACTIVOS=['enviada','revision','entrevista'];
  function hoy(){return new Date().toISOString().slice(0,10);}
  function addDays(iso,n){var d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);}
  function icsDate(iso){return iso.replace(/-/g,"");}
  function icsEsc(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");}
  function uid(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36);}
  function load(){
    try{var d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.areas&&d.areas.length){d.versions=d.versions||[];d.apps=d.apps||[];return d;}}catch(e){}
    return {areas:[{id:'general',name:L('General','General')}],versions:[],apps:[]};
  }
  var data=load();
  var state={area:(data.lastArea&&data.areas.some(function(a){return a.id===data.lastArea;}))?data.lastArea:data.areas[0].id, busq:'', filtro:'', vista:(data.lastView==='apps'?'apps':'cv')};
  var msgEl=document.createElement('p'); msgEl.className='etlmuted cvmsg'; msgEl.setAttribute('aria-live','polite');
  function msg(t){msgEl.textContent=t;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){msg(L('No se pudo guardar en este navegador.','Could not save in this browser.'));return false;}}
  function el(tag,attrs,kids){
    var n=document.createElement(tag);
    if(attrs) for(var k in attrs){ if(k==='text') n.textContent=attrs[k]; else if(k==='class') n.className=attrs[k]; else n.setAttribute(k,attrs[k]); }
    (kids||[]).forEach(function(c){ if(c) n.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return n;
  }
  function downloadBlob(blob,name){
    var u=URL.createObjectURL(blob); var a=el('a',{href:u,download:name});
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},4000);
  }
  /* IndexedDB para los PDF */
  var dbp=null;
  function db(){
    if(dbp) return dbp;
    dbp=new Promise(function(res,rej){
      var r=indexedDB.open('cvmgr',1);
      r.onupgradeneeded=function(){r.result.createObjectStore('files');};
      r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);};
    });
    return dbp;
  }
  function putFile(id,blob){return db().then(function(d){return new Promise(function(res,rej){var tx=d.transaction('files','readwrite'); tx.objectStore('files').put(blob,id); tx.oncomplete=res; tx.onerror=function(){rej(tx.error);};});});}
  function getFile(id){return db().then(function(d){return new Promise(function(res,rej){var q=d.transaction('files').objectStore('files').get(id); q.onsuccess=function(){res(q.result);}; q.onerror=function(){rej(q.error);};});});}
  function delFile(id){return db().then(function(d){return new Promise(function(res){var tx=d.transaction('files','readwrite'); tx.objectStore('files').delete(id); tx.oncomplete=res; tx.onerror=res;});}).catch(function(){});}

  /* sincronización con el tablero de tareas: cada postulación es una tarea */
  var TKEY='tablero-tareas.v1';
  function colFor(estado){return (estado==='oferta'||estado==='rechazada')?2:1;}
  function readTasks(){try{var t=JSON.parse(localStorage.getItem(TKEY)||'[]');return Array.isArray(t)?t:[];}catch(e){return [];}}
  function writeTasks(t){try{localStorage.setItem(TKEY,JSON.stringify(t));}catch(e){}}
  function syncTask(a){
    var tasks=readTasks(), id='app-'+a.id, ver=verById(a.version);
    var title=a.empresa+' — '+a.cargo, notes=(ver?'CV: '+verLabel(ver):'CV: sin registrar')+(a.link?'\n'+a.link:'');
    var t=tasks.find(function(x){return x.id===id;});
    if(t){t.title=title;t.notes=notes;t.col=colFor(a.estado);}
    else tasks.push({id:id,title:title,notes:notes,p:'media',col:colFor(a.estado)});
    writeTasks(tasks);
  }
  function removeTask(aid){writeTasks(readTasks().filter(function(x){return x.id!=='app-'+aid;}));}
  /* bases de CV precargadas: solo si la herramienta está vacía (una sola vez) */
  var BASE_CSS=(document.querySelector('link[href*="styles.css"]')||{getAttribute:function(){return "";}}).getAttribute('href')||'';
  var DOCS_BASE=BASE_CSS.replace(/css\/styles\.css.*$/,'')+'docs/';
  function ensureArea(name){var a=data.areas.find(function(x){return x.name===name;});if(!a){a={id:uid(),name:name};data.areas.push(a);}return a.id;}
  function b64ToBlob(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:'application/pdf'});}
  function loadManifest(){
    if(window.CV_BASES_INLINE){
      return Promise.resolve(window.CV_BASES_INLINE.map(function(it){return {file:it.file,area:it.area,name:it.name,desc:it.desc,blob:b64ToBlob(it.b64)};}));
    }
    return fetch(DOCS_BASE+'cv-bases.json').then(function(r){if(!r.ok)throw 0;return r.json();});
  }
  function fetchBlob(item){
    if(item.blob)return Promise.resolve(item.blob);
    return fetch(DOCS_BASE+item.file).then(function(r){if(!r.ok)throw 0;return r.blob();});
  }
  /* bases de CV: al abrir si la herramienta está vacía (una vez), o con el botón 'Cargar bases' */
  function seedBases(mode){
    /* mode: undefined = automático (solo si está vacía, una vez); 'update' = botón: actualiza y agrega */
    var manual=mode==='update';
    if(!manual){
      if(localStorage.getItem('cvmgr.seeded'))return;
      if(data.versions.length){localStorage.setItem('cvmgr.seeded','1');return;}
    }
    var updated=0, added=0;
    loadManifest().then(function(list){
      var first=null;
      return list.reduce(function(chain,item){
        return chain.then(function(){
          var existing=data.versions.find(function(v){return v.name===item.name&&areaName(v.area)===item.area;});
          if(existing&&!manual)return;
          return fetchBlob(item).then(function(blob){
            if(existing){
              return putFile(existing.id,blob).then(function(){existing.file=item.file;existing.desc=item.desc;existing.date=hoy();updated++;});
            }
            var aid=ensureArea(item.area), id=uid();
            if(first===null)first=aid;
            added++;
            return putFile(id,blob).then(function(){data.versions.push({id:id,area:aid,name:item.name,desc:item.desc,date:hoy(),file:item.file});});
          });
        });
      },Promise.resolve()).then(function(){
        if(first!==null)state.area=first;
        localStorage.setItem('cvmgr.seeded','1');
        data.lastArea=state.area;
        save();
        render();
        if(manual)msg(L('CVs revisados: '+updated+' actualizados · '+added+' nuevos.','CVs checked: '+updated+' updated · '+added+' new.'));
      });
    }).catch(function(){msg(L('No se pudieron leer las CVs base del proyecto.','Could not read the base CVs from the project.'));});
  }
  function areaName(id){var a=data.areas.find(function(x){return x.id===id;}); return a?a.name:'—';}
  function verById(id){return data.versions.find(function(v){return v.id===id;});}
  function verLabel(v){return areaName(v.area)+' · '+v.name;}
  function usos(vid){return data.apps.filter(function(a){return a.version===vid;}).length;}
  function descargarVersion(v){
    getFile(v.id).then(function(blob){
      if(!blob) return msg(L('El PDF ya no está guardado en este navegador.','The PDF is no longer saved in this browser.'));
      downloadBlob(blob,v.file||'CV.pdf');
    }).catch(function(){msg(L('No se pudo leer el PDF.','Could not read the PDF.'));});
  }

  /* 1 · Áreas */
  function sectionAreas(){
    var chips=el('div',{class:'cvchips'});
    data.areas.forEach(function(a){
      var n=data.versions.filter(function(v){return v.area===a.id;}).length;
      var b=el('button',{type:'button',class:'cvchip'+(a.id===state.area?' on':''),text:a.name+' ('+n+')'});
      b.addEventListener('click',function(){state.area=a.id; render();});
      chips.appendChild(b);
    });
    var nameIn=el('input',{type:'text',maxlength:'40',placeholder:L('Nombre del área nueva','New area name'),'aria-label':L('Nombre del área nueva','New area name')});
    var add=el('button',{type:'button',class:'pill sm',text:L('+ Área','+ Area')});
    add.addEventListener('click',function(){
      var n=nameIn.value.trim(); if(!n) return msg(L('Escribe el nombre del área.','Write the area name.'));
      if(data.areas.some(function(a){return a.name.toLowerCase()===n.toLowerCase();})) return msg(L('Ya existe un área con ese nombre.','An area with that name already exists.'));
      var id=uid(); data.areas.push({id:id,name:n}); state.area=id; if(save()) render();
    });
    var del=el('button',{type:'button',class:'link',text:L('Eliminar área actual','Delete current area')});
    del.addEventListener('click',function(){
      if(data.areas.length<2) return msg(L('Debe quedar al menos un área.','At least one area must remain.'));
      if(data.versions.some(function(v){return v.area===state.area;})) return msg(L('Elimina primero las versiones de esta área.','Delete this area\'s versions first.'));
      if(!confirm(L('¿Eliminar esta área?','Delete this area?'))) return;
      data.areas=data.areas.filter(function(a){return a.id!==state.area;}); state.area=data.areas[0].id; if(save()) render();
    });
    return el('section',{class:'cvsec'},[el('h3',{text:L('1 · Áreas','1 · Areas')}),chips,el('div',{class:'cvrow'},[nameIn,add,del])]);
  }

  /* 2 · Versiones del área seleccionada */
  function sectionVersions(){
    var vs=data.versions.filter(function(v){return v.area===state.area;});
    var list=el('div',{class:'cvlist'});
    if(!vs.length) list.appendChild(el('p',{class:'etlmuted',text:L('Aún no hay versiones en esta área.','No versions in this area yet.')}));
    vs.forEach(function(v){
      var dl=el('button',{type:'button',class:'pill sm',text:L('Descargar','Download')});
      dl.addEventListener('click',function(){descargarVersion(v);});
      var upd=el('input',{type:'file',accept:'application/pdf,.pdf',class:'cvhidden','aria-label':L('Reemplazar PDF','Replace PDF')});
      upd.addEventListener('change',function(){
        var f=upd.files&&upd.files[0]; if(!f) return;
        if(f.size>8*1024*1024) return msg(L('El PDF supera 8 MB.','The PDF is larger than 8 MB.'));
        putFile(v.id,f).then(function(){v.file=f.name; v.date=hoy(); if(save()) render(); msg(L('PDF actualizado. Las postulaciones anteriores conservan la versión.','PDF updated. Earlier applications keep this version.'));})
          .catch(function(){msg(L('No se pudo guardar el PDF.','Could not save the PDF.'));});
      });
      var rep=el('button',{type:'button',class:'link',text:L('Reemplazar PDF','Replace PDF')});
      rep.addEventListener('click',function(){upd.click();});
      var rm=el('button',{type:'button',class:'link',text:L('Eliminar','Delete')});
      rm.addEventListener('click',function(){
        var n=usos(v.id);
        var txt=n?L('Esta versión está usada en '+n+' postulación(es). ¿Eliminarla igual? Esas postulaciones quedarán sin PDF.','This version is used in '+n+' application(s). Delete it anyway? Those applications will lose the PDF.'):L('¿Eliminar esta versión?','Delete this version?');
        if(!confirm(txt)) return;
        data.versions=data.versions.filter(function(x){return x.id!==v.id;});
        if(save()) delFile(v.id).then(render);
      });
      list.appendChild(el('article',{class:'cvcard'},[
        el('div',{class:'cvhead'},[el('b',{text:v.name}),el('span',{class:'etlmuted',text:(v.date||'')+' · '+L('usada en ','used in ')+usos(v.id)+' '+L('postulación(es)','application(s)')})]),
        el('p',{class:'etlmuted',text:v.desc||''}),
        el('p',{class:'etlmuted',text:(v.file||'')}),
        el('div',{class:'cvact'},[dl,rep,rm,upd])
      ]));
    });
    var nameI=el('input',{type:'text',maxlength:'60',placeholder:L('Nombre de la versión (ej.: Análisis de datos · v2)','Version name (e.g. Data analysis · v2)'),'aria-label':L('Nombre de la versión','Version name')});
    var descI=el('input',{type:'text',maxlength:'140',placeholder:L('Descripción breve: para qué postulación es','Short description: which application it is for'),'aria-label':L('Descripción breve','Short description')});
    var fileI=el('input',{type:'file',accept:'application/pdf,.pdf','aria-label':L('Archivo PDF del CV','CV PDF file')});
    var save_=el('button',{type:'button',class:'pill sm',text:L('Guardar versión','Save version')});
    save_.addEventListener('click',function(){
      var n=nameI.value.trim(), f=fileI.files&&fileI.files[0];
      if(!n) return msg(L('Ponle un nombre a la versión.','Give the version a name.'));
      if(!f) return msg(L('Selecciona el PDF del CV.','Select the CV PDF.'));
      if(f.size>8*1024*1024) return msg(L('El PDF supera 8 MB.','The PDF is larger than 8 MB.'));
      if(data.versions.some(function(v){return v.area===state.area&&v.name.toLowerCase()===n.toLowerCase();})) return msg(L('Ya hay una versión con ese nombre en esta área.','This area already has a version with that name.'));
      var id=uid();
      putFile(id,f).then(function(){
        data.versions.push({id:id,area:state.area,name:n,desc:descI.value.trim(),date:hoy(),file:f.name});
        if(save()) render();
      }).catch(function(){msg(L('No se pudo guardar el PDF en este navegador.','Could not save the PDF in this browser.'));});
    });
    return el('section',{class:'cvsec'},[
      el('h3',{text:L('2 · Versiones de CV · ','2 · CV versions · ')+areaName(state.area)}),
      list,
      el('div',{class:'cvform'},[nameI,descI,fileI,save_])
    ]);
  }

  /* 3 · Ficha de postulaciones */
  function sectionApps(){
    var empI=el('input',{type:'text',maxlength:'80',placeholder:L('Empresa','Company'),'aria-label':L('Empresa','Company')});
    var carI=el('input',{type:'text',maxlength:'80',placeholder:L('Cargo','Position'),'aria-label':L('Cargo','Position')});
    var linkI=el('input',{type:'url',maxlength:'300',placeholder:'https://…','aria-label':L('Enlace de la oferta','Job offer link')});
    var verS=el('select',{'aria-label':L('CV enviado','CV sent')});
    verS.appendChild(el('option',{value:'',text:L('— CV enviado —','— CV sent —')}));
    data.versions.forEach(function(v){verS.appendChild(el('option',{value:v.id,text:verLabel(v)}));});
    var fecI=el('input',{type:'date','aria-label':L('Fecha de postulación','Application date'),value:hoy()});
    var segI=el('input',{type:'date','aria-label':L('Fecha de seguimiento (sugerida: 7 días)','Follow-up date (suggested: 7 days)'),value:addDays(hoy(),7)});
    var notI=el('input',{type:'text',maxlength:'200',placeholder:L('Notas (contacto, siguiente paso…)','Notes (contact, next step…)'),'aria-label':L('Notas','Notes')});
    var add=el('button',{type:'button',class:'pill sm',text:L('Agregar postulación','Add application')});
    add.addEventListener('click',function(){
      var emp=empI.value.trim(), car=carI.value.trim(), link=linkI.value.trim();
      if(!emp||!car) return msg(L('Escribe la empresa y el cargo.','Write the company and the position.'));
      if(!verS.value) return msg(L('Elige el CV que enviaste.','Choose the CV you sent.'));
      if(link && !/^https:\/\//i.test(link)) return msg(L('El enlace debe empezar con https://','The link must start with https://'));
      var dup=data.apps.find(function(a){return a.empresa.toLowerCase()===emp.toLowerCase()&&a.cargo.toLowerCase()===car.toLowerCase();});
      if(dup && !confirm(L('Ya registraste esta postulación ('+dup.fecha+'). ¿Agregarla de nuevo?','You already logged this application ('+dup.fecha+'). Add it again?'))) return;
      var fechaApp=fecI.value||hoy();
      data.apps.unshift({id:uid(),empresa:emp,cargo:car,link:link,version:verS.value,fecha:fechaApp,seguimiento:segI.value||addDays(fechaApp,7),estado:'enviada',notas:notI.value.trim()});
      syncTask(data.apps[0]);
      if(save()) render();
    });
    var form=el('div',{class:'cvform'},[empI,carI,linkI,verS,fecI,segI,notI,add]);

    /* resumen */
    var conteo={}; ESTADOS.forEach(function(e){conteo[e[0]]=0;});
    data.apps.forEach(function(a){conteo[a.estado]=(conteo[a.estado]||0)+1;});
    var porVer={}; data.apps.forEach(function(a){if(a.version) porVer[a.version]=(porVer[a.version]||0)+1;});
    var top=null; Object.keys(porVer).forEach(function(k){if(!top||porVer[k]>porVer[top]) top=k;});
    var resumen=el('p',{class:'etlmuted cvresumen',text:
      L('Total: ','Total: ')+data.apps.length+' · '+L('Activas: ','Active: ')+ACTIVOS.reduce(function(s,k){return s+(conteo[k]||0);},0)+' · '+L('Entrevistas: ','Interviews: ')+(conteo.entrevista||0)+' · '+L('Ofertas: ','Offers: ')+(conteo.oferta||0)+
      (top&&verById(top)?' · '+L('CV más enviado: ','Most sent CV: ')+verLabel(verById(top))+' ('+porVer[top]+')':'')});

    /* filtros */
    var busq=el('input',{type:'search',placeholder:L('Buscar empresa o cargo','Search company or position'),value:state.busq,'aria-label':L('Buscar postulaciones','Search applications')});
    busq.addEventListener('input',function(){state.busq=busq.value; render();});
    var filtro=el('select',{'aria-label':L('Filtrar por estado','Filter by status')});
    filtro.appendChild(el('option',{value:'',text:L('Todos los estados','All statuses')}));
    ESTADOS.forEach(function(e){var o=el('option',{value:e[0],text:e[1]}); if(e[0]===state.filtro) o.selected=true; filtro.appendChild(o);});
    filtro.addEventListener('change',function(){state.filtro=filtro.value; render();});

    /* lista */
    var hoyS=hoy(); var q=state.busq.trim().toLowerCase();
    var shown=data.apps.filter(function(a){
      return (!state.filtro||a.estado===state.filtro) && (!q||(a.empresa+' '+a.cargo).toLowerCase().indexOf(q)>=0);
    });
    var list=el('div',{class:'cvlist'});
    if(!data.apps.length) list.appendChild(el('p',{class:'etlmuted',text:L('Aún no hay postulaciones guardadas.','No applications saved yet.')}));
    else if(!shown.length) list.appendChild(el('p',{class:'etlmuted',text:L('Ninguna postulación coincide con el filtro.','No application matches the filter.')}));
    shown.forEach(function(a){
      var est=el('select',{'aria-label':L('Estado','Status')});
      ESTADOS.forEach(function(e){var o=el('option',{value:e[0],text:e[1]}); if(e[0]===a.estado) o.selected=true; est.appendChild(o);});
      est.addEventListener('change',function(){a.estado=est.value; syncTask(a); if(save()) render();});
      var segIn=el('input',{type:'date','aria-label':L('Fecha de seguimiento','Follow-up date'),value:a.seguimiento||''});
      segIn.addEventListener('change',function(){a.seguimiento=segIn.value; if(save()) render();});
      var notas=el('input',{type:'text',maxlength:'200',value:a.notas||'','aria-label':L('Notas','Notes'),placeholder:L('Notas','Notes')});
      notas.addEventListener('change',function(){a.notas=notas.value.trim(); save();});
      var ver=verById(a.version);
      var open=a.link?el('a',{class:'pill sm',href:a.link,target:'_blank',rel:'noopener',text:L('Ver oferta ↗','View offer ↗')}):null;
      var dcv=ver&&ver.file?el('button',{type:'button',class:'pill sm',text:L('Descargar CV enviado','Download CV sent')}):null;
      if(dcv) dcv.addEventListener('click',function(){descargarVersion(ver);});
      var cal=a.seguimiento?el('button',{type:'button',class:'pill sm',text:L('Agendar seguimiento (.ics)','Add follow-up (.ics)')}):null;
      if(cal) cal.addEventListener('click',function(){
        /* 9:00 a.m. hora de Colombia (UTC-5, sin horario de verano) = 14:00 UTC; 30 min; aviso 15 min antes */
        var ahora=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
        var dia=icsDate(a.seguimiento);
        var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JS Soluciones//Gestion de CV//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',
          'UID:'+a.id+'@js-soluciones','DTSTAMP:'+ahora,'DTSTART:'+dia+'T140000Z','DTEND:'+dia+'T143000Z',
          'SUMMARY:'+icsEsc(L('Seguimiento: ','Follow-up: ')+a.empresa+' — '+a.cargo),
          'DESCRIPTION:'+icsEsc(L('CV enviado: ','CV sent: ')+(ver?verLabel(ver):L('no registrado','not recorded'))+(a.link?' · '+a.link:'')),
          'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(L('Seguimiento en 15 minutos','Follow-up in 15 minutes')),'TRIGGER:-PT15M','END:VALARM',
          'END:VEVENT','END:VCALENDAR'];
        downloadBlob(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}),'seguimiento-'+a.empresa.replace(/[^\w-]+/g,'_')+'.ics');
      });
      var rm=el('button',{type:'button',class:'link',text:L('Eliminar','Delete')});
      rm.addEventListener('click',function(){
        if(!confirm(L('¿Eliminar esta postulación?','Delete this application?'))) return;
        removeTask(a.id); data.apps=data.apps.filter(function(x){return x.id!==a.id;}); if(save()) render();
      });
      var vencido=a.seguimiento&&a.seguimiento<=hoyS&&ACTIVOS.indexOf(a.estado)>=0;
      var seguimientoTxt=a.seguimiento?(vencido?L('⚠ Seguimiento pendiente: ','⚠ Follow-up due: ')+a.seguimiento:L('Seguimiento: ','Follow-up: ')+a.seguimiento):L('Sin fecha de seguimiento','No follow-up date');
      list.appendChild(el('article',{class:'cvcard'+(vencido?' cvdue':'')},[
        el('div',{class:'cvhead'},[el('b',{text:a.empresa+' — '+a.cargo}),el('span',{class:'etlmuted',text:L('Postulada: ','Applied: ')+(a.fecha||'')})]),
        el('p',{class:'etlmuted',text:L('CV enviado: ','CV sent: ')+(ver?verLabel(ver):L('no registrado','not recorded'))}),
        el('p',{class:'etlmuted',text:seguimientoTxt}),
        el('div',{class:'cvact'},[el('label',{class:'etlmuted',text:L('Estado ','Status ')},[est]),el('label',{class:'etlmuted',text:L('Seguimiento ','Follow-up ')},[segIn])]),
        el('div',{class:'cvform'},[notas]),
        el('div',{class:'cvact'},[open,dcv,cal,rm])
      ]));
    });
    return el('section',{class:'cvsec'},[
      el('h3',{text:L('3 · Ficha de postulaciones','3 · Application tracker')}),
      resumen, form,
      el('div',{class:'cvrow'},[busq,filtro]),
      list
    ]);
  }

  /* Respaldo de datos (sin los PDF) */
  function backupBar(){
    var exp=el('button',{type:'button',class:'link',text:L('Exportar datos (JSON)','Export data (JSON)')});
    exp.addEventListener('click',function(){downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'cv-gestion.json');});
    var imp=el('input',{type:'file',accept:'application/json,.json','aria-label':L('Importar respaldo JSON','Import JSON backup'),class:'cvhidden'});
    imp.addEventListener('change',function(){
      var f=imp.files&&imp.files[0]; if(!f) return;
      f.text().then(function(t){
        var d=JSON.parse(t); if(!d||!d.areas||!d.versions||!d.apps) throw new Error('formato');
        if(!confirm(L('Reemplazar los datos actuales con este respaldo? Los PDF no se importan: vuelve a subirlos.','Replace the current data with this backup? PDFs are not imported: upload them again.'))) return;
        data=d; state.area=data.areas[0].id; if(save()) render();
      }).catch(function(){msg(L('El archivo no es un respaldo válido.','The file is not a valid backup.'));});
    });
    var impBtn=el('button',{type:'button',class:'link',text:L('Importar respaldo','Import backup')});
    impBtn.addEventListener('click',function(){imp.click();});
    return el('p',{class:'cvrow'},[exp,impBtn,imp,el('span',{class:'etlmuted',text:L('Los PDF se guardan en este navegador; el JSON respalda áreas, versiones y postulaciones.','PDFs are saved in this browser; the JSON backs up areas, versions and applications.')})]);
  }

  function loadBasesRow(){
    var bb=el('button',{type:'button',class:'pill sm',text:L('Actualizar CVs base','Update base CVs')});
    bb.addEventListener('click',function(){seedBases('update');});
    return el('div',{class:'cvrow'},[bb,el('span',{class:'etlmuted',text:L('Lee las CVs base del proyecto: actualiza las que ya tienes y agrega las que falten.','Reads the base CVs from the project: updates the ones you have and adds the missing ones.')})]);
  }
  function render(){
    data.lastArea=state.area; data.lastView=state.vista;
    root.textContent='';
    function tab(v,label){
      var b=el('button',{type:'button',class:'cvchip'+(state.vista===v?' on':''),text:label});
      b.setAttribute('aria-pressed',state.vista===v?'true':'false');
      b.addEventListener('click',function(){state.vista=v; render();});
      return b;
    }
    var nVer=data.versions.length, nApp=data.apps.length;
    var tabs=el('div',{class:'cvchips cvtabs','aria-label':L('Vistas de gestión de CV','CV manager views')},[
      tab('cv',L('Mis CV','My CVs')+' ('+nVer+')'),
      tab('apps',L('Postulaciones','Applications')+' ('+nApp+')')
    ]);
    var secciones = state.vista==='apps' ? [sectionApps()] : [sectionAreas(), sectionVersions()];
    root.appendChild(el('div',{class:'mini-card etlcard'},[
      el('div',{class:'etlhead'},[el('b',{text:L('Gestión de CV','CV manager')}),el('span',{class:'etlmuted',text:L('Organiza tus CV por área, descárgalos cuando los necesites y lleva el seguimiento de cada postulación.','Organize your CVs by area, download them when needed and track every application.')})]),
      tabs, msgEl, state.vista==='cv' ? loadBasesRow() : null
    ].concat(secciones, [backupBar()])));
    msg('');
  }
  render();
  seedBases();
})();
