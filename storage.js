import {fresh,validate} from './model.js';
export const KEY='workoutAppData';
export function read(){const raw=localStorage.getItem(KEY);return raw?validate(JSON.parse(raw)):fresh();}
export function write(d){localStorage.setItem(KEY,JSON.stringify(d));}
export function exportData(d){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=url;a.download=`setbook-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
