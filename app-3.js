function driverRequestCard(d){
 const explicit=state.driverReplies[d.name];
 const status=explicit?.status || 'incoming';
 const chosenByPassenger=state.chosen?.name===d.name;
 const passengerChoseOther=state.chosen && state.chosen.name!==d.name;
 if(chosenByPassenger){
   return `<div class="assigned-banner"><small>PASSENGER CONFIRMED</small><h3>Priya chose your ${d.type==='toto'?'ToTo':'car'}</h3><p>${state.from} → ${state.to} • Fare ₹${state.chosen.amount}</p></div>`;
 }
 if(passengerChoseOther){
   return `<div class="closed-banner"><small>REQUEST CLOSED</small><h3>Passenger chose another driver</h3><p>This quote request is no longer available to ${d.name.split(' ')[0]}.</p></div>`;
 }
 if(!isDriverEligible(d)){
   return `<div class="feature-card mismatch-card"><span class="big-icon">${d.type==='toto'?'🛺':'🚗'}</span><h3>No matching request for this vehicle</h3><p>The live passenger request is for <strong>${rideLabel()}</strong>. ${d.name.split(' ')[0]} is driving <strong>${d.vehicle}</strong>.</p></div>`;
 }
 if(status==='accepted' || status==='counter'){
   const amount=explicit.amount;
   return `<div class="request-card"><div class="request-top"><div><small>YOUR RESPONSE</small><h1>₹${amount}</h1></div>${pill(status==='accepted'?'Accepted fare':'Counterquote sent',status==='accepted'?'good':'warn')}</div><div class="route-summary"><div><span class="route-dot green"></span><div><small>Pickup</small><strong>${state.from}</strong></div></div><div class="stem"></div><div><span class="route-dot dark"></span><div><small>Drop</small><strong>${state.to}</strong></div></div></div><div class="accepted-box"><span>✓</span><div><strong>Response sent</strong><small>Waiting for passenger confirmation.</small></div></div></div>`;
 }
 if(status==='draft-counter'){
   return `<div class="request-card"><div class="request-top"><div><small>PASSENGER OFFER</small><h1>₹${state.offer}</h1></div><div class="countdown">24s</div></div><div class="route-summary"><div><span class="route-dot green"></span><div><small>Pickup</small><strong>${state.from}</strong></div></div><div class="stem"></div><div><span class="route-dot dark"></span><div><small>Drop</small><strong>${state.to}</strong></div></div></div><div class="request-meta"><span>${state.vehicle==='toto'?'🛺':'🚗'} ${rideLabel()}</span><span>👤 Priya</span><span>📍 ${d.distance.replace(' away','')} pickup</span></div><div class="counter-box"><small>Your quote</small><div><button data-counter="-10">−</button><strong>₹${state.counterDraft}</strong><button data-counter="10">+</button></div><button class="primary full" data-action="send-counter">Send ₹${state.counterDraft} quote</button></div></div>`;
 }
 return `<div class="request-card"><div class="request-top"><div><small>PASSENGER OFFER</small><h1>₹${state.offer}</h1></div><div class="countdown">24s</div></div><div class="route-summary"><div><span class="route-dot green"></span><div><small>Pickup</small><strong>${state.from}</strong></div></div><div class="stem"></div><div><span class="route-dot dark"></span><div><small>Drop</small><strong>${state.to}</strong></div></div></div><div class="request-meta"><span>${state.vehicle==='toto'?'🛺':'🚗'} ${rideLabel()}</span><span>👤 Priya</span><span>📍 ${d.distance.replace(' away','')} pickup</span></div><div class="two-buttons"><button class="secondary" data-action="counter-mode">Reply with my quote</button><button class="primary" data-action="accept-driver">Accept ₹${state.offer}</button></div></div>`;
}

function driverPaymentCard(d){
 if(state.chosen?.name!==d.name) return '';
 const direct=state.payment[state.market]==='driver';
 if(direct){
   const confirmed=Boolean(state.paymentConfirmed[d.name]);
   return `<div class="feature-card payment-card"><div class="row between"><div><small>${state.market} admin setting</small><h3>Passenger pays you directly</h3></div>${pill('Direct','warn')}</div><p>After the ride, confirm only when you have actually received payment.</p><button class="${confirmed?'secondary':'primary'} full" data-action="confirm-payment">${confirmed?'✓ Payment marked received':'Confirm payment received'}</button></div>`;
 }
 return `<div class="feature-card payment-card"><div class="row between"><div><small>${state.market} admin setting</small><h3>Passenger pays Raahi</h3></div>${pill('Raahi','blue')}</div><p>Do not collect the fare from the passenger. Raahi will settle the driver payment separately.</p><div class="driver-payment-note">No cash/payment-received confirmation is required from the driver.</div></div>`;
}

function driver(){
 const d=activeDriver();
 return `<div class="screen"><header class="hero-header driver-hero"><div class="brand-row"><div class="brand-mark">R</div><span>Raahi Driver</span>${pill('5 demo drivers')}</div><div class="row between greeting"><div><small>${d.name}</small><h1>${state.driverOnline?'You’re online':'You’re offline'}</h1></div><button class="toggle ${state.driverOnline?'on':''}" data-action="toggle-online"><span></span></button></div></header><div class="content-stack overlap"><div class="feature-card driver-picker"><label><small>Demo driver</small><select id="active-driver">${driverOptions(state.activeDriver)}</select></label><span class="vehicle-tag">${d.type==='toto'?'🛺':'🚗'} ${d.seats} seats</span></div><div class="feature-card driver-location"><div><small>Your current location</small><select id="driver-location">${locationOptions(state.driverLocation)}</select></div><button class="locate square">⌖</button></div>${state.driverOnline?`<div class="row between">${section('Live quote request','Passenger has proposed a fare')}${pill('Live','good')}</div>${driverRequestCard(d)}${driverPaymentCard(d)}`:`<div class="empty-state"><span>◌</span><h2>You’re offline</h2><p>Go online when you’re ready to receive nearby ride requests.</p></div>`}</div></div>`;
}

function admin(){
 return `<div class="screen admin-screen"><header class="admin-header"><div><div class="brand-row"><div class="brand-mark">R</div><span>Raahi Admin</span></div><small>Global admin • prototype controls</small></div>${avatar('GA','small')}</header><div class="content-stack"><div class="stats-grid"><div class="stat"><small>Drivers</small><strong>5</strong><span>hard-coded</span></div><div class="stat"><small>Passengers</small><strong>5</strong><span>hard-coded</span></div><div class="stat"><small>Locations</small><strong>3</strong><span>demo points</span></div></div>${section('Local market configuration','Global admin can configure each local operation independently')}<div class="feature-card admin-config"><label><small>Market</small><select id="admin-market">${['Gomoh','Dhanbad'].map(m=>`<option ${m===state.market?'selected':''}>${m}</option>`).join('')}</select></label></div>${section('Payment collection','One operating model can be selected for each market')}<div class="payment-options"><button class="${state.payment[state.market]==='driver'?'selected':''}" data-paymode="driver"><span class="radio">${state.payment[state.market]==='driver'?'●':'○'}</span><div><strong>Passenger pays driver</strong><small>Driver confirms payment received. Raahi does not collect the fare.</small></div></button><button class="${state.payment[state.market]==='raahi'?'selected':''}" data-paymode="raahi"><span class="radio">${state.payment[state.market]==='raahi'?'●':'○'}</span><div><strong>Passenger pays Raahi</strong><small>Raahi collects the fare and later pays the driver.</small></div></button></div><div class="rule-preview"><span>Preview</span><p>In <strong>${state.market}</strong>, passengers will <strong>${state.payment[state.market]==='driver'?'pay the driver directly':'pay Raahi directly'}</strong>.</p></div>${section('Local admins','Global admin has super access across all markets')}<div class="feature-card admin-list"><div>${avatar('G','tiny')}<span><strong>Gomoh Admin</strong><small>Direct driver payment</small></span>${pill('Active','good')}</div><div>${avatar('D','tiny')}<span><strong>Dhanbad Admin</strong><small>Raahi payment collection</small></span>${pill('Active','good')}</div><button class="secondary full">+ Create local admin</button></div><p class="admin-note">Prototype rule: local admin controls only their market; global admin can create local admins and has super access.</p></div></div>`;
}

