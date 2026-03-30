import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sf-contact',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly submitted = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required, Validators.minLength(2)] }),
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    topic: this.fb.control('retail', { validators: [Validators.required] }),
    message: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(20), Validators.maxLength(4000)],
    }),
  });

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.submitted.set(true);
    this.form.reset({ topic: 'retail' });
  }
}
