import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {initialState} from '../src/model';
import {createStore,loadState} from '../src/store';
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@tauri-apps/api/core',()=>({invoke,isTauri:()=>true}));
beforeEach(()=>{vi.useFakeTimers();invoke.mockReset();invoke.mockResolvedValue(undefined);const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('draft persistence',()=>{
 it('journals immediately, debounces disk writes, and flushes the last edit on close',async()=>{
  const store=createStore(initialState());
  const edit=(name:string)=>store.update(s=>({...s,draft:{...s.draft,invoice:{...s.draft.invoice,seller:{...s.draft.invoice.seller,name}}}}));
  edit('First');edit('Last');
  expect(JSON.parse(localStorage.getItem('invoice-recovery-v1')!).draft.invoice.seller.name).toBe('Last');
  expect(invoke).not.toHaveBeenCalled();await store.flush();
  expect(invoke).toHaveBeenCalledTimes(1);expect(invoke.mock.calls[0][1].state.draft.invoice.seller.name).toBe('Last');
  await vi.advanceTimersByTimeAsync(500);expect(invoke).toHaveBeenCalledTimes(1);
 });
 it('reports failed saves and permits retry without losing the draft',async()=>{
  invoke.mockRejectedValueOnce(new Error('Disk full'));const store=createStore(initialState());
  store.update(s=>({...s,lastNumber:'INV-020'}));await expect(store.flush()).rejects.toThrow('Disk full');
  expect(store.getSnapshot().error).toContain('Disk full');expect(store.getState().lastNumber).toBe('INV-020');
  await store.flush();expect(store.getSnapshot().error).toBe('');
 });
 it('restores a newer recovery journal to disk, but never replaces newer disk data',async()=>{
  const disk={...initialState(),revision:10};const recovered={...disk,revision:11,lastNumber:'INV-011'};
  localStorage.setItem('invoice-recovery-v1',JSON.stringify(recovered));invoke.mockResolvedValueOnce(disk);
  expect((await loadState()).lastNumber).toBe('INV-011');expect(invoke).toHaveBeenLastCalledWith('save_state',{state:recovered});
  invoke.mockReset();invoke.mockResolvedValueOnce({...disk,revision:12});expect((await loadState()).revision).toBe(12);expect(invoke).toHaveBeenCalledTimes(1);
 });
 it('refuses unknown disk versions instead of silently overwriting data',async()=>{
  invoke.mockResolvedValueOnce({...initialState(),version:2});await expect(loadState()).rejects.toThrow();expect(invoke).toHaveBeenCalledTimes(1);
 });
});
