import { Component, input } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FIELD_LABELS, buildControl, freshItem, serializeControl } from './form-model';
import type { StudioIssue } from './studio-api.service';

@Component({
  selector: 'app-editor-field', imports: [ReactiveFormsModule],
  templateUrl: './editor-field.component.html'
})
export class EditorFieldComponent {
  readonly control = input.required<AbstractControl>();
  readonly name = input.required<string>();
  readonly path = input<(string | number)[]>([]);
  readonly parent = input('');
  readonly nodeIds = input<string[]>([]);
  readonly sourceIds = input<string[]>([]);
  readonly issues = input<StudioIssue[]>([]);
  readonly identityLocked = input(false);
  readonly scenarioForm = input<AbstractControl | null>(null);
  readonly labels = FIELD_LABELS;
  group() { const control = this.control(); return control instanceof FormGroup ? control : null; }
  array() { const control = this.control(); return control instanceof FormArray ? control : null; }
  field() { return this.control() as FormControl; }
  keys() { return Object.keys(this.group()?.controls ?? {}).filter(key => !(this.name() === 'trigger' && key === 'type')); }
  title() { return this.name() === 'title' && this.path()[0] === 'sources' ? 'Повна офіційна назва документа' : this.labels[this.name()] ?? (this.parent() === 'nodes' ? 'Вузол' : `Пункт ${Number(this.name()) + 1}`); }
  pathKey() { return this.path().join('.'); }
  childPath(key: string | number) { return [...this.path(), key]; }
  errors() { return this.issues().filter(issue => issue.path.join('.') === this.pathKey()); }
  boolean() { return typeof this.control().value === 'boolean'; }
  numeric() { return ['delta', 'count'].includes(this.name()); }
  date() { return ['versionAsOf', 'verifiedAt', 'documentDate', 'contentCreatedAt'].includes(this.name()); }
  longText() { return ['summary', 'narrative', 'context', 'explanation', 'consequenceText', 'shortTerm', 'longTerm', 'trustAndReputation', 'limitations', 'fileCitation', 'relevance', 'applicabilityQuestions', 'verificationEvidence', 'legalPosition', 'legalQuestions'].includes(this.name()) || ['reflectionQuestions', 'perspectives', 'basedOn'].includes(this.parent()); }
  readonlyField() { return ['schemaVersion', 'language', 'publicationStatus', 'type', 'reviewedAt', 'reviewerRole', 'evidenceRef'].includes(this.name()) || (this.identityLocked() && this.path().length === 1 && ['id', 'version'].includes(this.name())); }
  options(): { value: string; label: string }[] | null {
    if (['startNodeId', 'nextNodeId', 'nodeId'].includes(this.name())) return this.nodeIds().map(value => ({ value, label: value }));
    if (this.parent() === 'sourceIds') return this.sourceIds().map(value => ({ value, label: value }));
    const choices: Record<string, [string, string][]> = {
      metric: [['transparency', 'Прозорість'], ['fairness', 'Справедливість'], ['trust', 'Довіра'], ['effectiveness', 'Дієвість']],
      sourceType: [['methodology', 'Методика'], ['normative', 'Нормативне джерело'], ['editorial', 'Авторська інтерпретація']],
      documentType: [['law', 'Закон'], ['code', 'Кодекс'], ['statute', 'Статут'], ['order', 'Наказ'], ['procedure', 'Інструкція, положення або порядок'], ['ethics', 'Професійний стандарт або кодекс етики'], ['methodology', 'Методичний матеріал'], ['judgment', 'Судове рішення'], ['other', 'Інший документ']],
      verificationStatus: [['unverified', 'Не перевірено'], ['team_checked', 'Перевірено командою'], ['expert_checked', 'Експертна перевірка — лише через рецензента']],
      legalStatus: [['', 'Не визначено'], ['uncertain', 'Не підтверджено'], ['allowed', 'Допустимо за перевіреною нормою'], ['restricted', 'Обмежено за перевіреною нормою']],
      status: [['draft', 'Чернетка'], ['in_review', 'Запит на review'], ['expert_approved', 'Експертне схвалення — лише рецензент'], ['changes_requested', 'Потрібні зміни — за review']],
    };
    return choices[this.name()]?.map(([value, label]) => ({ value, label })) ?? null;
  }
  restrictedOption(value: string) { return ['expert_checked', 'expert_approved', 'changes_requested'].includes(value); }
  add(type = 'decision') { this.array()?.push(buildControl(freshItem(this.name(), type))); this.control().markAsDirty(); }
  usedSource(index: number): boolean {
    if (this.name() !== 'sources') return false;
    const id = this.array()?.at(index).get('sourceId')?.value as string;
    const form = this.scenarioForm();
    if (!form || !id) return false;
    const scan = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.some(scan);
      if (!value || typeof value !== 'object') return false;
      return Object.entries(value).some(([key, child]) => key === 'sourceIds' && Array.isArray(child) ? child.includes(id) : scan(child));
    };
    return scan(serializeControl(form));
  }
  remove(index: number) { if (this.control().disabled || this.usedSource(index)) return; this.array()?.removeAt(index); this.control().markAsDirty(); }
  setTrigger(type: string) {
    const group = this.group(); if (!group) return;
    group.controls['type'].setValue(type);
    if (type === 'after_decisions') { group.removeControl('nodeId'); group.addControl('count', new FormControl(1)); }
    else { group.removeControl('count'); group.addControl('nodeId', new FormControl('')); }
    group.markAsDirty();
  }
}
