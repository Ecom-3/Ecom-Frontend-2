export const normalizeImageUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const url = new URL(input);
    const driveFile = url.pathname.match(/\/file\/d\/([^/]+)/);
    const driveId = driveFile?.[1] || (url.hostname === 'drive.google.com' ? url.searchParams.get('id') : '');
    if (driveId && ['drive.google.com', 'www.drive.google.com'].includes(url.hostname)) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`;
    }
    return url.href;
  } catch {
    return input;
  }
};

export const isValidImageUrl = (value) => {
  if (!String(value || '').trim()) return true;
  try {
    const url = new URL(String(value).trim());
    const isDriveHost = ['drive.google.com', 'www.drive.google.com'].includes(url.hostname);
    const hasDriveFile = /\/file\/d\/[^/]+/.test(url.pathname) || Boolean(url.searchParams.get('id'));
    return url.protocol === 'https:' && isDriveHost && hasDriveFile;
  } catch {
    return false;
  }
};
