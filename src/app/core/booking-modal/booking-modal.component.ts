import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PREVIEW_STUDIO } from '../preview.config';
import { STUDIO_PACKAGES, packageLabel, type StudioPackageId } from '../studio-packages.config';
import { BookingModalService } from './booking-modal.service';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

@Component({
  selector: 'pv-booking-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './booking-modal.component.html',
  styleUrl: './booking-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly http = inject(HttpClient);
  readonly booking = inject(BookingModalService);

  readonly studio = PREVIEW_STUDIO;
  readonly packages = STUDIO_PACKAGES;
  readonly submitState = signal<SubmitState>('idle');

  readonly form = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required, Validators.minLength(2)] }),
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    phone: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(30)],
    }),
    package: this.fb.control<StudioPackageId>('standard', { validators: [Validators.required] }),
    message: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.booking.visible()) {
        return;
      }
      const pkg = this.booking.preferredPackage();
      if (pkg) {
        this.form.patchValue({ package: pkg });
      }
      this.submitState.set('idle');
    });
  }

  close(): void {
    this.booking.close();
    this.submitState.set('idle');
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitState() === 'sending') {
      return;
    }

    const value = this.form.getRawValue();
    const pkgLabel = packageLabel(value.package);

    this.submitState.set('sending');

    this.http
      .post(
        `https://formsubmit.co/ajax/${encodeURIComponent(this.studio.email)}`,
        {
          Name: value.name,
          'E-Mail': value.email,
          Telefon: value.phone,
          Paket: pkgLabel,
          Nachricht: value.message,
          _subject: `Neue Buchungsanfrage — ${pkgLabel}`,
          _replyto: value.email,
          _captcha: 'false',
          _template: 'table',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      .subscribe({
        next: () => {
          this.submitState.set('success');
          this.form.reset({ package: value.package });
        },
        error: () => this.submitState.set('error'),
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.booking.visible()) {
      this.close();
    }
  }
}
