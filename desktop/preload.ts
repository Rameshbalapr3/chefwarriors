import {contextBridge,ipcRenderer} from 'electron';
import type {Services} from '../src/contracts/services';
const methods=['state','authStatus','login','logout','switchRole','checkout','cancel','saveItem','saveCategory','saveSettings','printers','print','testPrinter','backup','restore','reset','addUser'] as const;
const bridge:Record<string,unknown>={mode:'desktop'};
for(const method of methods)bridge[method]=(...args:unknown[])=>ipcRenderer.invoke('pos:'+method,...args);
contextBridge.exposeInMainWorld('pos',bridge as unknown as Services);
