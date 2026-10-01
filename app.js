(() => {
  'use strict';
  const data = window.W6R_PUBLIC_ROUTES;
  if (!data || data.version !== 1 || !Array.isArray(data.routes)) return;
  const $ = id => document.getElementById(id);
  const originNames = { original: '原始路线', extension47: '扩展路线', newStart137: '实验新起点' };
  const maps = new Map(data.maps.map(map => [map.id, map.name]));
  const state = { map: 'all', origin: 'all', query: '', page: 1, size: 12, selected: null };
  const ns = 'http://www.w3.org/2000/svg';
  let previousFocus = null;
  function element(tag, text, className) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; }
  function svg(tag, attrs, text) { const el = document.createElementNS(ns, tag); for (const [k,v] of Object.entries(attrs || {})) el.setAttribute(k, String(v)); if (text != null) el.textContent = text; return el; }
  function project(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = maxX-minX, height = maxY-minY;
    const scale = Math.min(width ? 244/width : Infinity, height ? 142/height : Infinity);
    const left = (320-width*scale)/2, top = (214-height*scale)/2;
    // Native X/-Z coordinates must be vertically flipped for SVG's downward y axis.
    return points.map(([x,y]) => [left+(x-minX)*scale,top+(maxY-y)*scale]);
  }
  function drawing(route) {
    const pts = project(route.points);
    const image = svg('svg', { viewBox: '0 0 320 214', class: 'drawing', role: 'img', 'aria-label': `${route.name}：绿色起点，橙色终点，白色箭头指示行驶方向`, focusable: 'false' });
    image.append(svg('title', {}, route.name));
    const points = pts.map(p=>p.map(n=>n.toFixed(3)).join(',')).join(' ');
    image.append(svg('polyline',{points,class:'road-shadow'}),svg('polyline',{points,class:'road-line'}));
    const segments = []; let total = 0;
    for (let i=1;i<pts.length;i++) { const [x,y]=pts[i-1], dx=pts[i][0]-x,dy=pts[i][1]-y,len=Math.hypot(dx,dy); if (!len) continue; segments.push({x,y,dx:dx/len,dy:dy/len,len,begin:total});total+=len; }
    for (const fraction of [.18,.48,.78]) { const distance=total*fraction,s=segments.find(s=>distance<=s.begin+s.len); if(!s)continue;const x=s.x+(distance-s.begin)*s.dx,y=s.y+(distance-s.begin)*s.dy,tx=x-s.dx*6,ty=y-s.dy*6;image.append(svg('polyline',{points:`${tx-s.dy*3.5},${ty+s.dx*3.5} ${x},${y} ${tx+s.dy*3.5},${ty-s.dx*3.5}`,class:'road-arrow'})); }
    const first=pts[0],last=pts[pts.length-1],near=Math.hypot(first[0]-last[0],first[1]-last[1])<18;
    image.append(svg('circle',{cx:last[0],cy:last[1],r:near?8.5:5.5,class:'road-finish'}),svg('circle',{cx:first[0],cy:first[1],r:4.5,class:'road-start'}));
    image.append(svg('text',{x:first[0]-(near?11:0),y:first[1]-12,'text-anchor':near?'end':'middle',class:'point-label start-label'},'起'),svg('text',{x:last[0]+(near?11:0),y:last[1]+18,'text-anchor':near?'start':'middle',class:'point-label finish-label'},'终'));
    return image;
  }
  function setMap(value) { state.map=value;state.page=1;$('mobile-map').value=value;render(); }
  for (const map of [{id:'all',name:'全部区域'},...data.maps]) {
    const count=map.id==='all'?data.routes.length:data.routes.filter(r=>r.mapId===map.id).length;
    const button=element('button',null,'map-button');button.type='button';button.dataset.map=String(map.id);button.append(element('span',map.name),element('span',count,'map-count'));button.addEventListener('click',()=>setMap(String(map.id)));$('map-list').append(button);
    const option=element('option',`${map.name} · ${count} 条`);option.value=String(map.id);$('mobile-map').append(option);
  }
  function filtered() { const query=state.query.trim().toLocaleLowerCase();return data.routes.filter(r=>(state.map==='all'||r.mapId===Number(state.map))&&(state.origin==='all'||r.origin===state.origin)&&(!query||[r.name,r.startName,r.endName,String(r.id),maps.get(r.mapId),...r.roadNames].some(v=>v.toLocaleLowerCase().includes(query)))); }
  function openRoute(route,button) {
    state.selected=route.id;
    document.querySelectorAll('.route-card').forEach(card=>{const selected=Number(card.dataset.id)===route.id;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));});
    previousFocus=button;
    $('dialog-category').className=`badge ${route.origin}`;$('dialog-category').textContent=originNames[route.origin];
    $('dialog-title').textContent=`${maps.get(route.mapId)} · ${route.name}`;
    $('dialog-map').replaceChildren(drawing(route));$('dialog-start').textContent=route.startName;$('dialog-end').textContent=route.endName;
    $('dialog-roads').textContent=route.roadNames.join(' → ');
    $('dialog-note').textContent=route.origin==='newStart137'?'实验新起点路线：当前图形为标准赛程的中心线计算示意，发车、终点与实际游玩仍需实机验收。':'道路中心线示意图。绿色实心标记为起点，橙色圆环为终点；箭头沿实际路线顺序绘制。';
    $('route-dialog').showModal();document.body.classList.add('modal-open');$('close-dialog').focus();
  }
  function card(route) {
    const button=element('button',null,'route-card');button.type='button';button.dataset.id=String(route.id);button.classList.toggle('selected',state.selected===route.id);button.setAttribute('aria-pressed',String(state.selected===route.id));button.setAttribute('aria-label',`查看 ${maps.get(route.mapId)} ${route.name}`);
    const heading=element('div',null,'card-heading');heading.append(element('span',originNames[route.origin],`badge ${route.origin}`),element('span',`NO.${String(route.id).padStart(3,'0')}`,'route-id'));
    const body=element('div',null,'card-body');body.append(element('div',maps.get(route.mapId),'card-location'),element('h3',route.name));
    const endpoints=element('div',null,'card-endpoints');endpoints.append(element('i',null,'dot start'),element('span',route.startName),element('i',null,'dot finish'),element('span',route.endName));body.append(endpoints);
    button.append(heading,drawing(route),body);button.addEventListener('click',()=>openRoute(route,button));return button;
  }
  function render() {
    const routes=filtered(),pages=Math.max(1,Math.ceil(routes.length/state.size));state.page=Math.min(state.page,pages);
    $('map-title').textContent=state.map==='all'?'全部区域':maps.get(Number(state.map));$('route-count').textContent=`${routes.length} 条路线`;
    document.querySelectorAll('[data-map]').forEach(b=>{const active=b.dataset.map===state.map;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'true':'false');});
    document.querySelectorAll('[data-origin]').forEach(b=>{const active=b.dataset.origin===state.origin;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('route-grid').replaceChildren(...routes.slice((state.page-1)*state.size,state.page*state.size).map(card));$('empty-state').hidden=routes.length>0;
    $('page-state').textContent=`${state.page} / ${pages}`;$('previous').disabled=state.page<=1;$('next').disabled=state.page>=pages;
  }
  $('mobile-map').addEventListener('change',e=>setMap(e.target.value));
  document.querySelectorAll('[data-origin]').forEach(b=>b.addEventListener('click',()=>{state.origin=b.dataset.origin;state.page=1;render();}));
  $('search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;render();});
  $('page-size').addEventListener('change',e=>{state.size=Number(e.target.value);state.page=1;render();});
  $('previous').addEventListener('click',()=>{state.page--;render();});$('next').addEventListener('click',()=>{state.page++;render();});
  $('close-dialog').addEventListener('click',()=>$('route-dialog').close());
  $('route-dialog').addEventListener('close',()=>{document.body.classList.remove('modal-open');if(previousFocus?.isConnected)previousFocus.focus();});
  $('route-dialog').addEventListener('click',event=>{if(event.target!==$('route-dialog'))return;const r=$('route-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('route-dialog').close();});
  render();
})();
