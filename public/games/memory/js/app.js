(() => {
  const $ = selector => document.querySelector(selector);
  const TOTAL = 30, KEY = 'yakinim:memory:v2';
  let saved = { unlocked: 1, records: {} };
  try { saved = {...saved, ...JSON.parse(localStorage.getItem(KEY)||'{}')}; } catch {}
  saved.unlocked = Math.max(1, Math.min(TOTAL, Number(saved.unlocked)||1));
  saved.records = saved.records && typeof saved.records === 'object' ? saved.records : {};
  let level = 1, targets = new Set(), found = 0, accepting = false, timers = [], startedAt = 0, clock;
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }
  function clear() { timers.forEach(clearTimeout); timers=[]; clearInterval(clock); accepting=false; }
  function later(fn, ms) { timers.push(setTimeout(fn,ms)); }
  function menu() {
    clear(); $('#result').hidden=true; $('#play').hidden=true; $('#menu').hidden=false; $('#back').hidden=true;
    $('#time').textContent=''; $('#level-label').textContent='Bölümler'; $('#record').textContent='';
    $('#progress').textContent=saved.unlocked+' / '+TOTAL+' bölüm açık';
    $('#continue').textContent='Bölüm '+saved.unlocked+' · Devam et';
    $('#levels').replaceChildren();
    for(let n=1;n<=TOTAL;n++) {
      const b=document.createElement('button'); b.className='level'+(saved.records[n]?' completed':'');
      b.textContent=String(n); b.disabled=n>saved.unlocked;
      b.setAttribute('aria-label','Bölüm '+n+(b.disabled?' · Kilitli':''));
      b.onclick=()=>start(n); $('#levels').append(b);
    }
  }
  function finish(win) {
    accepting=false;clearInterval(clock);
    const elapsed=Math.max(.01,(performance.now()-startedAt)/1000);
    if(win) {
      const previous=Number(saved.records[level])||Infinity;
      saved.records[level]=Math.min(previous,elapsed);
      saved.unlocked=Math.max(saved.unlocked,Math.min(TOTAL,level+1));persist();
    }
    $('#result-title').textContent=win?'Bölüm '+level+' tamam!':'Tekrar dene';
    $('#result-copy').textContent=win?elapsed.toFixed(1)+' saniye'+(level===TOTAL?' · Tüm bölümleri tamamladın':''):'Deseni yeniden hatırla.';
    $('#next').textContent=win&&level<TOTAL?'Sonraki bölüm':'Tekrar oyna';
    $('#next').onclick=()=>start(win&&level<TOTAL?level+1:level);
    later(()=>{ $('#result').hidden=false; $('#next').focus(); },500);
  }
  function choose(index,button) {
    if(!accepting || button.disabled) return;
    button.disabled=true;
    if(targets.has(index)) {
      button.classList.add('correct');found++;
      if(found===targets.size) finish(true);
    } else {
      button.classList.add('wrong');
      $('#game-container').querySelectorAll('.field').forEach((field,i)=>{if(targets.has(i)&&!field.classList.contains('correct'))field.classList.add('missed');});
      finish(false);
    }
  }
  function start(n) {
    clear();level=n;found=0;
    $('#result').hidden=true;$('#menu').hidden=true;$('#play').hidden=false;$('#back').hidden=false;
    $('#level-label').textContent='Bölüm '+level;
    $('#record').textContent=saved.records[level]?'Rekor '+Number(saved.records[level]).toFixed(1)+' sn':'';
    $('#time').textContent='';$('#phase').textContent='Deseni hatırla';
    const columns=level<=10?3:level<=20?4:5, count=columns*columns;
    const lightCount=Math.min(count-1,3+Math.floor((level-1)/3));
    const indexes=Array.from({length:count},(_,i)=>i);
    for(let i=indexes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indexes[i],indexes[j]]=[indexes[j],indexes[i]];}
    targets=new Set(indexes.slice(0,lightCount));
    const board=$('#game-container');board.replaceChildren();
    board.style.gridTemplateColumns='repeat('+columns+',minmax(0,1fr))';
    board.style.gridTemplateRows='repeat('+columns+',minmax(0,1fr))';
    for(let i=0;i<count;i++) {
      const b=document.createElement('button');b.className='field';b.disabled=true;
      b.setAttribute('aria-label','Kutu '+(i+1));b.onclick=()=>choose(i,b);board.append(b);
    }
    later(()=>board.querySelectorAll('.field').forEach((b,i)=>b.classList.toggle('lit',targets.has(i))),200);
    later(()=>{
      board.querySelectorAll('.field').forEach(b=>{b.classList.remove('lit');b.disabled=false;});
      $('#phase').textContent='Işıklı kutuları seç';accepting=true;startedAt=performance.now();
      clock=setInterval(()=>{ $('#time').textContent=((performance.now()-startedAt)/1000).toFixed(1)+' sn'; },100);
    },200+Math.max(800,1800-level*25));
  }
  $('#continue').onclick=()=>start(saved.unlocked);$('#back').onclick=menu;$('#result-menu').onclick=menu;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && !$('#play').hidden && $('#result').hidden) {
      clear();$('#result-title').textContent='Duraklatıldı';$('#result-copy').textContent='Bölüm '+level;
      $('#next').textContent='Devam et';$('#next').onclick=()=>start(level);$('#result').hidden=false;
    }
  });
  menu();
})();