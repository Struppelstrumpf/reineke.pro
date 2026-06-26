import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOG_SPOT_EMOJI, DOG_SPOT_LABELS, type DogAlert, type DogSpot, type DogSpotKind } from '../dog.data';
import { DogExploreService } from '../dog-explore.service';
import { DogAuthService } from '../dog-auth.service';
import { DogSocialService } from '../dog-social.service';
import { DogSpotSocialService, type DogSpotSocial } from '../dog-spot-social.service';
import { dogGoogleMapsOpen, dogGoogleMapsRoute } from '../dog-maps.util';
import { leashLabel, sourceLabel, imageSourceLabel } from '../dog-spot-media';
import { tipIdForAlert, tipIdForSpot } from '../dog-tips.data';

@Component({
  selector: 'pv-dog-map-popup',
  imports: [DecimalPipe, FormsModule],
  template: `
    @if (explore.mapPopupOpen() && explore.selectedAlert(); as alert) {
      <div class="dog-map-popup" (keydown.escape)="close()" tabindex="-1">
        <button type="button" class="dog-map-popup__backdrop" aria-label="Schließen" (click)="close()"></button>
        <div
          class="dog-map-popup__panel"
          [class.dog-map-popup__panel--danger]="alert.severity === 'danger'"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <button type="button" class="dog-map-popup__close" (click)="close()" aria-label="Schließen">×</button>

          <div class="dog-map-popup__head">
            <span
              class="dog-map-popup__badge"
              [class.dog-map-popup__badge--danger]="alert.kind === 'giftkoeder'"
              aria-hidden="true"
            >
              {{ alert.kind === 'giftkoeder' ? '!' : '⚠' }}
            </span>
            <div>
              <h2 class="dog-map-popup__title">{{ alert.title }}</h2>
              <p class="dog-map-popup__meta">
                {{ alert.ago }}
                @if (alert.distanceKm != null) {
                  · {{ alert.distanceKm | number: '1.1-1' }} km
                }
                · {{ alert.source }}
              </p>
            </div>
          </div>

          @if (alert.imageUrl && !hiddenImages()['alert:' + alert.id]) {
            <figure class="dog-map-popup__figure">
              <img [src]="alert.imageUrl" alt="" loading="lazy" (error)="hideSpotImage('alert:' + alert.id)" />
            </figure>
          }

          <p class="dog-map-popup__text">{{ alert.detail }}</p>

          @if (alert.kind === 'giftkoeder') {
            <p class="dog-map-popup__warn">
              Nicht anfassen — Hund wegführen, Meldung an Polizei / Ordnungsamt.
            </p>
          }

          <div class="dog-map-popup__tip-actions">
            <button type="button" class="dog-map-popup__tip-btn" (click)="openAlertTip(alert)">
              Tipps & Ratgeber
            </button>
          </div>

          <div class="dog-map-popup__actions">
            <a
              class="dog-map-popup__btn dog-map-popup__btn--primary"
              [href]="routeUrl(alert.lat, alert.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Route dorthin
            </a>
            <a
              class="dog-map-popup__btn dog-map-popup__btn--ghost"
              [href]="openUrl(alert.lat, alert.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              In Google Maps
            </a>
          </div>

          @if (alert.sourceUrl) {
            <a class="dog-map-popup__link" [href]="alert.sourceUrl" target="_blank" rel="noopener noreferrer">
              Quelle öffnen
            </a>
          }

          <div class="dog-map-popup__visibility">
            @if (explore.isAlertHidden(alert.id)) {
              <button type="button" class="dog-map-popup__visibility-btn dog-map-popup__visibility-btn--show" (click)="showAlert(alert.id)">
                Einblenden
              </button>
            } @else {
              <button type="button" class="dog-map-popup__visibility-btn" (click)="hideAlert(alert.id)">
                Auf der Karte ausblenden
              </button>
            }
          </div>
        </div>
      </div>
    }

    @if (explore.mapPopupOpen() && explore.selectedSpot(); as spot) {
      <div class="dog-map-popup" (keydown.escape)="close()" tabindex="-1">
        <button type="button" class="dog-map-popup__backdrop" aria-label="Schließen" (click)="close()"></button>
        <div class="dog-map-popup__panel" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <button type="button" class="dog-map-popup__close" (click)="close()" aria-label="Schließen">×</button>

          <div class="dog-map-popup__head">
            <span class="dog-map-popup__badge" aria-hidden="true">{{ spot.isUserPin ? (spot.pinEmoji ?? '📍') : spotEmoji[spot.kind] }}</span>
            <div>
              <h2 class="dog-map-popup__title">{{ spot.name }}</h2>
              <p class="dog-map-popup__meta">
                @if (spot.isUserPin) {
                  {{ explore.userPinListLabel(spot) }}
                  @if (spot.distanceKm != null) {
                    · {{ spot.distanceKm | number: '1.1-1' }} km
                  }
                  · {{ spot.pinVisibility === 'private' ? 'Privat' : 'Öffentlich' }}
                } @else {
                  {{ spotLabels[spot.kind] }}
                  @if (spot.distanceKm != null) {
                    · {{ spot.distanceKm | number: '1.1-1' }} km
                  }
                  · ★ {{ spot.rating | number: '1.1-1' }}
                }
              </p>
            </div>
          </div>

          @if (spot.imageUrl && !hiddenImages()[spot.id]) {
            <figure class="dog-map-popup__figure">
              <img
                [src]="spot.imageUrl"
                [alt]="spot.name"
                loading="lazy"
                (error)="hideSpotImage(spot.id)"
              />
              @if (imageSourceLabel(spot); as imgSrc) {
                <figcaption class="dog-map-popup__caption">{{ imgSrc }}</figcaption>
              }
            </figure>
          }

          <p class="dog-map-popup__text">{{ spot.description || spot.snippet }}</p>

          @if (!spot.isUserPin) {
          <ul class="dog-map-popup__chips">
            <li>{{ leashLabel(spot.leash) }}</li>
            <li>{{ sourceLabel(spot.source) }}</li>
            <li>{{ spot.tipCount }} Tipps</li>
          </ul>

          @if (explore.spotTips().length) {
            <div class="dog-map-popup__tips">
              <p class="dog-map-popup__tips-label">Aus der Community</p>
              @for (tip of explore.spotTips().slice(0, 2); track tip.id) {
                <blockquote class="dog-map-popup__tip">„{{ tip.text }}“ — {{ tip.author }}</blockquote>
              }
            </div>
          }

          <div class="dog-map-popup__tip-actions">
            <button type="button" class="dog-map-popup__tip-btn" (click)="openSpotTip(spot.kind)">
              Ratgeber lesen
            </button>
            @if (explore.spotTips().length) {
              <button type="button" class="dog-map-popup__tip-btn dog-map-popup__tip-btn--ghost" (click)="showCommunityTips()">
                Alle {{ spot.tipCount }} Tipps
              </button>
            }
          </div>
          }

          @if (auth.user() && !spot.isUserPin) {
            <section class="dog-map-popup__social" aria-label="Community">
              <div class="dog-map-popup__social-head">
                <p class="dog-map-popup__social-title">Community</p>
                <div class="dog-map-popup__votes">
                  <button
                    type="button"
                    class="dog-map-popup__vote"
                    [class.is-active]="spotSocial()?.userVote === 'up'"
                    (click)="vote(spot.id, 'up')"
                    aria-label="Daumen hoch"
                  >
                    👍 {{ spotSocial()?.score ?? 0 }}
                  </button>
                  <button
                    type="button"
                    class="dog-map-popup__vote"
                    [class.is-active]="spotSocial()?.userVote === 'down'"
                    (click)="vote(spot.id, 'down')"
                    aria-label="Daumen runter"
                  >
                    👎
                  </button>
                </div>
              </div>
              @if (spotSocial()?.comments?.length) {
                <ul class="dog-map-popup__comments">
                  @for (c of spotSocial()!.comments.slice(0, 4); track c.id) {
                    <li>
                      <strong>{{ c.userName }}</strong>
                      <p>{{ c.text }}</p>
                    </li>
                  }
                </ul>
              }
              <label class="dog-map-popup__comment-field">
                <span class="sr-only">Kommentar</span>
                <input
                  type="text"
                  placeholder="Tipp oder Erfahrung teilen …"
                  [ngModel]="commentText()"
                  (ngModelChange)="commentText.set($event)"
                  (keydown.enter)="submitComment(spot.id)"
                />
              </label>
              <button type="button" class="dog-map-popup__comment-btn" (click)="submitComment(spot.id)">
                Kommentieren
              </button>
            </section>

            <div class="dog-map-popup__report">
              @if (reportMsg()) {
                <p class="dog-map-popup__report-msg" role="status">{{ reportMsg() }}</p>
              } @else {
                <button type="button" class="dog-map-popup__report-btn" (click)="reportSpot(spot.id)">
                  Punkt melden
                </button>
              }
            </div>
          }

          @if (auth.user() && spot.isUserPin && explore.isOwnUserPin(spot)) {
            <div class="dog-map-popup__delete">
              @if (deletePinMsg()) {
                <p class="dog-map-popup__delete-msg" role="status">{{ deletePinMsg() }}</p>
              } @else {
                <button
                  type="button"
                  class="dog-map-popup__delete-btn"
                  [disabled]="deletingPin()"
                  (click)="removeOwnPin(spot.id)"
                >
                  {{ deletingPin() ? 'Wird entfernt …' : 'Marker entfernen' }}
                </button>
              }
            </div>
          }

          @if (auth.user() && spot.isUserPin && !explore.isOwnUserPin(spot)) {
            <div class="dog-map-popup__report">
              @if (reportMsg()) {
                <p class="dog-map-popup__report-msg" role="status">{{ reportMsg() }}</p>
              } @else {
                <button type="button" class="dog-map-popup__report-btn" (click)="reportSpot(spot.id)">
                  Punkt melden
                </button>
              }
            </div>
          }

          @if (!spot.isUserPin) {
          <div class="dog-map-popup__meet">
            @if (auth.user()) {
              <button type="button" class="dog-map-popup__meet-btn" (click)="proposeMeetup(spot)">
                🤝 Treffen vorschlagen
              </button>
            } @else {
              <p class="dog-map-popup__meet-hint">Melde dich an, um hier ein Treffen vorzuschlagen.</p>
            }
          </div>
          }

          <div class="dog-map-popup__actions">
            <a
              class="dog-map-popup__btn dog-map-popup__btn--primary"
              [href]="routeUrl(spot.lat, spot.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Route dorthin
            </a>
            <a
              class="dog-map-popup__btn dog-map-popup__btn--ghost"
              [href]="openUrl(spot.lat, spot.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              In Google Maps
            </a>
          </div>

            @if (spot.wikipediaUrl) {
              <a class="dog-map-popup__link" [href]="spot.wikipediaUrl" target="_blank" rel="noopener noreferrer">
                Auf Wikipedia ansehen
              </a>
            } @else if (spot.osmUrl) {
            <a class="dog-map-popup__link" [href]="spot.osmUrl" target="_blank" rel="noopener noreferrer">
              Auf OpenStreetMap ansehen
            </a>
          }
          @if (spot.isUserPin && spot.pinVisibility === 'private') {
            <p class="dog-map-popup__pin-note">Nur für dich sichtbar.</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .dog-map-popup {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: var(--dog-panel-open-end, 0);
      z-index: 550;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(3.2rem, 9vw, 4rem) 1rem 1rem;
      pointer-events: none;
    }
    :host-context(.dog-shell--panel-collapsed) .dog-map-popup {
      left: var(--dog-panel-collapsed-end, 0);
    }
    .dog-map-popup__backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      background: rgba(0, 0, 0, 0.38);
      cursor: pointer;
      pointer-events: auto;
    }
    .dog-map-popup__panel {
      position: relative;
      z-index: 1;
      width: min(22rem, 100%);
      max-height: min(82dvh, 36rem);
      overflow: auto;
      overscroll-behavior: contain;
      padding: 1rem 1rem 1.1rem;
      border-radius: 20px;
      border: 1px solid var(--dog-border);
      background: var(--dog-surface-solid, #fff);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
      pointer-events: auto;
    }

    .dog-map-popup__panel--danger {
      border-color: color-mix(in srgb, #ef4444 35%, var(--dog-border));
    }
    .dog-map-popup__close {
      position: absolute;
      top: 0.55rem;
      right: 0.55rem;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--dog-border);
      border-radius: 50%;
      background: transparent;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
    }
    .dog-map-popup__head {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding-right: 2rem;
    }
    .dog-map-popup__badge {
      flex-shrink: 0;
      width: 2.35rem;
      height: 2.35rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 1.15rem;
      background: color-mix(in srgb, var(--dog-accent) 14%, var(--dog-surface));
      border: 1px solid color-mix(in srgb, var(--dog-accent) 30%, var(--dog-border));
    }
    .dog-map-popup__badge--danger {
      background: #dc2626;
      color: #fff;
      font-weight: 900;
      font-size: 1.35rem;
      border-color: #b91c1c;
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
    }
    .dog-map-popup__title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }
    .dog-map-popup__meta {
      margin: 0.2rem 0 0;
      font-size: 0.65rem;
      color: var(--dog-muted);
    }
    .dog-map-popup__figure {
      margin: 0.75rem 0 0;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--dog-border) 80%, transparent);
    }
    .dog-map-popup__figure img {
      display: block;
      width: 100%;
      max-height: 10rem;
      object-fit: cover;
    }
    .dog-map-popup__caption {
      margin: 0;
      padding: 0.35rem 0.5rem;
      font-size: 0.58rem;
      color: var(--dog-muted);
      background: color-mix(in srgb, var(--dog-bg) 40%, var(--dog-surface));
    }
    .dog-map-popup__text {
      margin: 0.65rem 0 0;
      font-size: 0.78rem;
      line-height: 1.5;
      color: var(--dog-text);
    }
    .dog-map-popup__warn {
      margin: 0.5rem 0 0;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      font-size: 0.68rem;
      font-weight: 650;
      color: #991b1b;
      background: color-mix(in srgb, #fecaca 50%, var(--dog-surface));
    }
    .dog-map-popup__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin: 0.55rem 0 0;
      padding: 0;
      list-style: none;
    }
    .dog-map-popup__chips li {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--dog-accent) 10%, var(--dog-surface));
      color: var(--dog-accent-strong);
    }
    .dog-map-popup__tips {
      margin-top: 0.65rem;
      padding-top: 0.55rem;
      border-top: 1px solid color-mix(in srgb, var(--dog-border) 70%, transparent);
    }
    .dog-map-popup__tips-label {
      margin: 0 0 0.35rem;
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--dog-muted);
    }
    .dog-map-popup__tip {
      margin: 0 0 0.35rem;
      font-size: 0.68rem;
      line-height: 1.4;
      color: var(--dog-muted);
    }
    .dog-map-popup__tip-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.65rem;
    }
    .dog-map-popup__tip-btn {
      flex: 1 1 auto;
      min-height: 2.15rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--dog-accent) 35%, var(--dog-border));
      background: color-mix(in srgb, var(--dog-accent) 10%, var(--dog-surface));
      color: var(--dog-accent-strong);
      font: inherit;
      font-size: 0.68rem;
      font-weight: 700;
      cursor: pointer;
    }
    .dog-map-popup__tip-btn--ghost {
      background: transparent;
      color: var(--dog-text);
      border-color: var(--dog-border);
    }
    .dog-map-popup__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
      margin-top: 0.85rem;
    }
    .dog-map-popup__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 2.5rem;
      padding: 0.4rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-decoration: none;
      text-align: center;
    }
    .dog-map-popup__btn--primary {
      background: var(--dog-accent-strong);
      color: #fff;
    }
    .dog-map-popup__btn--ghost {
      border: 1px solid var(--dog-border);
      color: var(--dog-text);
      background: transparent;
    }
    .dog-map-popup__link {
      display: inline-block;
      margin-top: 0.55rem;
      font-size: 0.65rem;
      font-weight: 650;
      color: var(--dog-accent-strong);
      text-decoration: none;
    }
    .dog-map-popup__link:hover {
      text-decoration: underline;
    }
    .dog-map-popup__meet {
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--dog-border);
    }
    .dog-map-popup__meet-btn {
      width: 100%;
      min-height: 2.35rem;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--dog-accent) 88%, #fff), var(--dog-accent-strong));
      color: #fff;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 18px color-mix(in srgb, var(--dog-accent) 35%, transparent);
    }
    .dog-map-popup__meet-hint {
      margin: 0;
      font-size: 0.68rem;
      color: var(--dog-muted);
      text-align: center;
    }
    .dog-map-popup__social {
      margin-top: 0.65rem;
      padding: 0.65rem 0.7rem;
      border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--dog-accent) 22%, var(--dog-border));
      background: color-mix(in srgb, var(--dog-accent) 6%, var(--dog-surface-solid, #fff));
    }
    .dog-map-popup__social-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .dog-map-popup__social-title {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dog-muted);
    }
    .dog-map-popup__votes {
      display: flex;
      gap: 0.35rem;
    }
    .dog-map-popup__vote {
      min-height: 1.75rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--dog-border);
      background: var(--dog-surface-solid, #fff);
      font: inherit;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .dog-map-popup__vote.is-active {
      border-color: var(--dog-accent);
      background: color-mix(in srgb, var(--dog-accent) 14%, var(--dog-surface));
    }
    .dog-map-popup__comments {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
    }
    .dog-map-popup__comments li {
      padding: 0.4rem 0;
      border-top: 1px dashed var(--dog-border);
      font-size: 0.72rem;
    }
    .dog-map-popup__comments p {
      margin: 0.15rem 0 0;
      color: var(--dog-text);
    }
    .dog-map-popup__comment-field input {
      width: 100%;
      margin-top: 0.5rem;
      min-height: 2.1rem;
      padding: 0.4rem 0.6rem;
      border-radius: 10px;
      border: 1px solid var(--dog-border);
      font: inherit;
      font-size: 0.72rem;
    }
    .dog-map-popup__comment-btn {
      width: 100%;
      margin-top: 0.35rem;
      min-height: 2rem;
      border: 0;
      border-radius: 999px;
      background: color-mix(in srgb, var(--dog-accent) 88%, #fff);
      color: #fff;
      font: inherit;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }
    .dog-map-popup__report {
      margin-top: 0.5rem;
      text-align: center;
    }
    .dog-map-popup__report-btn {
      border: 0;
      background: transparent;
      color: var(--dog-muted);
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }
    .dog-map-popup__report-btn:hover {
      color: #c0392b;
    }
    .dog-map-popup__report-msg {
      margin: 0;
      font-size: 0.68rem;
      color: var(--dog-muted);
    }
    .dog-map-popup__delete {
      margin-top: 0.5rem;
      text-align: center;
    }
    .dog-map-popup__delete-btn {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid color-mix(in srgb, #ef4444 35%, var(--dog-border));
      border-radius: 999px;
      background: color-mix(in srgb, #ef4444 8%, var(--dog-surface));
      color: #b42318;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .dog-map-popup__delete-btn:hover:not(:disabled) {
      background: color-mix(in srgb, #ef4444 14%, var(--dog-surface));
      border-color: color-mix(in srgb, #ef4444 55%, var(--dog-border));
    }
    .dog-map-popup__delete-btn:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .dog-map-popup__delete-msg {
      margin: 0;
      font-size: 0.68rem;
      color: var(--dog-muted);
    }
    .dog-map-popup__pin-note {
      margin: 0.55rem 0 0;
      font-size: 0.65rem;
      color: var(--dog-muted);
      text-align: center;
    }
    .dog-map-popup__visibility {
      margin-top: 0.65rem;
      padding-top: 0.55rem;
      border-top: 1px dashed var(--dog-border);
      text-align: center;
    }
    .dog-map-popup__visibility-btn {
      border: 0;
      background: transparent;
      color: var(--dog-muted);
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }
    .dog-map-popup__visibility-btn:hover {
      color: var(--dog-text);
    }
    .dog-map-popup__visibility-btn--show {
      color: var(--dog-accent-strong);
    }
    .dog-map-popup__visibility-btn--show:hover {
      color: var(--dog-accent);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 640px) {
      .dog-map-popup {
        left: 0;
        align-items: end;
        padding: 0 0 0.5rem;
      }
      :host-context(.dog-explore--panel-open) .dog-map-popup {
        bottom: calc(4.6rem + env(safe-area-inset-bottom, 0px) + min(48dvh, 22rem));
      }
      .dog-map-popup__panel {
        width: min(22rem, calc(100% - 1rem));
        max-height: min(58dvh, 30rem);
        border-radius: 20px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogMapPopupComponent {
  readonly explore = inject(DogExploreService);
  readonly auth = inject(DogAuthService);
  readonly social = inject(DogSocialService);
  readonly spotSocialApi = inject(DogSpotSocialService);
  readonly spotLabels = DOG_SPOT_LABELS;
  readonly spotEmoji = DOG_SPOT_EMOJI;
  readonly leashLabel = leashLabel;
  readonly sourceLabel = sourceLabel;
  readonly imageSourceLabel = imageSourceLabel;

  readonly hiddenImages = signal<Record<string, true>>({});
  readonly spotSocial = signal<DogSpotSocial | null>(null);
  readonly commentText = signal('');
  readonly reportMsg = signal<string | null>(null);
  readonly deletePinMsg = signal<string | null>(null);
  readonly deletingPin = signal(false);

  constructor() {
    effect(() => {
      if (this.explore.mapPopupOpen()) {
        this.hiddenImages.set({});
      }
    });

    effect(() => {
      const spot = this.explore.selectedSpot();
      this.reportMsg.set(null);
      this.deletePinMsg.set(null);
      this.deletingPin.set(false);
      if (!spot) {
        this.spotSocial.set(null);
        return;
      }
      if (spot.isUserPin) {
        this.spotSocial.set(null);
        return;
      }
      void this.spotSocialApi.load(spot.id).then((s) => this.spotSocial.set(s));
    });
  }

  hideSpotImage(key: string): void {
    this.hiddenImages.update((m) => ({ ...m, [key]: true }));
  }

  close(): void {
    this.explore.closeMapPopup();
  }

  openSpotTip(kind: DogSpotKind): void {
    this.explore.openTip(tipIdForSpot(kind));
  }

  openAlertTip(alert: DogAlert): void {
    this.explore.openTip(tipIdForAlert(alert.kind, alert.id));
  }

  hideAlert(id: string): void {
    this.explore.hideAlert(id);
  }

  showAlert(id: string): void {
    this.explore.showAlert(id);
  }

  async removeOwnPin(id: string): Promise<void> {
    if (this.deletingPin()) return;
    this.deletingPin.set(true);
    this.deletePinMsg.set(null);
    const ok = await this.explore.removeOwnPin(id);
    this.deletingPin.set(false);
    if (!ok) {
      this.deletePinMsg.set('Marker konnte nicht entfernt werden.');
      return;
    }
    this.deletePinMsg.set('Marker entfernt.');
    window.setTimeout(() => this.close(), 900);
  }

  showCommunityTips(): void {
    this.explore.closeMapPopup();
    this.explore.scrollPanelToDetail();
  }

  openUrl(lat: number, lng: number): string {
    return dogGoogleMapsOpen(lat, lng);
  }

  routeUrl(toLat: number, toLng: number): string {
    const c = this.explore.center();
    return dogGoogleMapsRoute(c.lat, c.lng, toLat, toLng);
  }

  proposeMeetup(spot: DogSpot): void {
    this.explore.closeMapPopup();
    this.social.openMeetupForSpot({
      spotId: spot.id,
      spotName: spot.name,
      lat: spot.lat,
      lng: spot.lng,
    });
  }

  async vote(spotId: string, direction: 'up' | 'down'): Promise<void> {
    const next = await this.spotSocialApi.vote(spotId, direction);
    if (next) this.spotSocial.set(next);
  }

  async submitComment(spotId: string): Promise<void> {
    const text = this.commentText().trim();
    if (!text) return;
    const next = await this.spotSocialApi.comment(spotId, text);
    if (next) {
      this.spotSocial.set(next);
      this.commentText.set('');
      this.explore.markSpotHasCommunity(spotId);
    }
  }

  async reportSpot(spotId: string): Promise<void> {
    const result = await this.spotSocialApi.report(spotId);
    if (!result.ok) {
      this.reportMsg.set(result.error ?? 'Meldung fehlgeschlagen');
      return;
    }
    if (result.alreadyReported) {
      this.reportMsg.set('Du hast diesen Punkt bereits gemeldet.');
      return;
    }
    if (result.blocked) {
      this.explore.blockSpot(spotId);
      this.reportMsg.set('Punkt wurde nach mehreren Meldungen ausgeblendet.');
      window.setTimeout(() => this.close(), 1200);
      return;
    }
    this.reportMsg.set(`Danke — Meldung ${result.reportCount} von 3 erfasst.`);
  }
}
