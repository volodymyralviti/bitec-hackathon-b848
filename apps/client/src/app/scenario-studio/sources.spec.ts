import { TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { validateScenario, type SourceReference } from '@eds/scenario-schema';
import { EditorFieldComponent } from './editor-field.component';
import { buildControl, freshItem, serializeControl } from './form-model';
import { SourcesComponent } from '../shared/ui/sources.component';
import { scenarioFixture } from '../testing/scenarios.fixture';

describe('Legal source forms', () => {
  it('creates and edits a normative source through accessible controls and preserves metadata', async () => {
    const scenario = scenarioFixture();
    const form = buildControl(scenario) as FormGroup;
    const sources = form.get('sources') as FormArray;
    const fixture = TestBed.createComponent(EditorFieldComponent);
    fixture.componentRef.setInput('control', sources);
    fixture.componentRef.setInput('name', 'sources');
    fixture.componentRef.setInput('path', ['sources']);
    fixture.componentRef.setInput('scenarioForm', form);
    fixture.detectChanges();
    fixture.componentInstance.add(); fixture.detectChanges();
    const source = sources.at(3);
    source.get('sourceId')!.setValue('test-law');
    const select = fixture.nativeElement.querySelector('[data-field-path="sources.3.sourceType"]') as HTMLSelectElement;
    select.value = 'normative'; select.dispatchEvent(new Event('change'));
    source.get('documentNumber')!.setValue('TEST-1');
    source.get('pinpoint')!.setValue('Тестовий пункт');
    source.get('relevance')!.setValue('Синтетична перевірка форми, не правова основа.');
    const serialized = serializeControl(form);
    const result = validateScenario(serialized);
    expect(result.success).toBeTrue();
    if (result.success) {
      expect(result.data.sources[3].documentNumber).toBe('TEST-1');
      expect(serializeControl(buildControl(result.data))).toEqual(result.data);
      expect(result.data.contentReview).toEqual(scenario.contentReview);
    }
    expect(fixture.nativeElement.textContent).toContain('Нормативна база та джерела');
    expect(fixture.nativeElement.querySelector('option[value="expert_checked"]').disabled).toBeTrue();
    fixture.componentInstance.remove(3);
    expect(sources.length).toBe(3);
  });

  it('blocks removal of a source used by nodes, choices or debrief', () => {
    const form = buildControl(scenarioFixture()) as FormGroup;
    const sources = form.get('sources') as FormArray;
    const fixture = TestBed.createComponent(EditorFieldComponent);
    fixture.componentRef.setInput('control', sources);
    fixture.componentRef.setInput('name', 'sources');
    fixture.componentRef.setInput('scenarioForm', form);
    expect(fixture.componentInstance.usedSource(0)).toBeTrue();
    fixture.componentInstance.remove(0);
    expect(sources.length).toBe(3);
    sources.push(buildControl(freshItem('sources')));
    fixture.componentInstance.remove(3);
    expect(sources.length).toBe(3);
  });
});

describe('Participant sources', () => {
  it('renders unknown revision, unverified warning, relevance and safe links without claiming approval', () => {
    const source: SourceReference = { ...scenarioFixture().sources[0], sourceType: 'normative', url: 'https://example.org/test', relevance: 'Потребує перевірки застосовності.', applicabilityQuestions: 'Які повноваження має автор рекомендації?' };
    const fixture = TestBed.createComponent(SourcesComponent);
    fixture.componentRef.setInput('sources', [source]); fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Правову застосовність цього джерела ще не підтверджено');
    expect(text).toContain('Не встановлена');
    expect(text).toContain(source.relevance!);
    expect(text).toContain(source.applicabilityQuestions!);
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.rel).toContain('noopener'); expect(link.target).toBe('_blank');
    expect(fixture.nativeElement.querySelector('details')).not.toBeNull();
  });
});
