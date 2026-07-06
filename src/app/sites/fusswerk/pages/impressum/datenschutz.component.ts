import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pv-fw-datenschutz',
  imports: [RouterLink],
  templateUrl: './datenschutz.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './legal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwDatenschutzComponent {}
