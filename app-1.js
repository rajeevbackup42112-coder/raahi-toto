const locations = ['Gomoh Railway Station','Dhanbad Railway Station','Bank More'];
const locationMarkets = {
  'Gomoh Railway Station':'Gomoh',
  'Dhanbad Railway Station':'Dhanbad',
  'Bank More':'Dhanbad'
};
const demoDistances = {
  'Gomoh Railway Station|Dhanbad Railway Station':35,
  'Dhanbad Railway Station|Gomoh Railway Station':35,
  'Gomoh Railway Station|Bank More':37,
  'Bank More|Gomoh Railway Station':37,
  'Dhanbad Railway Station|Bank More':2.8,
  'Bank More|Dhanbad Railway Station':2.8
};
const drivers = [
  {name:'Ravi Kumar',vehicle:'Green ToTo',type:'toto',seats:4,rating:4.8,distance:'1.2 km away',priority:1},
  {name:'Imran Ansari',vehicle:'White Dzire',type:'car',seats:4,rating:4.9,distance:'2.8 km away',priority:1},
  {name:'Sunil Mahto',vehicle:'Blue Ertiga',type:'car',seats:7,rating:4.7,distance:'3.4 km away',priority:2},
  {name:'Pankaj Yadav',vehicle:'Yellow ToTo',type:'toto',seats:4,rating:4.6,distance:'2.0 km away',priority:2},
  {name:'Deepak Singh',vehicle:'Silver Triber',type:'car',seats:6,rating:4.8,distance:'4.1 km away',priority:3}
];
const passengers = ['Priya','Amit','Neha','Rohit','Sana'];
const allDriverAuth=()=>Object.fromEntries(drivers.map(d=>[d.name,true]));
let state = {
  role:'passenger', loggedIn:true, passengerStep:'home', market:'Gomoh', adminPersona:'global', adminNotice:'',
  payment:{Gomoh:'driver',Dhanbad:'raahi'},
  marketStatus:{Gomoh:'active',Dhanbad:'active'},
  vehicleEnabled:{Gomoh:{toto:true,car:true},Dhanbad:{toto:true,car:true}},
  proximity:{
    Gomoh:{toto:[3,5,8],car:[5,8,12]},
    Dhanbad:{toto:[3,5,8],car:[5,8,12]}
  },
  driverAuth:{Gomoh:allDriverAuth(),Dhanbad:allDriverAuth()},
  totoPricing:{
    Gomoh:{shortKm:3,shortFare:50,midKm:5,midFare:100},
    Dhanbad:{shortKm:3,shortFare:50,midKm:5,midFare:100}
  },
  from:locations[0], to:locations[1], vehicle:'toto', seats:4, offer:180,
  engagement:null, ride:null, excludedDrivers:[], noDriver:false,
  activeDriver:'Ravi Kumar', driverOnline:true, driverLocation:locations[2],
  counterDraft:210, paymentConfirmed:{}, raahiPaymentPaid:{}
};
const app = document.getElementById('app');

function pill(text,tone='neutral'){return `<span class="pill ${tone}">${text}</span>`}
function avatar(name,cls=''){const initials=name.split(' ').map(x=>x[0]).join('').slice(0,2);return `<div class="avatar ${cls}">${initials}</div>`}
function section(title,hint=''){return `<div class="section-title"><h2>${title}</h2>${hint?`<p>${hint}</p>`:''}</div>`}
function routeCard(){return `<div class="feature-card mini-route"><div><span>●</span><strong>${state.from}</strong></div><div class="mini-route-line"></div><div><span>◆</span><strong>${state.to}</strong></div>${state.passengerStep==='searching'?`<button data-action="edit-route">Cancel & edit</button>`:''}</div>`}
function mapPreview(){return `<div class="map-preview"><div class="map-grid"></div><div class="map-route"></div><div class="pin pickup">●</div><div class="pin drop">●</div><div class="map-label pickup-label">${state.from}</div><div class="map-label drop-label">${state.to}</div><div class="map-note">Map placeholder • real maps later</div></div>`}
function locationOptions(value){return locations.map(x=>`<option ${x===value?'selected':''}>${x}</option>`).join('')}
function driverOptions(value){return drivers.map(d=>`<option value="${d.name}" ${d.name===value?'selected':''}>${d.name} — ${d.vehicle}</option>`).join('')}
function activeDriver(){return drivers.find(d=>d.name===state.activeDriver) || drivers[0]}
function marketForPickup(){return locationMarkets[state.from] || 'Gomoh'}
function requestMarket(){return state.ride?.market || state.engagement?.market || marketForPickup()}
function adminMarket(){return state.adminPersona==='gomoh'?'Gomoh':state.adminPersona==='dhanbad'?'Dhanbad':state.market}
function isVehicleEnabled(vehicle,market=marketForPickup()){return Boolean(state.vehicleEnabled[market]?.[vehicle])}
function marketAllowsRequest(){const m=marketForPickup();return state.marketStatus[m]==='active' && isVehicleEnabled(state.vehicle,m)}
function isDriverEligible(d){const m=requestMarket();return d.type===state.vehicle && (state.vehicle==='toto' || d.seats>=state.seats) && state.driverAuth[m]?.[d.name]!==false}
function rideLabel(){return state.vehicle==='toto' ? 'ToTo' : `${state.seats}-seat car`}
function routeDistanceKm(){return demoDistances[`${state.from}|${state.to}`] ?? 6.5}
function totoFareRule(){
  const distance=routeDistanceKm();
  const policy=state.totoPricing[requestMarket()];
  if(state.vehicle!=='toto') return {mode:'negotiation',distance,amount:null,label:'Negotiation'};
  if(distance<=policy.shortKm) return {mode:'fixed',distance,amount:policy.shortFare,label:`0–${policy.shortKm} km`};
  if(distance<=policy.midKm) return {mode:'fixed',distance,amount:policy.midFare,label:`>${policy.shortKm}–${policy.midKm} km`};
  return {mode:'negotiation',distance,amount:null,label:`>${policy.midKm} km`};
}
function isFixedTotoFare(){return state.vehicle==='toto' && totoFareRule().mode==='fixed'}
function currentFare(){const rule=totoFareRule(); return rule.mode==='fixed'?rule.amount:state.offer}
function compatibleDrivers(){return drivers.filter(isDriverEligible).sort((a,b)=>a.priority-b.priority)}
function engagementDriver(){return state.engagement ? drivers.find(d=>d.name===state.engagement.driverName) : null}
function resetRideResponses(){
  state.engagement=null; state.ride=null; state.excludedDrivers=[]; state.noDriver=false; state.paymentConfirmed={}; state.raahiPaymentPaid={};
  if(state.passengerStep!=='home') state.passengerStep='home';
}
function matchNextDriver(){
  const d=compatibleDrivers().find(x=>!state.excludedDrivers.includes(x.name));
  if(!d){state.engagement=null;state.noDriver=true;return;}
  state.noDriver=false;
  state.engagement={driverName:d.name,status:'reviewing',market:marketForPickup(),amount:currentFare(),counter:null};
  state.counterDraft=Math.max(currentFare()+30,210);
}
function startPassengerRequest(){
  if(!marketAllowsRequest()) return;
  state.excludedDrivers=[]; state.ride=null; state.noDriver=false; state.passengerStep='searching';
  matchNextDriver();
}
function failEngagement(reason){
  if(state.engagement?.driverName && !state.excludedDrivers.includes(state.engagement.driverName)) state.excludedDrivers.push(state.engagement.driverName);
  state.engagement=null;
  matchNextDriver();
}
function confirmRide(amount){
  const d=engagementDriver(); if(!d) return;
  state.engagement.status='accepted';
  state.ride={...d,amount:+amount,market:state.engagement.market,status:'en_route'};
  state.passengerStep='booked';
}
