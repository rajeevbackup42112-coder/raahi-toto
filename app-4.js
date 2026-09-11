function login(){return `<div class="login-overlay"><div class="auth-hero"><div class="brand-mark large">R</div><h1>Raahi</h1><p>ToTo & Car, one nearby driver at a time.</p></div><div class="auth-card"><label><small>Mobile number</small><div class="phone-input"><span>+91</span><input value="9876543210" /></div></label><button class="primary full big" data-action="login">Continue with OTP</button><p>Prototype: OTP is simulated.</p></div></div>`}
function bottomNav(){return `<nav class="bottom-nav"><button class="active" disabled><span>⌂</span>Home</button><button disabled><span>▣</span>Trips later</button><button data-action="logout"><span>○</span>Logout</button></nav>`}
function render(){
 document.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('active',b.dataset.role===state.role));
 const content=state.role==='passenger'?passenger():state.role==='driver'?driver():admin();
 app.innerHTML=content+bottomNav()+(state.loggedIn?'':login())+'<span class="debug-badge">DEMO</span>';
 bind();
}
function bind(){
 document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{state.role=b.dataset.role;render()});
 const from=document.getElementById('from'); if(from) from.onchange=e=>{state.from=e.target.value;resetRideResponses();render()};
 const to=document.getElementById('to'); if(to) to.onchange=e=>{state.to=e.target.value;resetRideResponses();render()};
 const dl=document.getElementById('driver-location'); if(dl) dl.onchange=e=>{state.driverLocation=e.target.value;render()};
 const ad=document.getElementById('active-driver'); if(ad) ad.onchange=e=>{state.activeDriver=e.target.value;state.driverOnline=true;state.counterDraft=Math.max((state.engagement?.amount||currentFare())+30,210);render()};
 const am=document.getElementById('admin-market'); if(am) am.onchange=e=>{state.market=e.target.value;render()};
 const shortKm=document.getElementById('toto-short-km'); if(shortKm) shortKm.onchange=e=>{const p=state.totoPricing[state.market];p.shortKm=Math.max(.5,+e.target.value||.5);if(p.midKm<=p.shortKm)p.midKm=p.shortKm+.5;render()};
 const shortFare=document.getElementById('toto-short-fare'); if(shortFare) shortFare.onchange=e=>{state.totoPricing[state.market].shortFare=Math.max(10,+e.target.value||10);render()};
 const midKm=document.getElementById('toto-mid-km'); if(midKm) midKm.onchange=e=>{const p=state.totoPricing[state.market];p.midKm=Math.max(p.shortKm+.5,+e.target.value||p.shortKm+.5);render()};
 const midFare=document.getElementById('toto-mid-fare'); if(midFare) midFare.onchange=e=>{state.totoPricing[state.market].midFare=Math.max(10,+e.target.value||10);render()};
 document.querySelectorAll('[data-vehicle]').forEach(b=>b.onclick=()=>{state.vehicle=b.dataset.vehicle;resetRideResponses();render()});
 document.querySelectorAll('[data-seats]').forEach(b=>b.onclick=()=>{state.seats=+b.dataset.seats;resetRideResponses();render()});
 document.querySelectorAll('[data-fare]').forEach(b=>b.onclick=()=>{if(isFixedTotoFare())return;state.offer=Math.max(50,state.offer + +b.dataset.fare);state.counterDraft=Math.max(state.offer+30,state.counterDraft);render()});
 document.querySelectorAll('[data-counter]').forEach(b=>b.onclick=()=>{if(isFixedTotoFare())return;state.counterDraft=Math.max(state.engagement?.amount||state.offer,state.counterDraft + +b.dataset.counter);render()});
 document.querySelectorAll('[data-paymode]').forEach(b=>b.onclick=()=>{state.payment[state.market]=b.dataset.paymode;render()});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
   const a=b.dataset.action;
   if(a==='request-ride') startPassengerRequest();
   if(a==='cancel-request'||a==='edit-route'){resetRideResponses();state.passengerStep='home';}
   if(a==='keep-looking'){state.excludedDrivers=[];state.noDriver=false;matchNextDriver();}
   if(a==='live-location'){state.from='Gomoh Railway Station';resetRideResponses();}
   if(a==='toggle-online') state.driverOnline=!state.driverOnline;
   if(a==='counter-mode' && state.engagement?.driverName===state.activeDriver && !isFixedTotoFare()) state.engagement.status='draft-counter';
   if(a==='accept-driver' && state.engagement?.driverName===state.activeDriver) confirmRide(state.engagement.amount);
   if(a==='driver-pass' && state.engagement?.driverName===state.activeDriver) failEngagement('driver_pass');
   if(a==='send-counter' && state.engagement?.driverName===state.activeDriver && !isFixedTotoFare()){
     state.engagement.status='counter'; state.engagement.counter=state.counterDraft;
   }
   if(a==='accept-counter' && state.engagement?.status==='counter') confirmRide(state.engagement.counter);
   if(a==='decline-counter' && state.engagement?.status==='counter') failEngagement('passenger_declined_counter');
   if(a==='confirm-payment' && state.ride?.name===state.activeDriver) state.paymentConfirmed[state.activeDriver]=true;
   if(a==='logout') state.loggedIn=false;
   if(a==='login') state.loggedIn=true;
   render();
 });
}
render();
