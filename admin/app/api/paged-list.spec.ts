import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PagedList } from './paged-list';

describe('staff cursor lists', () => {
  it('appends subsequent pages and clears cursor for a new search', () => {
    const response = new Subject<{ data: string[]; page: { next: string | null } }>();
    const fetch = jasmine.createSpy('fetch').and.returnValue(response);
    const list = TestBed.runInInjectionContext(() => new PagedList<string>(fetch));
    list.load();
    response.next({ data: ['first'], page: { next: 'cursor-2' } });
    list.load(true);
    expect(fetch).toHaveBeenCalledWith('cursor-2');
    response.next({ data: ['second'], page: { next: null } });
    expect(list.rows()).toEqual(['first', 'second']);
    list.load(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    list.load();
    expect(fetch).toHaveBeenCalledWith(undefined);
    expect(list.rows()).toEqual([]);
  });

  it('cancels an outdated query and retains loaded rows when the next page fails', () => {
    const old = new Subject<{ data: string[]; page: { next: string | null } }>();
    const current = new Subject<{ data: string[]; page: { next: string | null } }>();
    const more = new Subject<{ data: string[]; page: { next: string | null } }>();
    const fetch = jasmine.createSpy('fetch').and.returnValues(old, current, more);
    const list = TestBed.runInInjectionContext(() => new PagedList<string>(fetch));
    list.load();
    list.load();
    old.next({ data: ['stale'], page: { next: null } });
    expect(list.rows()).toEqual([]);
    current.next({ data: ['current'], page: { next: 'more' } });
    list.load(true);
    more.error(new Error('offline'));
    expect(list.rows()).toEqual(['current']);
    expect(list.next()).toBe('more');
    expect(list.error()).toBeTruthy();
    expect(list.loading()).toBeFalse();
  });
});
