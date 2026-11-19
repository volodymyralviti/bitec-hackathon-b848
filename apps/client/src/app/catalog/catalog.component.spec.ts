import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';
import { CatalogComponent } from './catalog.component';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { scenarioFixture } from '../testing/scenarios.fixture';

describe('CatalogComponent', () => {
  let fixture: ComponentFixture<CatalogComponent>;
  let response: Subject<Scenario[]>;
  let list: jasmine.Spy;
  beforeEach(async () => {
    response = new Subject<Scenario[]>();
    list = jasmine.createSpy('list').and.returnValue(response.asObservable());
    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideRouter([]), { provide: ScenarioRepository, useValue: { list } }]
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
  });

  it('announces loading until scenarios arrive', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Завантажуємо');
  });

  it('renders both JSON titles and honest demo/review labels', () => {
    response.next([scenarioFixture(), scenarioFixture('truth-under-pressure')]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.scenario-card').length).toBe(2);
    expect(root.textContent).toContain('Постачання під тиском');
    expect(root.textContent).toContain('Професійна правда під тиском');
    expect(root.textContent).toContain('Без експертного схвалення');
    expect(root.textContent).toContain('автором не визначена');
    expect(root.querySelector('.scenario-card a')?.getAttribute('href')).toBe('/scenarios/urgent-supply/play');
  });

  it('shows an empty state', () => {
    response.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Навчальних сценаріїв поки немає');
  });

  it('handles an API error and retries without a duplicate pending request', () => {
    response.error(new Error('Unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    const retry = new Subject<Scenario[]>();
    list.and.returnValue(retry.asObservable());
    fixture.nativeElement.querySelector('button').click();
    fixture.componentInstance.load();
    expect(list).toHaveBeenCalledTimes(2);
    retry.next([scenarioFixture()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.scenario-card').length).toBe(1);
  });
});
