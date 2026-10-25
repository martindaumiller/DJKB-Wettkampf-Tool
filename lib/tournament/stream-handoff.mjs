import {streamURLs} from '../../public/zentrum/stream-links.js';
export function competitionStreamURL(value){return streamURLs(value)?.embed||'';}
export function streamHandoff(user,tatamis){if(!['admin','stream'].includes(user?.role))throw Object.assign(Error('Nur Stream-Regie'),{status:403});return {schema:'djkb-stream-handoff/1',date:null,status:'not-configured',liveStatusVerified:false,settings:{},verified:[],pending:['Kamera, Ton, Upload und Wiedergabe vor Ort prüfen'],streams:tatamis.map(t=>({tatami:t.id,competition:{assigned:!!t.stream,url:t.stream||''},test:null}))};}
