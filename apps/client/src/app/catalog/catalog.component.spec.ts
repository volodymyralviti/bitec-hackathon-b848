import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';
import { CatalogComponent } from './catalog.component';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { scenarioFixture } from '../testing/scenarios.fixture';
import report from '../../../../../content/scenarios/report-under-pressure.json';
import selection from '../../../../../content/scenarios/fair-selection.json';
import quiet from '../../../../../content/scenarios/quiet-after-formation.json';

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

  it('renders the three curated titles in order with honest source and review warnings', () => {
    response.next([report, selection, quiet] as unknown as Scenario[]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect([...root.querySelectorAll('.scenario-card h3')].map(node => node.textContent)).toEqual(['Підпис під сумнівом', 'Хто заслуговує на місце?', 'Тиша після шикування']);
    expect(root.textContent).toContain('Без експертного схвалення');
    expect(root.querySelectorAll('[data-demo-disclaimer]').length).toBe(3);
    expect(root.textContent).toContain('Нормативні посилання та редакції потребують підтвердження');
    expect(root.textContent).toContain('3 рішення');
    expect(root.querySelector('.scenario-card a')?.getAttribute('href')).toBe('/scenarios/report-under-pressure/play');
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
