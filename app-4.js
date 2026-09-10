function login(){return `<div class="login-overlay"><div class="auth-hero"><div class="brand-mark large">R</div><h1>Raahi</h1><p>ToTo & Car, one simple quote.</p></div><div class="auth-card"><label><small>Mobile number</small><div class="phone-input"><span>+91</span><input value="9876543210" /></div></label><button class="primary full big" data-action="login">Continue with OTP</button><p>Prototype: OTP is simulated.</p></div></div>`}
function bottomNav(){return `<nav class="bottom-nav"><button class="active"><span>⌂</span>Home</button><button><span>▣</span>Trips</button><button data-action="logout"><span>○</span>Account</button></nav>`}
function render(){document.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('active',b.dataset.role===state.role)); const content=state.role==='passenger'?passenger():state.role==='driver'?driver():admin(); app.innerHTML=content+bottomNav()+(state.loggedIn?'':login())+'<span class="debug-badge">DEMO</span>'; bind();}
function bind(){
 document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{state.role=b.dataset.role;render()});
 const market=document.getElementById('market'); if(market) market.onchange=e=>{state.market=e.target.value;render()};
 const from=document.getElementById('from'); if(from) from.onchange=e=>{state.from=e.target.value;render()};
 const to=document.getElementById('to'); if(to) to.onchange=e=>{state.to=e.target.value;render()};
 const dl=document.getElementById('driver-location'); if(dl) dl.onchange=e=>{state.driverLocation=e.target.value;render()};
 const ad=document.getElementById('active-driver'); if(ad) ad.onchange=e=>{state.activeDriver=e.target.value;state.driverOnline=true;state.counterDraft=Math.max(state.offer+30,210);render()};
 const am=document.getElementById('admin-market'); if(am) am.onchange=e=>{state.market=e.target.value;render()};
 document.querySelectorAll('[data-vehicle]').forEach(b=>b.onclick=()=>{state.vehicle=b.dataset.vehicle;state.driverReplies={};state.chosen=null;render()});
 document.querySelectorAll('[data-seats]').forEach(b=>b.onclick=()=>{state.seats=+b.dataset.seats;state.driverReplies={};state.chosen=null;render()});
 document.querySelectorAll('[data-fare]').forEach(b=>b.onclick=()=>{state.offer=Math.max(50,state.offer + +b.dataset.fare);state.counterDraft=Math.max(state.offer+30,state.counterDraft);state.driverReplies={};state.chosen=null;render()});
 document.querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>{const d=drivers.find(x=>x.name===b.dataset.choose);state.chosen={...d,amount:+b.dataset.amount};state.passengerStep='booked';render()});
 document.querySelectorAll('[data-counter]').forEach(b=>b.onclick=()=>{state.counterDraft=Math.max(state.offer,state.counterDraft + +b.dataset.counter);render()});
 document.querySelectorAll('[data-paymode]').forEach(b=>b.onclick=()=>{state.payment[state.market]=b.dataset.paymode;render()});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
   const a=b.dataset.action;
   if(a==='request-quotes')state.passengerStep='quotes';
   if(a==='passenger-home'||a==='edit-route')state.passengerStep='home';
   if(a==='back-quotes')state.passengerStep='quotes';
   if(a==='new-ride'){state.passengerStep='home';state.chosen=null;state.driverReplies={};state.paymentConfirmed={}};
   if(a==='live-location'){state.from=state.market==='Gomoh'?'Gomoh Railway Station':'Bank More'};
   if(a==='toggle-online')state.driverOnline=!state.driverOnline;
   if(a==='counter-mode')state.driverReplies[state.activeDriver]={status:'draft-counter',amount:null};
   if(a==='accept-driver')state.driverReplies[state.activeDriver]={status:'accepted',amount:state.offer};
   if(a==='send-counter')state.driverReplies[state.activeDriver]={status:'counter',amount:state.counterDraft};
   if(a==='confirm-payment')state.paymentConfirmed[state.activeDriver]=true;
   if(a==='logout')state.loggedIn=false;
   if(a==='login')state.loggedIn=true;
   render();
 });
}
render();
