import { S } from './00-store.js';
import { state } from './01-base.js';
import { save, snap } from './02-modelo.js';
import { ZBOX } from './03-layout.js';
import { col, sn } from './04a-geometria.js';
import { render } from './04b-render-mapa.js';
import { escAttr, showDetail } from './04c-ficha-formularios.js';
import { openArrow } from './10e-flechas.js';
import { svg, t } from './dom.js';
export function saveApp(){
  try{ S.doc.savedAt=new Date().toISOString(); save(); }catch(e){}
  var clone=document.documentElement.cloneNode(true);
  var body=clone.querySelector('body'); if(body)body.classList.remove('present');
  var sc=clone.querySelector('#seed-data');
  if(sc) sc.textContent=JSON.stringify(S.doc).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  var html='<!DOCTYPE html>\n'+clone.outerHTML;
  var blob=new Blob([html],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='Mapa_Red_Levante_'+new Date().toISOString().slice(0,10)+'.html';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500);
  var b=document.getElementById('dirty'); if(b)b.textContent='archivo guardado';
}
S.ndrag=null, S.nres=null, S.NT={kind:'note',e:null};
export function noteLines(txt,w,sz){
  var maxc=Math.max(4,Math.floor((w-20)/(sz*0.55)));
  var out=[];
  String(txt||'').split(/\n/).forEach(function(par){
    if(!par.length){ out.push(''); return; }
    var ln='';
    par.split(/\s+/).forEach(function(wd){
      var cand=ln?ln+' '+wd:wd;
      if(cand.length>maxc){ if(ln)out.push(ln); ln=wd; } else ln=cand;
    });
    if(ln)out.push(ln);
  });
  return out.length?out:[''];
}
export function notesHTML(){
  return (S.doc.notes||[]).map(function(nn){
    var sz=nn.sz||13, w=nn.w||220;
    var zb=nn.z?(ZBOX.filter(function(b){return b.z===nn.z;})[0]||null):null;
    var nx=zb?(zb.x+(nn.ox||0)):nn.x, ny=zb?(zb.y+(nn.oy||0)):nn.y;
    nn._x=nx; nn._y=ny;
    var lines=noteLines(nn.t,w,sz);
    var hh=Math.max(20,lines.length*sz*1.4+14);
    if(nn.hFix)hh=Math.max(hh,nn.hFix);
    nn.h=hh;
    var cls='note'+(state.noteId===nn.id?' sel2':'');
    var tsp=lines.map(function(l,i){
      return '<tspan x="10" dy="'+(i?sz*1.4:0)+'">'+escAttr(l||' ')+'</tspan>';
    }).join('');
    return '<g class="'+cls+'" data-nid="'+nn.id+'" transform="translate('+nx+','+ny+')">'+
      '<rect class="ntbg" width="'+w+'" height="'+hh+'" rx="8"/>'+
      '<text class="ntt" x="10" y="'+(sz+3)+'" fill="'+(nn.col||'#dbe9ff')+'" style="font-size:'+sz+'px">'+tsp+'</text>'+
      '<rect class="nzh" x="'+(w-12)+'" y="'+(hh-12)+'" width="10" height="10" rx="2"/></g>';
  }).join('');
}
export function openNote(id){
  var nn=id?(S.doc.notes||[]).filter(function(x){return x.id===id;})[0]:null;
  state.noteId=nn?nn.id:null; S.NT={kind:'note',e:null};
  document.getElementById('n_text').value=nn?nn.t:'';
  document.getElementById('n_sz').value=nn?(nn.sz||13):13;
  document.getElementById('n_w').value=nn?(nn.w||220):220;
  document.getElementById('n_col').value=nn&&nn.col?nn.col:'#8fc7ff';
  document.getElementById('n_del').style.display=nn?'':'none';
  var wsw0=document.getElementById('n_style_wrap'); if(wsw0)wsw0.style.display='none';
  var zsel=document.getElementById('n_zone');
  if(zsel){
    var zz=(typeof S.zonas!=='undefined'?zonas:[]).slice().sort(function(x,y){return x.localeCompare(y,'es');});
    zsel.innerHTML='<option value="">\u2014 suelto \u2014</option>'+zz.map(function(z){
      return '<option value="'+escAttr(z)+'">'+escAttr(z)+'</option>';}).join('');
    zsel.value=(nn&&nn.z)?nn.z:'';
  }
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
export function openEdgeNote(ed){
  if(!ed)return;
  S.NT={kind:'edge',e:ed};
  state.noteId=null;
  var wswE=document.getElementById('n_style_wrap'); if(wswE)wswE.style.display='none';
  var nt=ed.nt||{};
  document.getElementById('n_text').value=nt.t||'';
  document.getElementById('n_sz').value=nt.sz||12;
  document.getElementById('n_w').value=nt.w||200;
  document.getElementById('n_col').value=nt.col||'#ffd7a1';
  document.getElementById('n_del').style.display=(nt.t?'':'none');
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
export function saveNote(){
  var txt=document.getElementById('n_text').value;
  var sz=Math.max(8,Math.min(30,parseInt(document.getElementById('n_sz').value)||13));
  var w=Math.max(40,Math.min(600,parseInt(document.getElementById('n_w').value)||220));
  var col=document.getElementById('n_col').value;
  if(S.NT.kind==='arrow'&&S.NT.ar){
    snap();
    S.NT.ar.t=txt; S.NT.ar.col=col; S.NT.ar.w=w;
    var stEl=document.getElementById('n_style'); if(stEl)S.NT.ar.st=stEl.value||'line';
    S.NT.ar.sw=Math.max(1,Math.min(9,parseInt(document.getElementById('n_sz').value)||2));
    save(); render(); document.getElementById('nmodal').classList.remove('on'); return;
  }
  if(S.NT.kind==='edge'&&S.NT.e){
    snap();
    S.NT.e.nt={t:txt,sz:sz,w:w,col:col};
    save(); render(); showDetail();
    document.getElementById('nmodal').classList.remove('on');
    return;
  }
  S.doc.notes=S.doc.notes||[];
  snap();
  var zn=document.getElementById('n_zone');
  var zval=(zn&&!zn.disabled)?zn.value:'';
  function linkZone(nn){
    if(!nn)return;
    if(zval){
      var b=ZBOX.filter(function(q){return q.z===zval;})[0];
      nn.z=zval; nn.ox=Math.round((nn.x||0)-(b?b.x:0)); nn.oy=Math.round((nn.y||0)-(b?b.y:0));
    } else { delete nn.z; delete nn.ox; delete nn.oy; }
  }
  if(state.noteId){
    var ex=S.doc.notes.filter(function(x){return x.id===state.noteId;})[0];
    if(ex){ ex.t=txt; ex.sz=sz; ex.w=w; ex.col=col; linkZone(ex); }
  } else {
    var cx=(-t.x+svg.clientWidth/2)/t.k, cy=(-t.y+svg.clientHeight/2)/t.k;
    var nn2={id:'nt'+Date.now().toString(36),x:sn(cx-110),y:sn(cy-40),w:w,sz:sz,t:txt,col:col};
    S.doc.notes.push(nn2); linkZone(nn2);
  }
  save(); render();
  document.getElementById('nmodal').classList.remove('on');
}
document.getElementById('bNote').onclick=function(){ openNote(null); };
document.getElementById('n_ok').onclick=saveNote;
document.getElementById('n_cancel').onclick=function(){ document.getElementById('nmodal').classList.remove('on'); };
document.getElementById('n_del').onclick=function(){
  if(S.NT.kind==='arrow'&&S.NT.ar){
    snap(); S.doc.arrows=(S.doc.arrows||[]).filter(function(x){return x.id!==S.NT.ar.id;});
    state.arrowSel=null; save(); render();
    document.getElementById('nmodal').classList.remove('on'); return;
  }
  if(S.NT.kind==='edge'&&S.NT.e){
    if(!S.NT.e.nt)return;
    snap(); delete S.NT.e.nt; save(); render(); showDetail();
    document.getElementById('nmodal').classList.remove('on');
    return;
  }
  if(!state.noteId)return;
  var id=state.noteId; snap();
  S.doc.notes=(S.doc.notes||[]).filter(function(x){return x.id!==id;});
  state.noteId=null; save(); render();
  document.getElementById('nmodal').classList.remove('on');
};
svg.addEventListener('dblclick',function(e){
  var af=e.target.closest?e.target.closest('.arrow'):null;
  if(af&&af.dataset.aid){
    var ar=(S.doc.arrows||[]).filter(function(x){return x.id===af.dataset.aid;})[0];
    if(ar){ openArrow(ar); return; }
  }
  var hp=e.target.closest?e.target.closest('.eh'):null;
  if(hp&&hp.dataset.i!=null){
    var q=hp.dataset.e.split('|');
    var qe=S.doc.edges.filter(function(x){return (x.s===q[0]&&x.t===q[1])||(x.s===q[1]&&x.t===q[0]);})[0];
    if(qe&&Array.isArray(qe.pts)){
      snap(); qe.pts.splice(parseInt(hp.dataset.i)||0,1);
      if(!qe.pts.length){delete qe.bx;delete qe.by;}
      save(); render(); return;
    }
  }
  var eb=e.target.closest?e.target.closest('.elab2'):null;
  if(eb&&eb.dataset.e){
    var pp=eb.dataset.e.split('|');
    var ed=S.doc.edges.filter(function(x){return (x.s===pp[0]&&x.t===pp[1])||(x.s===pp[1]&&x.t===pp[0]);})[0];
    if(ed){ state.esel={s:ed.s,t:ed.t}; openEdgeNote(ed); return; }
  }
  var el=e.target.closest?e.target.closest('.note'):null;
  if(el){ openNote(el.dataset.nid); }
});
