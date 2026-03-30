import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sk-imprint',
  imports: [RouterLink],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintComponent {}
