(()=>{ window.__dlData=[]; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download || (this.href||"").startsWith("blob:")){ const h=this.href, n=this.download||"descarga"; fetch(h).then(r=>r.blob()).then(b=>{ const fr=new FileReader(); fr.onload=()=>window.__dlData.push({n, data:fr.result}); fr.readAsDataURL(b); }); return; } return oc.call(this); }; })();
try{ window.showSaveFilePicker = undefined; delete window.showSaveFilePicker; }catch(e){}

(() => {
  if (window.__tabBlur) return; window.__tabBlur = true;
  const RE = /(educanariasapp@gmail\.com|educanariasapp|@mail\.tab\.bot|@gmail\.com)/gi;
  let nodes = []; let dirty = true;
  const scan = () => {
    nodes = [];
    if (!document.body) return;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) {
      const p = n.parentElement; if (!p || p.closest('#__tabblur')) continue;
      const tag = p.tagName; if (tag==='SCRIPT'||tag==='STYLE') continue;
      const s = n.nodeValue; if (!s) continue; RE.lastIndex = 0; let m;
      while ((m = RE.exec(s))) nodes.push([n, m.index, m.index + m[0].length]);
    }
  };
  const mo = new MutationObserver(() => { dirty = true; });
  const start = () => {
    mo.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['src','value','class','style']});
    const box = document.createElement('div'); box.id='__tabblur';
    box.style.cssText='position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(box);
    const pool = [];
    const get = (i) => { if (!pool[i]) { const d=document.createElement('div'); d.style.cssText='position:fixed;pointer-events:none;border-radius:6px;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);background:rgba(200,200,200,0.25);'; box.appendChild(d); pool[i]=d; } return pool[i]; };
    const tick = () => {
      if (!box.isConnected) document.documentElement.appendChild(box);
      if (dirty) { dirty=false; scan(); }
      const rects = [];
      for (const [n,a,b] of nodes) {
        if (!n.isConnected) { dirty = true; continue; }
        try { const r = document.createRange(); r.setStart(n,a); r.setEnd(n,Math.min(b,n.nodeValue.length));
          for (const q of r.getClientRects()) if (q.width>1 && q.height>1) rects.push([q.left-3,q.top-2,q.width+6,q.height+4]); } catch(e) { dirty = true; }
      }
      for (const el of document.querySelectorAll('input,textarea,select')) {
        let v = el.tagName==='SELECT' ? (el.options[el.selectedIndex]||{}).text||'' : (el.value||'');
        RE.lastIndex=0; const em=(el.type==='email'||/mail|correo/i.test((el.name||'')+(el.id||'')+(el.placeholder||'')+(el.autocomplete||''))); if (v && (em || RE.test(v))) { const q=el.getBoundingClientRect(); if(q.width>1) rects.push([q.left,q.top,q.width,q.height]); }
      }
      for (const im of document.images) {
        const nw = im.naturalWidth, nh = im.naturalHeight; if (!nw || !nh || true) continue;
        const ar = nw/nh; if (ar < 0.70 || ar > 0.80) continue;
        const q = im.getBoundingClientRect(); if (q.width < 20) continue;
        // displayed content rect (object-fit contain / cover / fill)
        const fit = getComputedStyle(im).objectFit; let cw=q.width, ch=q.height, cx=q.left, cy=q.top;
        if (fit==='contain' || fit==='scale-down') { const s=Math.min(q.width/nw,q.height/nh); cw=nw*s; ch=nh*s; cx=q.left+(q.width-cw)/2; cy=q.top+(q.height-ch)/2; }
        else if (fit==='cover') { const s=Math.max(q.width/nw,q.height/nh); cw=nw*s; ch=nh*s; cx=q.left+(q.width-cw)/2; cy=q.top+(q.height-ch)/2; }
        rects.push([cx+cw*0.04, cy+ch*0.125, cw*0.46, ch*0.08]);
      }
      let i=0; for (const [x,y,w,h] of rects) { if (y+h<0||y>innerHeight) continue; const d=get(i++); d.style.display='block'; d.style.left=x+'px'; d.style.top=y+'px'; d.style.width=w+'px'; d.style.height=h+'px'; }
      for (; i<pool.length; i++) pool[i].style.display='none';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
