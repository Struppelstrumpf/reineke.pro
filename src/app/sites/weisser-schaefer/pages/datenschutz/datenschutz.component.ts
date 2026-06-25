import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pv-ws-datenschutz',
  imports: [RouterLink],
  templateUrl: './datenschutz.component.html',
  styleUrls: ['../../ws-shared.scss', './datenschutz.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsDatenschutzComponent {}
