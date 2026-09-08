import {fresh,validate,migrate} from './model.js';
export const KEY='workoutAppData';
export function read(){const raw=localStorage.getItem(KEY);if(!raw)return fresh();const old=validate(JSON.parse(raw));if(old.schemaVersion===2)return old;const next=validate(migrate(old));localStorage.setItem(KEY+'-before-v2',raw);write(next);return next;}
export function write(d){localStorage.setItem(KEY,JSON.stringify(d));}
export function exportData(d){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=url;a.download=`setbook-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
