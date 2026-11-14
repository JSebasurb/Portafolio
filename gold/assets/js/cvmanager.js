/* Gestión de CV: áreas, versiones con archivo y ficha de postulaciones.
   Todo se guarda en este navegador (localStorage para datos, IndexedDB para los PDF). */
(function(){
  var root=document.getElementById('cvMgr'); if(!root) return;
  var EN=window.LANG==='en';
  function L(es,en){return EN?en:es;}
  var KEY='cvmgr.v1';
  var ESTADOS=[['enviada',L('Enviada','Sent')],['revision',L('En revisión','Under review')],['entrevista',L('Entrevista','Interview')],['oferta',L('Oferta','Offer')],['rechazada',L('No seleccionado','Not selected')]];
  function uid(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36);}
  function load(){
    try{var d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.areas&&d.areas.length) return d;}catch(e){}
    return {areas:[{id:'general',name:L('General','General')}],versions:[],apps:[]};
  }
  var data=load();
  var state={area:(data.lastArea&&data.areas.some(function(a){return a.id===data.lastArea;}))?data.lastArea:data.areas[0].id};
  var msgEl=document.createElement('p');
  msgEl.className='etlmuted cvmsg'; msgEl.setAttribute('aria-live','polite');
  function msg(t){msgEl.textContent=t;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){msg(L('No se pudo guardar en este navegador.','Could not save in this browser.'));return false;}}
  function el(tag,attrs,kids){
    var n=document.createElement(tag);
    if(attrs) for(var k in attrs){ if(k==='text') n.textContent=attrs[k]; else if(k==='class') n.className=attrs[k]; else n.setAttribute(k,attrs[k]); }
    (kids||[]).forEach(function(c){ if(c) n.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return n;
  }
  /* IndexedDB para los archivos PDF */
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

  function areaName(id){var a=data.areas.find(function(x){return x.id===id;}); return a?a.name:'—';}
  function verLabel(v){return areaName(v.area)+' · '+v.name;}

  /* 1 · Áreas */
  function sectionAreas(){
    var chips=el('div',{class:'cvchips'});
    data.areas.forEach(function(a){
      var b=el('button',{type:'button',class:'cvchip'+(a.id===state.area?' on':''),text:a.name});
      b.addEventListener('click',function(){state.area=a.id; render();});
      chips.appendChild(b);
    });
    var nameIn=el('input',{type:'text',maxlength:'40',placeholder:L('Nombre del área nueva','New area name'),'aria-label':L('Nombre del área nueva','New area name')});
    var add=el('button',{type:'button',class:'pill sm',text:L('+ Área','+ Area')});
    add.addEventListener('click',function(){
      var n=nameIn.value.trim(); if(!n) return msg(L('Escribe el nombre del área.','Write the area name.'));
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
      dl.addEventListener('click',function(){
        getFile(v.id).then(function(blob){
          if(!blob) return msg(L('El archivo ya no está guardado en este navegador.','The file is no longer saved in this browser.'));
          var u=URL.createObjectURL(blob); var a=el('a',{href:u,download:v.file||'CV.pdf'});
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},4000);
        }).catch(function(){msg(L('No se pudo leer el archivo.','Could not read the file.'));});
      });
      var rm=el('button',{type:'button',class:'link',text:L('Eliminar','Delete')});
      rm.addEventListener('click',function(){
        if(!confirm(L('¿Eliminar esta versión?','Delete this version?'))) return;
        data.versions=data.versions.filter(function(x){return x.id!==v.id;});
        if(save()) delFile(v.id).then(render);
      });
      list.appendChild(el('article',{class:'cvcard'},[
        el('div',{class:'cvhead'},[el('b',{text:v.name}),el('span',{class:'etlmuted',text:v.date})]),
        el('p',{class:'etlmuted',text:v.desc||''}),
        el('div',{class:'cvact'},[dl,rm])
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
      var id=uid();
      putFile(id,f).then(function(){
        data.versions.push({id:id,area:state.area,name:n,desc:descI.value.trim(),date:new Date().toISOString().slice(0,10),file:f.name});
        if(save()) render();
      }).catch(function(){msg(L('No se pudo guardar el archivo en este navegador.','Could not save the file in this browser.'));});
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
    var verS=el('select',{'aria-label':L('Versión de CV usada','CV version used')});
    verS.appendChild(el('option',{value:'',text:L('— versión usada —','— version used —')}));
    data.versions.forEach(function(v){verS.appendChild(el('option',{value:v.id,text:verLabel(v)}));});
    var fecI=el('input',{type:'date','aria-label':L('Fecha de postulación','Application date'),value:new Date().toISOString().slice(0,10)});
    var notI=el('input',{type:'text',maxlength:'200',placeholder:L('Notas (contacto, siguiente paso…)','Notes (contact, next step…)'),'aria-label':L('Notas','Notes')});
    var add=el('button',{type:'button',class:'pill sm',text:L('Agregar postulación','Add application')});
    add.addEventListener('click',function(){
      var emp=empI.value.trim(), car=carI.value.trim(), link=linkI.value.trim();
      if(!emp||!car) return msg(L('Escribe la empresa y el cargo.','Write the company and the position.'));
      if(link && !/^https:\/\//i.test(link)) return msg(L('El enlace debe empezar con https://','The link must start with https://'));
      data.apps.unshift({id:uid(),empresa:emp,cargo:car,link:link,version:verS.value,fecha:fecI.value,estado:'enviada',notas:notI.value.trim()});
      if(save()) render();
    });
    var form=el('div',{class:'cvform'},[empI,carI,linkI,verS,fecI,notI,add]);
    var filtro=el('select',{'aria-label':L('Filtrar por estado','Filter by status')});
    filtro.appendChild(el('option',{value:'',text:L('Todos los estados','All statuses')}));
    ESTADOS.forEach(function(e){filtro.appendChild(el('option',{value:e[0],text:e[1]}));});
    var list=el('div',{class:'cvlist'});
    var shown=data.apps.filter(function(a){return !filtro.value||a.estado===filtro.value;});
    if(!data.apps.length) list.appendChild(el('p',{class:'etlmuted',text:L('Aún no hay postulaciones guardadas.','No applications saved yet.')}));
    shown.forEach(function(a){
      var est=el('select',{'aria-label':L('Estado','Status')});
      ESTADOS.forEach(function(e){var o=el('option',{value:e[0],text:e[1]}); if(e[0]===a.estado) o.selected=true; est.appendChild(o);});
      est.addEventListener('change',function(){a.estado=est.value; save();});
      var ver=data.versions.find(function(v){return v.id===a.version;});
      var open=a.link?el('a',{class:'pill sm',href:a.link,target:'_blank',rel:'noopener',text:L('Ver oferta ↗','View offer ↗')}):null;
      var rm=el('button',{type:'button',class:'link',text:L('Eliminar','Delete')});
      rm.addEventListener('click',function(){
        if(!confirm(L('¿Eliminar esta postulación?','Delete this application?'))) return;
        data.apps=data.apps.filter(function(x){return x.id!==a.id;}); if(save()) render();
      });
      list.appendChild(el('article',{class:'cvcard'},[
        el('div',{class:'cvhead'},[el('b',{text:a.empresa+' — '+a.cargo}),el('span',{class:'etlmuted',text:a.fecha||''})]),
        el('p',{class:'etlmuted',text:(ver?L('CV usado: ','CV used: ')+verLabel(ver):L('CV usado: sin registrar','CV used: not recorded'))+(a.notas?' · '+a.notas:'')}),
        el('div',{class:'cvact'},[est,open,rm])
      ]));
    });
    filtro.addEventListener('change',render);
    return el('section',{class:'cvsec'},[
      el('h3',{text:L('3 · Ficha de postulaciones','3 · Application tracker')}),
      form, el('div',{class:'cvrow'},[el('span',{class:'etlmuted',text:L('Filtrar: ','Filter: ')}),filtro]),
      list
    ]);
  }

  /* Respaldo de datos (sin los PDF) */
  function backupBar(){
    var exp=el('button',{type:'button',class:'link',text:L('Exportar datos (JSON)','Export data (JSON)')});
    exp.addEventListener('click',function(){
      var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var u=URL.createObjectURL(blob); var a=el('a',{href:u,download:'cv-gestion.json'});
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},4000);
    });
    return el('p',{class:'cvrow'},[exp,el('span',{class:'etlmuted',text:L('Los PDF se guardan en este navegador; el JSON respalda áreas, versiones y postulaciones.','PDFs are saved in this browser; the JSON backs up areas, versions and applications.')})]);
  }

  function render(){
    data.lastArea=state.area;
    root.textContent='';
    root.appendChild(el('div',{class:'mini-card etlcard'},[
      el('div',{class:'etlhead'},[el('b',{text:L('Gestión de CV','CV manager')}),el('span',{class:'etlmuted',text:L('Organiza tus CV por área y lleva el registro de tus postulaciones.','Organize your CVs by area and track your applications.')})]),
      msgEl,
      sectionAreas(), sectionVersions(), sectionApps(), backupBar()
    ]));
    msg('');
  }
  render();
})();
