import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DogExplorePanelComponent } from '../../components/dog-explore-panel.component';
import { DogMapComponent } from '../../components/dog-map.component';
import { DogMapPopupComponent } from '../../components/dog-map-popup.component';
import { DogPetMapHudComponent } from '../../components/dog-pet-map-hud.component';
import { DogPinSheetComponent } from '../../components/dog-pin-sheet.component';
import { DogPinMapPickComponent } from '../../components/dog-pin-map-pick.component';
import { DogTipModalComponent } from '../../components/dog-tip-modal.component';
import { DogExploreService } from '../../dog-explore.service';

@Component({
  selector: 'pv-dog-explore',
  imports: [
    DogMapComponent,
    DogExplorePanelComponent,
    DogPetMapHudComponent,
    DogMapPopupComponent,
    DogTipModalComponent,
    DogPinSheetComponent,
    DogPinMapPickComponent,
  ],
  template: `
    <div class="dog-explore" [class.dog-explore--panel-open]="explore.panelOpen()">
      <div class="dog-explore__map">
        <pv-dog-map />
        <pv-dog-pet-map-hud />
        <pv-dog-pin-map-pick />
      </div>
      <pv-dog-explore-panel />
      <pv-dog-map-popup />
      <pv-dog-pin-sheet />
      <pv-dog-tip-modal [article]="explore.tipArticle()" (closed)="explore.closeTip()" />
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }
    .dog-explore {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .dog-explore__map {
      position: absolute;
      inset: 0;
      z-index: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogExploreComponent {
  readonly explore = inject(DogExploreService);
}
