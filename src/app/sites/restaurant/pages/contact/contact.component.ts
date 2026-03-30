import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'rt-contact',
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
    guests: this.fb.control('2', { validators: [Validators.required] }),
    date: this.fb.control('', { validators: [Validators.required] }),
    message: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(15), Validators.maxLength(4000)],
    }),
    allergies: this.fb.control(''),
  });

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.submitted.set(true);
    this.form.reset({ guests: '2', allergies: '' });
  }
}
