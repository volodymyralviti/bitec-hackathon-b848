import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LIMITS, validateScenario, validateScenarioStructure, type Scenario } from '@eds/scenario-schema';
import { EditorFieldComponent } from './editor-field.component';
import { serializeControl } from './form-model';
import { StudioApi, type StudioIssue, type StudioRecord } from './studio-api.service';
import { StudioWorkspace } from './studio-workspace.service';
import { DEMO_STUDIO, validateDemoScenario } from './studio-mode';

@Component({
  selector: 'app-studio', imports: [ReactiveFormsModule, RouterLink, EditorFieldComponent],
  templateUrl: './studio.component.html'
})
export class StudioComponent {
  readonly demo = inject(DEMO_STUDIO);
  readonly api = inject(StudioApi);
  readonly workspace = inject(StudioWorkspace);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly keyControl = new FormControl('', { nonNullable: true });
  readonly importControl = new FormControl('', { nonNullable: true });
  readonly versionControl = new FormControl('', { nonNullable: true });
  readonly demoConfirmation = new FormControl(false, { nonNullable: true });
  readonly records = signal<StudioRecord[]>([]);
  readonly errors = signal<StudioIssue[]>([]);
  readonly warnings = signal<StudioIssue[]>([]);
  readonly busy = signal(false);
  readonly message = signal('');

  constructor() {
    if (!this.demo && this.api.authorized()) this.refresh();
    if (this.demo) {
      const warn = (event: BeforeUnloadEvent) => {
        if (this.workspace.form()?.dirty) { event.preventDefault(); event.returnValue = ''; }
      };
      this.document.defaultView?.addEventListener('beforeunload', warn);
      this.destroyRef.onDestroy(() => this.document.defaultView?.removeEventListener('beforeunload', warn));
    }
  }
  canLeave(url: string): boolean {
    return !this.demo || url === '/studio/demo' || url.startsWith('/studio/demo/') || !this.workspace.form()?.dirty ||
      !!this.document.defaultView?.confirm('Вийти з демо? Щоб не втратити результат після закриття вкладки, експортуйте JSON.');
  }
  resetDemo() {
    if (!this.demo || (this.workspace.form() && !this.document.defaultView?.confirm('Скинути демо? Спочатку експортуйте JSON, якщо хочете зберегти результат.'))) return;
    this.workspace.clear(); this.errors.set([]); this.warnings.set([]); this.importControl.reset();
    this.message.set('Демо очищено лише в цій вкладці. Створіть нову дилему або імпортуйте JSON.');
  }
  login() {
    if (this.demo || this.busy()) return;
    this.api.key.set(this.keyControl.value);
    this.api.authorized.set(false);
    this.busy.set(true);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: records => { this.records.set(records); this.api.authorized.set(true); this.busy.set(false); this.message.set('Доступ автора відкрито для цієї вкладки.'); this.keyControl.reset(); },
      error: error => { this.api.key.set(''); this.fail(error); }
    });
  }
  logout() { if (this.demo) return; this.api.key.set(''); this.api.authorized.set(false); this.workspace.clear(); this.records.set([]); this.keyControl.reset(); this.importControl.reset(); this.errors.set([]); this.warnings.set([]); this.message.set('Доступ і локальні чернетки очищено з пам’яті вкладки.'); }
  refresh() {
    if (this.demo) return;
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: records => this.records.set(records), error: error => this.fail(error) });
  }
  newDraft() {
    if (this.busy()) return;
    if (this.workspace.form()?.dirty && !this.document.defaultView?.confirm('Створити нову чернетку замість незбережених локальних змін?')) return;
    this.busy.set(true);
    this.http.get<unknown>('/assets/studio-blank.json').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: input => { this.busy.set(false); const result = this.demo ? validateDemoScenario(input) : validateScenario(input); if (!result.success) { this.errors.set(result.errors); return; } this.workspace.load(result.data); this.errors.set([]); this.warnings.set(result.warnings); this.message.set(this.demo ? 'Навчальна дилема лише у вашій вкладці. Замініть підказки власним текстом; для збереження експортуйте JSON.' : 'Приватна чернетка: замініть структурні підказки власним текстом. Вона ще не збережена.'); },
      error: error => this.fail(error)
    });
  }
  open(record: StudioRecord) {
    if (this.demo) return;
    if (this.workspace.form()?.dirty && !this.document.defaultView?.confirm('Замінити незбережені локальні зміни обраною версією?')) return;
    const result = validateScenario(record.scenario);
    if (!result.success) { this.errors.set(result.errors); return; }
    this.workspace.load(result.data, record);
    this.versionControl.setValue(this.nextVersion(result.data.version));
    this.demoConfirmation.reset(); this.errors.set([]); this.warnings.set(result.warnings);
    this.message.set(this.workspace.form()?.disabled ? 'Цю версію зафіксовано. Для редагування створіть наступну чернетку.' : 'Приватну версію відкрито.');
  }
  keys() { return Object.keys(this.workspace.form()?.controls ?? {}); }
  ids(key: 'nodes' | 'sources', field: 'id' | 'sourceId'): string[] {
    const array = this.workspace.form()?.controls[key];
    return array instanceof FormArray ? array.controls.map(control => String(control.get(field)?.value ?? '')).filter(Boolean) : [];
  }
  value(): unknown { const form = this.workspace.form(); return form ? serializeControl(form) : null; }
  validate() {
    const result = this.demo ? validateDemoScenario(this.value()) : validateScenario(this.value());
    this.errors.set(result.errors); this.warnings.set(result.warnings);
    this.message.set(result.success ? 'Структура й граф валідні. Це не підтверджує фактичну або юридичну достовірність.' : 'Виправте помилки перед збереженням або preview.');
    return result;
  }
  validateOnServer() {
    if (this.demo || this.busy()) return;
    this.busy.set(true);
    this.api.validate(this.value()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: result => { this.busy.set(false); this.errors.set(result.errors); this.warnings.set(result.warnings); this.message.set(result.success ? 'Сервер підтвердив валідність структури й графа.' : 'Сервер знайшов помилки.'); }, error: error => this.fail(error) });
  }
  save() {
    if (this.demo || this.busy() || this.workspace.form()?.disabled) return;
    const result = this.validate(); if (!result.success) return;
    const record = this.workspace.record();
    this.busy.set(true);
    const request = record ? this.api.update(record, result.data) : this.api.create(result.data);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: saved => { this.busy.set(false); this.workspace.load(saved.scenario, saved); this.message.set('Приватну версію збережено. Публічний каталог не змінено.'); this.refresh(); }, error: error => this.fail(error) });
  }
  fork() {
    const record = this.workspace.record(); if (this.demo || !record || this.busy()) return;
    this.busy.set(true);
    this.api.fork(record, this.versionControl.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: saved => { this.busy.set(false); this.workspace.load(saved.scenario, saved); this.message.set('Створено нову приватну версію. Попередня незмінна; статуси перевірки нової версії скинуто.'); this.refresh(); }, error: error => this.fail(error) });
  }
  copyImported() {
    const result = this.validate(); if (!result.success) return;
    const scenario = result.data;
    this.workspace.load({ ...scenario, id: scenario.id.slice(0, 70) + '-copy', version: '1.0.0', publicationStatus: 'draft', contentReview: { status: 'draft', demoOnly: true, aiAssisted: scenario.contentReview.aiAssisted }, sources: scenario.sources.map(source => ({ ...source, verificationStatus: 'unverified', verifiedAt: null })), nodes: scenario.nodes.map(node => node.type === 'decision' ? { ...node, choices: node.choices.map(choice => ({ ...choice, ...(choice.legalStatus === 'allowed' || choice.legalStatus === 'restricted' ? { legalStatus: 'uncertain' as const } : {}) })) } : node) });
    this.message.set('Створено приватну копію. Перевірте ID; попереднє review не переноситься на новий матеріал.');
  }
  makeDemo() {
    if (this.demo) return;
    const record = this.workspace.record();
    if (!record || this.busy()) return;
    if (this.workspace.form()?.dirty || !this.demoConfirmation.value) { this.message.set('Спочатку збережіть зміни та явно підтвердьте demo-only показ.'); return; }
    this.busy.set(true);
    this.api.demo(record).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: saved => { this.busy.set(false); this.workspace.load(saved.scenario, saved); this.message.set('Версію відкрито лише як демо без експертного схвалення. Вона тепер незмінна.'); this.refresh(); }, error: error => this.fail(error) });
  }
  preview() {
    const result = this.validate(); if (!result.success) return;
    this.workspace.preview.set(result.data);
    void this.router.navigate([this.demo ? '/studio/demo/preview' : '/studio/preview', result.data.id, 'play']);
  }
  exportJson() {
    const result = this.validate(); if (!result.success) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2) + '\n'], { type: 'application/json' }));
    const link = this.document.createElement('a'); link.href = url; link.download = `${result.data.id}-${result.data.version}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  importJson() {
    const text = this.importControl.value;
    if (text.length > LIMITS.jsonCharacters) { this.message.set('JSON завеликий.'); return; }
    let input: unknown;
    try { input = JSON.parse(text); } catch { this.errors.set([{ path: [], code: 'INVALID_JSON', message: 'Некоректний JSON; попередню чернетку збережено.' }]); return; }
    if (input && typeof input === 'object' && Array.isArray((input as { nodes?: unknown }).nodes) && (input as { nodes: unknown[] }).nodes.length > LIMITS.nodes) {
      this.errors.set([{ path: ['nodes'], code: 'INPUT_LIMIT', message: `Допустимо не більше ${LIMITS.nodes} вузлів.` }]); return;
    }
    const result = this.demo ? validateDemoScenario(input, true) : validateScenarioStructure(input);
    if (!result.success) { this.errors.set(result.errors); return; }
    if (this.demo && this.workspace.form()?.dirty && !this.document.defaultView?.confirm('Замінити локальну демо-чернетку імпортованим JSON?')) return;
    this.workspace.load(result.data); this.validate(); this.message.set(this.demo ? 'JSON імпортовано лише в цю вкладку. Сервер його не отримує.' : 'JSON імпортовано лише в локальну форму. Для запису на сервер натисніть «Зберегти».');
  }
  async importFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { this.message.set('Файл завеликий.'); return; }
    try { this.importControl.setValue(await file.text()); this.importJson(); } catch { this.message.set('Не вдалося прочитати файл.'); }
  }
  focusIssue(issue: StudioIssue) {
    const field = [...this.element.nativeElement.querySelectorAll<HTMLElement>('[data-field-path]')].find(element => element.dataset['fieldPath'] === issue.path.join('.'));
    let parent: HTMLElement | null = field ?? null;
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    field?.focus();
  }
  private nextVersion(version: string) { const [major, minor, patch] = version.split('.'); return `${major}.${minor}.${BigInt(patch) + 1n}`; }
  private fail(error: unknown) {
    this.busy.set(false);
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (body && typeof body === 'object' && Array.isArray((body as { errors?: unknown }).errors)) this.errors.set((body as { errors: StudioIssue[] }).errors);
      this.message.set(error.status === 401 ? 'Ключ недійсний або належить іншій ролі.' : error.status === 503 ? 'Роль або API не налаштовано. Зверніться до адміністратора сервера.' : error.status === 409 ? 'Конфлікт ревізії або зафіксована версія. Ваші локальні зміни залишились; відкрийте актуальну версію або створіть наступну.' : error.status === 422 ? 'Сервер відхилив дані. Перевірте наведені помилки.' : 'Не вдалося виконати запит. Локальні зміни залишилися у вкладці.');
    } else this.message.set('Не вдалося виконати дію. Перевірте форму й повторіть спробу.');
  }
}
