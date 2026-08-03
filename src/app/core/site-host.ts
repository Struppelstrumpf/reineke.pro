/** Domain-Hosts, die eine eigenständige Site (ohne Portfolio-Chrome) laden. */
export function isZauberfuchsHost(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'zauberfuchs.net' ||
    h === 'www.zauberfuchs.net' ||
    h.endsWith('.zauberfuchs.net')
  );
}
