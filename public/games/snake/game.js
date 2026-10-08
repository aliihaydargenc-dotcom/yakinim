(() => {
  const $=selector=>document.querySelector(selector);
  const canvas=$('#board'),ctx=canvas.getContext('2d'),N=18,GOAL=5,TOTAL=12,KEY='yakinim:snake:v2';
  let saved={unlocked:1,best:0};
  try{saved={...saved,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{}
  saved.unlocked=Math.max(1,Math.min(TOTAL,Number(saved.unlocked)||1));saved.best=Number(saved.best)||0;
  let level=saved.unlocked,snake,dir,turns=[],food,obstacles=[],apples=0,points=0,running=false,paused=false,clock,animation;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
  function blocked(x,y){return obstacles.some(p=>p.x===x&&p.y===y);}
  function createObstacles(){
    obstacles=[];
    if(level<3)return;
    for(let x=3;x<=7;x++)obstacles.push({x,y:4});
    if(level>=5)for(let x=10;x<=14;x++)obstacles.push({x,y:13});
    if(level>=7)for(let y=6;y<=10;y++)obstacles.push({x:13,y});
    if(level>=9)for(let y=11;y<=14;y++)obstacles.push({x:4,y});
    if(level>=11)for(let x=7;x<=10;x++)obstacles.push({x,y:15});
  }
  function randomFood(){
    const empty=[];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!blocked(x,y)&&!snake.some(p=>p.x===x&&p.y===y))empty.push({x,y});
    return empty[Math.floor(Math.random()*empty.length)];
  }
  function draw(){
    const w=canvas.clientWidth,c=w/N,dpr=devicePixelRatio||1;
    if(canvas.width!==Math.round(w*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(w*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,w);
    ctx.fillStyle='#eee8e4';ctx.fillRect(0,0,w,w);
    ctx.strokeStyle='#d8cdcf55';ctx.lineWidth=.5;
    for(let i=1;i<N;i++){ctx.beginPath();ctx.moveTo(i*c,0);ctx.lineTo(i*c,w);ctx.moveTo(0,i*c);ctx.lineTo(w,i*c);ctx.stroke();}
    ctx.fillStyle='#827d80';obstacles.forEach(p=>{ctx.beginPath();ctx.roundRect(p.x*c+1,p.y*c+1,c-2,c-2,c*.15);ctx.fill();});
    if(food){
      ctx.fillStyle='#be7b67';ctx.beginPath();ctx.arc((food.x+.5)*c,(food.y+.55)*c,c*.32,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#7d8a6e';ctx.beginPath();ctx.ellipse((food.x+.62)*c,(food.y+.22)*c,c*.15,c*.07,-.6,0,Math.PI*2);ctx.fill();
    }
    ctx.strokeStyle='#79576d';ctx.lineWidth=c*.7;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();snake.forEach((p,i)=>{const x=(p.x+.5)*c,y=(p.y+.5)*c;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    const head=snake[0],hx=(head.x+.5)*c,hy=(head.y+.5)*c;
    ctx.fillStyle='#503749';ctx.beginPath();ctx.arc(hx,hy,c*.37,0,Math.PI*2);ctx.fill();
    const side={x:-dir.y,y:dir.x};
    [-1,1].forEach(k=>{const x=hx+dir.x*c*.13+side.x*c*.14*k,y=hy+dir.y*c*.13+side.y*c*.14*k;ctx.fillStyle='white';ctx.beginPath();ctx.arc(x,y,c*.08,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29262b';ctx.beginPath();ctx.arc(x+dir.x*c*.025,y+dir.y*c*.025,c*.04,0,Math.PI*2);ctx.fill();});
    $('#level').textContent='Bölüm '+level;$('#score').textContent=apples+' / '+GOAL+' elma · '+points+' puan';$('#status').textContent='Rekor '+saved.best;
    if(running)animation=requestAnimationFrame(draw);
  }
  function halt(){running=false;clearInterval(clock);cancelAnimationFrame(animation);$('#pause').disabled=true;}
  function show(title,message,label,action){
    $('#title').textContent=title;$('#message').textContent=message;$('#start').textContent=label;$('#start').onclick=action;$('#start').hidden=false;$('#levels').hidden=true;$('#overlay').hidden=false;
  }
  function reset(n){
    halt();level=n;paused=false;apples=0;points=0;turns=[];snake=[{x:8,y:9},{x:7,y:9},{x:6,y:9}];dir={x:1,y:0};createObstacles();food=randomFood();draw();
  }
  function end(win){
    halt();paused=false;
    if(win){saved.unlocked=Math.max(saved.unlocked,Math.min(TOTAL,level+1));persist();}
    const next=win&&level<TOTAL?level+1:level;
    show(win?'Bölüm '+level+' tamam!':'Oyun bitti',win?(level===TOTAL?'Tüm bölümleri tamamladın':points+' puan'):'Bu bölümü yeniden dene',win&&level<TOTAL?'Sonraki bölüm':'Tekrar oyna',()=>start(next));
  }
  function step(){
    if(turns.length)dir=turns.shift();
    const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y},eat=food&&h.x===food.x&&h.y===food.y;
    const body=eat?snake:snake.slice(0,-1);
    if(h.x<0||h.x>=N||h.y<0||h.y>=N||blocked(h.x,h.y)||body.some(p=>p.x===h.x&&p.y===h.y)){end(false);return;}
    snake.unshift(h);
    if(eat){apples++;points+=level*10;if(points>saved.best){saved.best=points;persist();}if(apples>=GOAL){draw();end(true);return;}food=randomFood();if(!food){end(true);return;}}
    else snake.pop();
  }
  function resume(){
    paused=false;running=true;$('#overlay').hidden=true;$('#pause').disabled=false;
    clock=setInterval(step,Math.max(95,220-(level-1)*11));cancelAnimationFrame(animation);draw();
  }
  function start(n){reset(n);resume();}
  function pause(){
    if(!running)return;halt();paused=true;
    show('Duraklatıldı','Bölüm '+level,'Devam et',resume);
  }
  function turn(x,y){
    if(!running||turns.length>=2)return;
    const last=turns[turns.length-1]||dir;
    if((x===-last.x&&y===-last.y)||(x===last.x&&y===last.y))return;
    turns.push({x,y});
  }
  $('#pause').onclick=pause;
  $('#chapters').onclick=()=>{
    if(running)pause();
    $('#title').textContent='Bölümler';$('#message').textContent=saved.unlocked+' / '+TOTAL+' bölüm açık';$('#overlay').hidden=false;
    $('#start').hidden=!paused;if(paused){$('#start').textContent='Devam et';$('#start').onclick=resume;}
    $('#levels').replaceChildren();$('#levels').hidden=false;
    for(let n=1;n<=TOTAL;n++){const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-label','Bölüm '+n);b.disabled=n>saved.unlocked;b.onclick=()=>start(n);$('#levels').append(b);}
  };
  document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>turn(...b.dataset.dir.split(',').map(Number)));
  document.addEventListener('keydown',e=>{
    const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    if(directions[e.key]){e.preventDefault();turn(...directions[e.key]);}
    if(e.code==='Space'){e.preventDefault();paused?resume():pause();}
  });
  let touch;
  canvas.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',e=>{
    if(!touch)return;const x=e.clientX-touch.x,y=e.clientY-touch.y;touch=null;
    if(Math.max(Math.abs(x),Math.abs(y))<12)return;
    turn(...(Math.abs(x)>Math.abs(y)?[Math.sign(x),0]:[0,Math.sign(y)]));
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  new ResizeObserver(()=>{if(!running)draw();}).observe(canvas);
  reset(level);show('Bölüm '+level,GOAL+' elma topla','Başla',()=>start(level));
})();