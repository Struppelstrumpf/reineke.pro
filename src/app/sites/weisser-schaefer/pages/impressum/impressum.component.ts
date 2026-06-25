import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pv-ws-impressum',
  imports: [RouterLink],
  templateUrl: './impressum.component.html',
  styleUrls: ['../../ws-shared.scss', './impressum.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsImpressumComponent {}
