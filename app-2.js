function passengerHome(){
 const market=marketForPickup();
 const marketActive=state.marketStatus[market]==='active';
 const vehicleAvailable=isVehicleEnabled(state.vehicle,market);
 const rule=totoFareRule();
 const fixed=isFixedTotoFare();
 const fareCard=fixed
   ? `<div class="feature-card offer-card fixed-fare-card"><div><small>Fixed ToTo fare • ${rule.distance} km</small><h2>₹${rule.amount}</h2><p>${market} policy fixes this distance slab. This fare cannot be negotiated.</p></div>${pill('Fixed fare','good')}</div>`
   : `<div class="feature-card offer-card"><div><small>${state.vehicle==='toto'?'Your offer • '+rule.distance+' km':'Your offer'}</small><h2>₹${state.offer}</h2><p>Raahi will engage one nearby driver at a time.</p></div><div class="fare-controls"><button data-fare="-10">−</button><button data-fare="10">+</button></div></div>`;
 const normalAction=fixed?`Find a ToTo for ₹${rule.amount}`:state.vehicle==='toto'?`Find a ToTo at ₹${state.offer}`:`Find a car at ₹${state.offer}`;
 const blockedReason=!marketActive?'Market temporarily paused':!vehicleAvailable?`${state.vehicle==='toto'?'ToTo':'Car'} unavailable in ${market}`:state.from===state.to?'Choose a different destination':'';
 const actionLabel=blockedReason||normalAction;
 const actionDisabled=Boolean(blockedReason);
 return `<div class="screen"><header class="hero-header"><div class="brand-row"><div class="brand-mark">R</div><span>Raahi</span>${pill('UI V0.2')}</div><div class="row between greeting"><div><small>Good evening</small><h1>Where are you going?</h1></div>${avatar('Priya','small')}</div></header><div class="content-stack overlap">
 <div class="market-strip feature-card"><div><small>Your Raahi market</small><strong>${market}</strong></div>${pill(marketActive?'Active':'Paused',marketActive?'good':'warn')}</div>
 <div class="location-card feature-card"><div class="route-visual"><span class="route-dot green"></span><span class="vertical-line"></span><span class="route-dot dark"></span></div><label><small>Your current location</small><select id="from">${locationOptions(state.from)}</select></label><label><small>Destination</small><select id="to">${locationOptions(state.to)}</select></label><button class="locate" data-action="live-location">⌖ Use my live location</button></div>
 <div class="distance-chip">📍 Demo route distance: <strong>${routeDistanceKm()} km</strong></div>
 ${section('Choose your ride',state.vehicle==='toto'?'Local ToTo rules apply automatically':'Choose the car capacity you need')}
 <div class="ride-grid"><button class="ride-option ${state.vehicle==='toto'?'selected':''}" data-vehicle="toto" ${state.vehicleEnabled[market].toto?'':'disabled'}><span class="icon">🛺</span><strong>ToTo</strong><small>${state.vehicleEnabled[market].toto?'Local ride':'Unavailable'}</small>${state.vehicle==='toto'?'<span class="selected-check">✓</span>':''}</button><button class="ride-option ${state.vehicle==='car'?'selected':''}" data-vehicle="car" ${state.vehicleEnabled[market].car?'':'disabled'}><span class="icon">🚗</span><strong>Car</strong><small>${state.vehicleEnabled[market].car?'Choose capacity':'Unavailable'}</small>${state.vehicle==='car'?'<span class="selected-check">✓</span>':''}</button></div>
 ${state.vehicle==='car'?`<div class="feature-card capacity-card"><small>Car seating capacity</small><div class="segmented">${[4,5,6,7].map(n=>`<button data-seats="${n}" class="${state.seats===n?'active':''}">${n} seats</button>`).join('')}</div></div>`:''}
 ${fareCard}
 ${state.vehicle==='toto'?`<div class="admin-rule-note"><span>ⓘ</span><p><strong>${market} ToTo rule:</strong> ${fixed?`${rule.label} = fixed ₹${rule.amount}.`:`${rule.label} = negotiation.`}</p></div>`:''}
 <div class="admin-rule-note"><span>ⓘ</span><p><strong>Payment:</strong> ${state.payment[market]==='driver'?'Pay the driver directly.':'Pay Raahi.'}</p></div>
 ${!marketActive?`<div class="admin-rule-note"><span>!</span><p><strong>${market} is paused:</strong> existing rides continue, but new requests are temporarily stopped.</p></div>`:''}
 <button class="primary full big" data-action="request-ride" ${actionDisabled?'disabled':''}>${actionLabel}</button><p class="fineprint">Raahi finds one compatible nearby driver at a time. You do not need to compare drivers.</p></div></div>`;
}

function passengerSearching(){
 const fixed=isFixedTotoFare();
 const fare=currentFare();
 const d=engagementDriver();
 if(state.noDriver){
   return `<div class="screen"><header class="app-header compact"><div><strong>No driver nearby right now</strong><small>${rideLabel()} • ${requestMarket()}</small></div>${pill('Searching','warn')}</header><div class="content-stack">${routeCard()}<div class="empty-state"><span>⌛</span><h2>We couldn’t find another nearby driver</h2><p>Your request can keep waiting for new supply, or you can cancel and change the journey.</p><button class="primary full" data-action="keep-looking">Keep looking</button><button class="text-button" data-action="cancel-request">Cancel request</button></div></div></div>`;
 }
 if(!d){
   return `<div class="screen"><header class="app-header compact"><div><strong>Finding your ${rideLabel()}</strong><small>${requestMarket()}</small></div><span class="pulse-dot"></span></header><div class="content-stack">${routeCard()}<div class="waiting-banner"><span class="spinner"></span><div><strong>Looking for a nearby driver</strong><small>Raahi checks compatible drivers in order.</small></div></div><button class="text-button" data-action="cancel-request">Cancel request</button></div></div>`;
 }
 if(state.engagement.status==='counter'){
   return `<div class="screen"><header class="app-header compact"><div><strong>${d.name.split(' ')[0]} replied</strong><small>${rideLabel()} • ${requestMarket()}</small></div>${pill('Your decision','warn')}</header><div class="content-stack">${routeCard()}<div class="quote-card">${avatar(d.name)}<div class="quote-main"><div class="row between"><div><h3>${d.name}</h3><p>${d.vehicle} • ⭐ ${d.rating}</p></div>${pill('Counter','warn')}</div><div class="quote-bottom"><span>Your offer ₹${state.offer}</span><strong>₹${state.engagement.counter}</strong></div><div class="two-buttons"><button class="secondary" data-action="decline-counter">Decline & keep looking</button><button class="primary" data-action="accept-counter">Accept ₹${state.engagement.counter}</button></div></div></div><p class="fineprint">There is only one counter round. Declining releases both of you and Raahi looks for the next eligible driver.</p></div></div>`;
 }
 return `<div class="screen"><header class="app-header compact"><div><strong>Finding your ${rideLabel()}</strong><small>${fixed?'Fixed fare ₹'+fare:'Your offer ₹'+fare}</small></div><span class="pulse-dot"></span></header><div class="content-stack">${routeCard()}<div class="waiting-banner"><span class="spinner"></span><div><strong>${d.name.split(' ')[0]} is reviewing your request</strong><small>Only this driver is engaged with you right now.</small></div></div><div class="quote-card pending">${avatar(d.name)}<div class="quote-main"><div class="row between"><div><h3>${d.name}</h3><p>${d.vehicle} • ⭐ ${d.rating}</p></div>${pill('Reviewing')}</div><div class="quote-bottom"><span>${d.distance}</span><strong>₹${fare}</strong></div><p>${fixed?'The fare is fixed. The driver can Accept or Pass.':'The driver can Accept, Counter once, or Pass.'}</p></div></div><button class="text-button" data-action="cancel-request">Cancel request</button></div></div>`;
}

function passengerBooked(){
 const d=state.ride;
 if(!d) return passengerHome();
 const direct=state.payment[d.market]==='driver';
 const completed=d.status==='completed';
 const statusCopy={
   en_route:{title:'Ride confirmed',sub:`${d.name.split(' ')[0]} is on the way`,badge:'On the way',tone:'good'},
   arrived:{title:'Your driver has arrived',sub:`Meet ${d.name.split(' ')[0]} at the pickup`,badge:'Arrived',tone:'good'},
   in_progress:{title:'Ride in progress',sub:`Heading to ${state.to}`,badge:'In ride',tone:'blue'},
   completed:{title:'Ride completed',sub:'You have arrived',badge:'Completed',tone:'good'}
 }[d.status] || {title:'Ride confirmed',sub:`${d.name.split(' ')[0]} is on the way`,badge:'Confirmed',tone:'good'};
 const progress = d.status==='en_route'
   ? `<div class="waiting-banner"><span class="pulse-dot"></span><div><strong>${d.name.split(' ')[0]} is heading to your pickup</strong><small>${d.distance} in this demo.</small></div></div>`
   : d.status==='arrived'
   ? `<div class="assigned-banner"><small>DRIVER ARRIVED</small><h3>${d.name.split(' ')[0]} is waiting at your pickup</h3><p>Meet the driver and board when ready.</p></div>`
   : d.status==='in_progress'
   ? `<div class="waiting-banner"><span class="pulse-dot"></span><div><strong>Your ride is underway</strong><small>Fare remains ₹${d.amount}. Destination: ${state.to}.</small></div></div>`
   : `<div class="assigned-banner"><small>RIDE COMPLETE</small><h3>You’ve arrived</h3><p>The ride lifecycle is complete. Payment is handled separately below.</p></div>`;
 let paymentCard='';
 if(!completed){
   paymentCard=`<div class="feature-card payment-card"><div class="row between"><div><small>Payment method</small><h3>${direct?'Pay driver directly':'Pay Raahi'}</h3></div>${pill(direct?'Direct':'Raahi',direct?'warn':'blue')}</div><p>${direct?`After the ride, pay ₹${d.amount} to ${d.name.split(' ')[0]}.`:`Raahi will collect ₹${d.amount} in the payment step.`}</p></div>`;
 } else if(direct){
   const confirmed=Boolean(state.paymentConfirmed[d.name]);
   paymentCard=`<div class="feature-card payment-card"><div class="row between"><div><small>Payment</small><h3>${confirmed?'Payment confirmed':'Pay driver directly'}</h3></div>${pill(confirmed?'Confirmed':'Direct',confirmed?'good':'warn')}</div><p>${confirmed?`${d.name.split(' ')[0]} confirmed receiving ₹${d.amount}.`:`Pay ₹${d.amount} directly to ${d.name.split(' ')[0]}. Only the driver can confirm receipt in Raahi.`}</p></div>`;
 } else {
   const paid=Boolean(state.raahiPaymentPaid[d.name]);
   paymentCard=`<div class="feature-card payment-card"><div class="row between"><div><small>Payment</small><h3>${paid?'Paid to Raahi':'Pay Raahi'}</h3></div>${pill(paid?'Confirmed':'Raahi',paid?'good':'blue')}</div><p>${paid?`Raahi received ₹${d.amount}. Driver settlement is separate.`:`Pay the agreed ₹${d.amount} to Raahi.`}</p>${paid?'':`<button class="primary full" data-action="pay-raahi">Pay ₹${d.amount} to Raahi</button>`}</div>`;
 }
 return `<div class="screen"><header class="app-header compact"><div><strong>${statusCopy.title}</strong><small>${statusCopy.sub}</small></div>${pill(statusCopy.badge,statusCopy.tone)}</header>${completed?'':mapPreview()}<div class="content-stack"><div class="success-card"><div class="success-mark">✓</div><div><h2>${d.name}</h2><p>${d.vehicle} • ⭐ ${d.rating}</p></div><strong>₹${d.amount}</strong></div><div class="feature-card"><div class="route-line"><span class="route-dot green"></span><div><small>Pickup</small><strong>${state.from}</strong></div></div><div class="route-stem"></div><div class="route-line"><span class="route-dot dark"></span><div><small>Destination</small><strong>${state.to}</strong></div></div></div>${progress}${paymentCard}${completed?`<button class="secondary full" data-action="new-ride">Book another ride</button>`:''}</div></div>`;
}
function passenger(){return state.passengerStep==='home'?passengerHome():state.passengerStep==='searching'?passengerSearching():passengerBooked()}
