import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sf-imprint',
  imports: [RouterLink],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintComponent {}
