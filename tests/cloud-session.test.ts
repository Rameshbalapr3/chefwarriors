import {describe,it,expect,beforeEach,afterEach} from 'vitest';
import {createSessionToken,readSessionToken} from '../api/_lib/session';

describe('cloud session tokens',()=>{
 const previous=process.env.POS_SESSION_SECRET;
 beforeEach(()=>{process.env.POS_SESSION_SECRET='test-session-secret-value';});
 afterEach(()=>{if(previous===undefined)delete process.env.POS_SESSION_SECRET;else process.env.POS_SESSION_SECRET=previous;});
 it('round-trips a staff session',()=>{
  const token=createSessionToken({username:'manager',role:'admin'});
  expect(readSessionToken(token)).toEqual({username:'manager',role:'admin'});
 });
 it('rejects tampered tokens',()=>{
  const token=createSessionToken({username:'manager',role:'admin'});
  expect(readSessionToken(token.slice(0,-2)+'ab')).toBeNull();
  expect(readSessionToken(undefined)).toBeNull();
 });
});
