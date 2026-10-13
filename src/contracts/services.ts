import type {State,Session,Checkout,Order,Item,Settings,Job} from '../domain/model';
export type Result<T>={ok:true;data:T}|{ok:false;kind:'validation'|'operational'|'unauthorized';error:string};
export interface MenuRepository {saveItem(item:Item):Promise<Result<void>>;saveCategory(name:string,previous?:string):Promise<Result<void>>}
export interface BillingService {checkout(input:Checkout):Promise<Result<Order>>;cancel(id:string,reason:string):Promise<Result<void>>}
export interface ReportService {state():Promise<Result<State>>}
export interface SettingsRepository {saveSettings(settings:Settings):Promise<Result<void>>}
export interface PrinterService {printers():Promise<Result<string[]>>;print(jobId:string,reason?:string):Promise<Result<Job>>;testPrinter(kind:'counter'|'kitchen'):Promise<Result<string>>}
export interface BackupService {backup():Promise<Result<string>>;restore():Promise<Result<string>>}
export interface Services extends MenuRepository,BillingService,ReportService,SettingsRepository,PrinterService,BackupService {
 mode:'desktop'|'browser';authStatus():Promise<Result<{setup:boolean;session:Session|null}>>;login(username:string,password:string,setup?:boolean):Promise<Result<Session>>;logout():Promise<Result<void>>;switchRole(role:'admin'|'cashier'):Promise<Result<Session>>;reset():Promise<Result<void>>;addUser(username:string,password:string):Promise<Result<void>>;
}
declare global {interface Window {pos?:Services}}
