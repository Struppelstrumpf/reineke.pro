export function dogMascotMarkerHtml(): string {
  return `<span class="dog-map__user" aria-hidden="true">
  <span class="dog-map__user-glow"></span>
  <svg class="dog-map__user-dog" viewBox="0 0 44 30" width="34" height="24">
    <ellipse cx="22" cy="27" rx="10" ry="2.2" fill="rgba(0,0,0,0.12)"/>
    <g class="dog-map__user-tail">
      <ellipse cx="7" cy="14" rx="4.8" ry="2.1" fill="#c8b898"/>
    </g>
    <ellipse cx="18" cy="16" rx="11" ry="7.2" fill="#e8dcc8"/>
    <ellipse cx="17" cy="17" rx="7.2" ry="5" fill="#d4c4a8"/>
    <ellipse cx="8.5" cy="19.5" rx="2" ry="3.2" fill="#c8b898"/>
    <ellipse cx="13" cy="21.5" rx="1.8" ry="3.4" fill="#c8b898"/>
    <ellipse cx="22" cy="21.5" rx="1.8" ry="3.4" fill="#c8b898"/>
    <ellipse cx="26.5" cy="19.5" rx="2" ry="3.2" fill="#c8b898"/>
    <circle cx="29" cy="14" r="5.8" fill="#e8dcc8"/>
    <ellipse cx="27.2" cy="9.8" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 27.2 9.8)"/>
    <ellipse cx="27.2" cy="18.2" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 27.2 18.2)"/>
    <circle cx="31.2" cy="13.2" r="1.35" fill="#1c2214"/>
    <circle cx="31.55" cy="12.85" r="0.42" fill="#fff" opacity="0.9"/>
    <circle cx="33.8" cy="14.2" r="1.55" fill="#1c2214"/>
  </svg>
</span>`;
}
