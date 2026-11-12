import {contextBridge,ipcRenderer} from 'electron';
import type {Services} from '../src/contracts/services';
const methods=['state','authStatus','login','logout','switchRole','checkout','cancel','amendOrder','saveItem','saveCategory','saveSettings','saveExpense','deleteExpense','printers','print','testPrinter','printExpenseBill','backup','restore','reset','addUser','getUpdateStatus','checkForUpdate','downloadUpdate','installUpdate'] as const;
const bridge:Record<string,unknown>={mode:'desktop'};
for(const method of methods)bridge[method]=(...args:unknown[])=>ipcRenderer.invoke('pos:'+method,...args);
bridge.onUpdateStatus=(callback:(status:unknown)=>void)=>{
 const listener=(_event:unknown,status:unknown)=>callback(status);
 ipcRenderer.on('pos:update-status',listener);
 return ()=>ipcRenderer.removeListener('pos:update-status',listener);
};
contextBridge.exposeInMainWorld('pos',bridge as unknown as Services);
