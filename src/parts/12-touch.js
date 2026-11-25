// ---------- soporte táctil (tablet / móvil) ----------
// Traduce los gestos a los mismos eventos de ratón que ya usa el mapa,
// más pinza de dos dedos para el zoom.
(function(){
  var svgEl=document.getElementById('map');
  if(!svgEl)return;
  var touch=null, pinch=null, moved=false;

  function mk(type,x,y){
    var ev=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:1});
    try{ ev.__touch=true; }catch(e){}
    return ev;
  }
  function dist(t){
    var dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY;
    return Math.sqrt(dx*dx+dy*dy);
  }
  svgEl.addEventListener('touchstart',function(e){
    if(e.touches.length>=2){ pinch={d:dist(e.touches),k:t.k}; touch=null; return; }
    var t=e.touches[0];
    moved=false;
    touch={x:t.clientX,y:t.clientY,t:t};
    var el=document.elementFromPoint(t.clientX,t.clientY);
    if(el) el.dispatchEvent(mk('mousedown',t.clientX,t.clientY));
    e.preventDefault();
  },{passive:false});

  svgEl.addEventListener('touchmove',function(e){
    if(pinch&&e.touches.length>=2){
      var d=dist(e.touches);
      var k2=Math.max(0.25,Math.min(3.5, pinch.k*(d/(pinch.d||d))));
      var r=svgEl.getBoundingClientRect();
      var mx=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left;
      var my=(e.touches[0].clientY+e.touches[1].clientY)/2-r.top;
      t.x=mx-(mx-t.x)*(k2/t.k); t.y=my-(my-t.y)*(k2/t.k); t.k=k2; applyT();
      e.preventDefault(); return;
    }
    if(!touch)return;
    var tt=e.touches[0];
    if(Math.abs(tt.clientX-touch.x)>6||Math.abs(tt.clientY-touch.y)>6)moved=true;
    window.dispatchEvent(mk('mousemove',tt.clientX,tt.clientY));
    e.preventDefault();
  },{passive:false});

  svgEl.addEventListener('touchend',function(e){
    if(pinch){ pinch=null; return; }
    if(!touch)return;
    var last=e.changedTouches[0];
    window.dispatchEvent(mk('mouseup',last.clientX,last.clientY));
    if(!moved){
      var el=document.elementFromPoint(last.clientX,last.clientY);
      if(el) el.dispatchEvent(mk('click',last.clientX,last.clientY));
    }
    touch=null;
    e.preventDefault();
  },{passive:false});
})();
