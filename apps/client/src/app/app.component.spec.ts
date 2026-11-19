import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('provides Ukrainian navigation, a main landmark and keyboard skip link', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('main')?.id).toBe('main-content');
    expect(root.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(root.querySelector('nav')?.textContent).toContain('Сценарії');
    expect(root.querySelector('.brand')?.textContent).toContain('Точка рішення');
    const main = root.querySelector('main')!;
    const focus = spyOn(main, 'focus');
    (root.querySelector('.skip-link') as HTMLAnchorElement).click();
    expect(focus).toHaveBeenCalled();
  });
});
