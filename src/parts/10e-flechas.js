function noteAt(x,y){
  var hit=(doc.notes||[]).filter(function(nn){
    var nb=noteBox(nn.id);
    return nb&&x>=nb.x&&x<=nb.x+nb.w&&y>=nb.y&&y<=nb.y+nb.h;
  })[0];
  return hit?hit.id:null;
}
function snapArrowEnd(a,end){
  var p = end===2?[a.x2,a.y2]:[a.x1,a.y1];
  var best=null,bd=1e9;
  nodes.forEach(function(n){
    var d=Math.sqrt(Math.pow(n.x-p[0],2)+Math.pow(n.y-p[1],2));
    if(d<bd){bd=d;best=n;}
  });
  if(best&&bd<34){
    if(end===2){a.n2=best.id;a.x2=best.x;a.y2=best.y;}
    else {a.n1=best.id;a.x1=best.x;a.y1=best.y;}
  } else {
    if(end===2)delete a.n2; else delete a.n1;
    var nAt=noteAt(p[0],p[1]);
    if(nAt){
      if(end===2){a.nt2=nAt; delete a.z2;} else {a.nt1=nAt; delete a.z1;}
      if(end===2){a.x2=p[0];a.y2=p[1];} else {a.x1=p[0];a.y1=p[1];}
    } else {
      if(end===2)delete a.nt2; else delete a.nt1;
      var z=zoneAt(p[0],p[1]);
      if(z){ var c=zoneCenter(z)||p; 
        if(end===2){a.z2=z;a.x2=c[0];a.y2=c[1];} else {a.z1=z;a.x1=c[0];a.y1=c[1];}
      } else { if(end===2)delete a.z2; else delete a.z1; }
    }
  }
}
var adrag=null;
function zoneAt(x,y){
  var b=ZBOX.filter(function(q){return x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h;})[0];
  return b?b.z:null;
}
function zoneCenter(z){
  var b=ZBOX.filter(function(q){return q.z===z;})[0];
  return b?[b.x+b.w/2,b.y+b.h/2]:null;
}
function boxOf(z){ return ZBOX.filter(function(q){return q.z===z;})[0]||null; }
function noteBox(id){
  var nn=(doc.notes||[]).filter(function(x){return x.id===id;})[0];
  if(!nn)return null;
  var x=(typeof nn._x==='number')?nn._x:nn.x, y=(typeof nn._y==='number')?nn._y:nn.y;
  return {x:x,y:y,w:nn.w||220,h:nn.h||40};
}
function rawPt(a,end){
  var nid=(end===2)?a.n2:a.n1, zid=(end===2)?a.z2:a.z1;
  if(nid&&byId[nid])return [byId[nid].x,byId[nid].y];
  var tid=(end===2)?a.nt2:a.nt1;
  if(tid){var nb=noteBox(tid); if(nb)return [nb.x+nb.w/2,nb.y+nb.h/2];}
  if(zid){var b=boxOf(zid); if(b)return [b.x+b.w/2,b.y+b.h/2];}
  return (end===2)?[a.x2,a.y2]:[a.x1,a.y1];
}
function borderPoint(b,from){
  if(!b)return from;
  var cx=b.x+b.w/2, cy=b.y+b.h/2;
  var fx=from[0], fy=from[1];
  if(fx>=b.x&&fx<=b.x+b.w&&fy>=b.y&&fy<=b.y+b.h) return [fx,fy];
  var dx=fx-cx, dy=fy-cy;
  if(!dx&&!dy) return [cx,cy];
  var tx=(dx>0)?((b.x+b.w-cx)/dx):((b.x-cx)/dx);
  var ty=(dy>0)?((b.y+b.h-cy)/dy):((b.y-cy)/dy);
  var t=Math.min(Math.abs(tx),Math.abs(ty));
  return [cx+dx*t, cy+dy*t];
}
function arrowPt(a,end){
  var nid=(end===2)?a.n2:a.n1, zid=(end===2)?a.z2:a.z1;
  if(nid&&byId[nid])return [byId[nid].x,byId[nid].y];
  var tid=(end===2)?a.nt2:a.nt1;
  if(tid){
    var nb=noteBox(tid);
    if(nb)return borderPoint(nb, rawPt(a, end===2?1:2));
  }
  if(zid){
    var b=boxOf(zid);
    if(b)return borderPoint(b, rawPt(a, end===2?1:2));
  }
  return (end===2)?[a.x2,a.y2]:[a.x1,a.y1];
}
function arrowsHTML(){
  var arr=doc.arrows||[];
  return arr.map(function(a){
    var col=a.col||'#ffd7a1', sw=a.sw||2.2;
    var P1=arrowPt(a,1), P2=arrowPt(a,2);
    a.x1=P1[0]; a.y1=P1[1]; a.x2=P2[0]; a.y2=P2[1];
    var st=a.st||'line';
    var x1=a.x1,y1=a.y1,x2=a.x2,y2=a.y2;
    var ang=Math.atan2(y2-y1,x2-x1), L=Math.max(11,sw*5.5);
    var dash=(st==='dash')?' stroke-dasharray="9 6"':(st==='dotted'?' stroke-dasharray="2 6"':'');
    var s='<g class="arrow" data-aid="'+a.id+'">';
    if(st==='block'){
      var len=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1))||1;
      var ux=(x2-x1)/len, uy=(y2-y1)/len, px=-uy, py=ux;
      var hw=Math.max(4,sw*2.2), hl=Math.max(13,sw*6), hw2=Math.max(9,sw*4.2);
      var bx=x2-ux*hl, by=y2-uy*hl;
      var pts=[[x1+px*hw,y1+py*hw],[bx+px*hw,by+py*hw],[bx+px*hw2,by+py*hw2],[x2,y2],
               [bx-px*hw2,by-py*hw2],[bx-px*hw,by-py*hw],[x1-px*hw,y1-py*hw]]
        .map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ');
      s+='<polygon points="'+pts+'" fill="'+col+'"/>';
    } else {
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+sw+'" stroke-linecap="round"'+dash+'/>';
      var ax=x2-L*Math.cos(ang-Math.PI/7), ay=y2-L*Math.sin(ang-Math.PI/7);
      var bx2=x2-L*Math.cos(ang+Math.PI/7), by2=y2-L*Math.sin(ang+Math.PI/7);
      s+='<polygon points="'+x2+','+y2+' '+ax.toFixed(1)+','+ay.toFixed(1)+' '+bx2.toFixed(1)+','+by2.toFixed(1)+'" fill="'+col+'"/>';
      if(st==='double'){
        var a2=Math.atan2(y1-y2,x1-x2);
        var cx1=x1-L*Math.cos(a2-Math.PI/7), cy1=y1-L*Math.sin(a2-Math.PI/7);
        var cx2=x1-L*Math.cos(a2+Math.PI/7), cy2=y1-L*Math.sin(a2+Math.PI/7);
        s+='<polygon points="'+x1+','+y1+' '+cx1.toFixed(1)+','+cy1.toFixed(1)+' '+cx2.toFixed(1)+','+cy2.toFixed(1)+'" fill="'+col+'"/>';
      }
    }
    s+='<line class="ahit" data-aid="'+a.id+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="transparent" stroke-width="16"/>';
    if(a.t){
      var lw=a.w||160, lines=noteLines(a.t,lw,11);
      var hh=lines.length*11*1.35+12;
      var mx=(a.x1+a.x2)/2, my=(a.y1+a.y2)/2;
      var lx=Math.round(mx-lw/2), ly=Math.round(my-hh-10);
      s+='<rect x="'+lx+'" y="'+ly+'" width="'+lw+'" height="'+hh+'" rx="6" fill="rgba(12,22,38,.95)" stroke="'+col+'" stroke-width="1"/>'+
         '<text x="'+(lx+8)+'" y="'+(ly+13)+'" fill="'+col+'" style="font-size:11px">'+
         lines.map(function(l,i){return '<tspan x="'+(lx+8)+'" dy="'+(i?14.85:0)+'">'+escAttr(l||' ')+'</tspan>';}).join('')+'</text>';
    }
    if(state.arrowSel===a.id){
      s+='<circle class="ah'+(a.n1?' vin':'')+'" data-aid="'+a.id+'" data-end="1" cx="'+a.x1+'" cy="'+a.y1+'" r="6"/>'+
         '<circle class="ah'+(a.n2?' vin':'')+'" data-aid="'+a.id+'" data-end="2" cx="'+a.x2+'" cy="'+a.y2+'" r="6"/>';
    }
    return s+'</g>';
  }).join('');
}
function addArrow(){
  var cx=(-t.x+svg.clientWidth/2)/t.k, cy=(-t.y+svg.clientHeight/2)/t.k;
  snap();
  var a={id:'ar'+Date.now().toString(36),x1:sn(cx-100),y1:sn(cy+30),x2:sn(cx+90),y2:sn(cy-30),col:'#ffd7a1',sw:2.2,t:''};
  doc.arrows=(doc.arrows||[]).concat([a]);
  state.arrowSel=a.id; state.sel=null; state.esel=null;
  save(); render();
  return a;
}
function openArrow(ar){
  if(!ar)return;
  NT={kind:'arrow',e:null,ar:ar};
  state.noteId=null;
  document.getElementById('n_text').value=ar.t||'';
  document.getElementById('n_sz').value=ar.sw||2;
  document.getElementById('n_w').value=ar.w||160;
  document.getElementById('n_col').value=ar.col||'#ffd7a1';
  var wsw=document.getElementById('n_style_wrap'); if(wsw)wsw.style.display='';
  var sts=document.getElementById('n_style'); if(sts)sts.value=ar.st||'line';
  document.getElementById('n_del').style.display='';
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
document.getElementById('bArrow').onclick=function(){ addArrow(); };
