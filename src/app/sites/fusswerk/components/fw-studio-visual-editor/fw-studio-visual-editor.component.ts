import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FusswerkContentService } from '../../fusswerk-content.service';
import {
  FW_FONT_OPTIONS,
  FW_HERO_SIZE_OPTIONS,
  FW_SIZE_OPTIONS,
  FW_VISUAL_SECTIONS,
  type FwVisualSectionId,
} from '../../fusswerk-content.types';
import type { FwPriceTier, FwService } from '../../fusswerk.data';
import { formatDurationLabel } from '../../fusswerk-duration.util';
import type { FwOpeningHoursSchedule } from '../../fusswerk-content.types';
import { FwDurationPickerComponent } from '../fw-duration-picker/fw-duration-picker.component';

import { FwHoursPickerComponent } from '../fw-hours-picker/fw-hours-picker.component';

@Component({
  selector: 'pv-fw-studio-visual-editor',
  imports: [FormsModule, FwDurationPickerComponent, FwHoursPickerComponent],
  templateUrl: './fw-studio-visual-editor.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './fw-studio-visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwStudioVisualEditorComponent {
  @ViewChild('previewFrame') previewFrame?: ElementRef<HTMLIFrameElement>;

  readonly content = inject(FusswerkContentService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly sections = FW_VISUAL_SECTIONS;
  readonly fontOptions = FW_FONT_OPTIONS;
  readonly sizeOptions = FW_SIZE_OPTIONS;
  readonly heroSizeOptions = FW_HERO_SIZE_OPTIONS;

  readonly highlightSection = signal<FwVisualSectionId | null>(null);
  readonly editorSection = signal<FwVisualSectionId>('hero');
  readonly editorOpen = signal(false);
  readonly expandedService = signal(0);
  readonly previewUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    '/demo/fusswerk?embed=studio',
  );

  previewSection(id: FwVisualSectionId, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const parentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    this.highlightSection.set(id);
    this.scrollPreviewTo(id);
    this.restoreParentScroll(parentScrollY);
  }

  openEditor(id: FwVisualSectionId, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const parentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    this.editorSection.set(id);
    this.highlightSection.set(id);
    this.editorOpen.set(true);
    if (id === 'angebot') this.expandedService.set(0);
    this.scrollPreviewTo(id);
    this.restoreParentScroll(parentScrollY);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  sectionLabel(): string {
    return this.sections.find((s) => s.id === this.editorSection())?.label ?? 'Bearbeiten';
  }

  refreshPreview(): void {
    this.previewFrame?.nativeElement?.contentWindow?.location.reload();
  }

  saveOpeningHours(schedule: FwOpeningHoursSchedule): void {
    this.content.saveOpeningHours(schedule);
  }

  toggleService(index: number): void {
    this.expandedService.update((current) => (current === index ? -1 : index));
  }

  updateServiceDuration(index: number, minutes: number): void {
    this.updateService(index, {
      durationMinutes: minutes,
      duration: formatDurationLabel(minutes),
    });
  }

  updateService(index: number, patch: Partial<FwService>): void {
    const services = this.content.services().map((s, i) => (i === index ? { ...s, ...patch } : s));
    this.content.saveServices(services);
  }

  addService(): void {
    const services = this.content.services();
    const newService: FwService = {
      id: `service-${Date.now().toString(36)}`,
      num: String(services.length + 1).padStart(2, '0'),
      title: 'Neue Leistung',
      summary: 'Kurzbeschreibung der Leistung.',
      includes: ['Leistungspunkt'],
      duration: '45 Minuten',
      durationMinutes: 45,
      fromPrice: 49,
    };
    this.content.saveServices(this.renumberServices([...services, newService]));
    this.expandedService.set(services.length);
  }

  removeService(index: number): void {
    if (this.content.services().length <= 1) return;
    const services = this.content.services().filter((_, i) => i !== index);
    this.content.saveServices(this.renumberServices(services));
    const expanded = this.expandedService();
    if (expanded === index) this.expandedService.set(Math.max(0, index - 1));
    else if (expanded > index) this.expandedService.update((e) => e - 1);
  }

  moveService(index: number, direction: -1 | 1): void {
    const target = index + direction;
    const services = [...this.content.services()];
    if (target < 0 || target >= services.length) return;
    [services[index], services[target]] = [services[target], services[index]];
    this.content.saveServices(this.renumberServices(services));
    const expanded = this.expandedService();
    if (expanded === index) this.expandedService.set(target);
    else if (expanded === target) this.expandedService.set(index);
  }

  private renumberServices(services: FwService[]): FwService[] {
    return services.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }));
  }

  updatePrice(index: number, patch: Partial<FwPriceTier>): void {
    const priceTiers = this.content.priceTiers().map((p, i) => (i === index ? { ...p, ...patch } : p));
    this.content.savePriceTiers(priceTiers);
  }

  updateTrust(index: number, value: string): void {
    const trust = this.content.trust().map((t, i) => (i === index ? value : t));
    this.content.saveTrust(trust);
  }

  private scrollPreviewTo(id: FwVisualSectionId): void {
    const section = this.sections.find((s) => s.id === id);
    if (!section?.anchor) return;

    const frame = this.previewFrame?.nativeElement;
    if (!frame?.contentWindow) return;

    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const target =
        section.anchor === 'top'
          ? doc.getElementById('top') ?? doc.querySelector('main')
          : doc.getElementById(section.anchor);
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      const hash = section.anchor === 'top' ? '' : `#${section.anchor}`;
      frame.contentWindow.location.replace(`/demo/fusswerk?embed=studio${hash}`);
    }
  }

  private restoreParentScroll(scrollY: number): void {
    if (typeof window === 'undefined') return;
    const lock = () => window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    lock();
    requestAnimationFrame(lock);
    window.setTimeout(lock, 0);
    window.setTimeout(lock, 120);
  }
}
