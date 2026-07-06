import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PREVIEW_STUDIO } from '../../../../core/preview.config';

@Component({
  selector: 'pv-fw-impressum',
  imports: [RouterLink],
  templateUrl: './impressum.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './legal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwImpressumComponent {
  readonly studio = PREVIEW_STUDIO;
}
