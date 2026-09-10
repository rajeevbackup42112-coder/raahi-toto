
const locations = ['Gomoh Railway Station','Dhanbad Railway Station','Bank More'];
const drivers = [
  {name:'Ravi Kumar',vehicle:'Green ToTo',type:'toto',seats:4,rating:4.8,distance:'1.2 km away'},
  {name:'Imran Ansari',vehicle:'White Dzire',type:'car',seats:4,rating:4.9,distance:'2.8 km away'},
  {name:'Sunil Mahto',vehicle:'Blue Ertiga',type:'car',seats:7,rating:4.7,distance:'3.4 km away'},
  {name:'Pankaj Yadav',vehicle:'Yellow ToTo',type:'toto',seats:4,rating:4.6,distance:'2.0 km away'},
  {name:'Deepak Singh',vehicle:'Silver Triber',type:'car',seats:6,rating:4.8,distance:'4.1 km away'}
];
const passengers = ['Priya','Amit','Neha','Rohit','Sana'];
let state = {
  role:'passenger', loggedIn:true, passengerStep:'home', market:'Gomoh',
  payment:{Gomoh:'driver',Dhanbad:'raahi'},
  from:locations[0], to:locations[1], vehicle:'toto', seats:4, offer:180, chosen:null,
  activeDriver:'Ravi Kumar', driverOnline:true, driverLocation:locations[2],
  driverReplies:{}, counterDraft:210, paymentConfirmed:{}
};
const app = document.getElementById('app');

function pill(text,tone='neutral'){return `<span class="pill ${tone}">${text}</span>`}
function avatar(name,cls=''){const initials=name.split(' ').map(x=>x[0]).join('').slice(0,2);return `<div class="avatar ${cls}">${initials}</div>`}
function section(title,hint=''){return `<div class="section-title"><h2>${title}</h2>${hint?`<p>${hint}</p>`:''}</div>`}
function routeCard(){return `<div class="feature-card mini-route"><div><span>●</span><strong>${state.from}</strong></div><div class="mini-route-line"></div><div><span>◆</span><strong>${state.to}</strong></div><button data-action="edit-route">Edit</button></div>`}
function mapPreview(){return `<div class="map-preview"><div class="map-grid"></div><div class="map-route"></div><div class="pin pickup">●</div><div class="pin drop">●</div><div class="map-label pickup-label">${state.from}</div><div class="map-label drop-label">${state.to}</div><div class="map-note">Map placeholder • real maps later</div></div>`}
function locationOptions(value){return locations.map(x=>`<option ${x===value?'selected':''}>${x}</option>`).join('')}
function driverOptions(value){return drivers.map(d=>`<option value="${d.name}" ${d.name===value?'selected':''}>${d.name} — ${d.vehicle}</option>`).join('')}
function activeDriver(){return drivers.find(d=>d.name===state.activeDriver) || drivers[0]}
function isDriverEligible(d){return d.type===state.vehicle && (state.vehicle==='toto' || d.seats>=state.seats)}
function rideLabel(){return state.vehicle==='toto' ? 'ToTo' : `${state.seats}-seat car`}
function replyFor(d,index){
  const explicit=state.driverReplies[d.name];
  if(explicit) return explicit;
  if(d.name===state.activeDriver) return {status:'pending',amount:null};
  if(index===0) return {status:'accepted',amount:state.offer};
  if(index===1) return {status:'counter',amount:state.offer+30};
  return {status:'pending',amount:null};
}
