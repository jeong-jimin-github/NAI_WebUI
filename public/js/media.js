export function fileToImage(file) {
  if (!file) return Promise.resolve(null);
  return blobToImage(file, file.name);
}

export function blobToImage(blob, name = 'image.png') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        resolve({
          name,
          dataUrl,
          base64: String(dataUrl).split(',')[1],
          width: img.naturalWidth,
          height: img.naturalHeight,
          blob,
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.readAsDataURL(blob);
  });
}

export async function unpackImages(response, prefix) {
  const blob = await response.blob();
  const type = response.headers.get('content-type') || blob.type || '';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const zipped = bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (zipped && window.JSZip) {
    const zip = await window.JSZip.loadAsync(bytes);
    const out = [];
    let index = 0;
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      const fileBlob = await entry.async('blob');
      const imageBlob = fileBlob.type ? fileBlob : new Blob([fileBlob], { type: 'image/png' });
      out.push({
        blob: imageBlob,
        url: URL.createObjectURL(imageBlob),
        filename: `${prefix}_${index++}.png`,
      });
    }
    return out;
  }

  if (type.includes('image') || bytes.length > 8) {
    const imageBlob = new Blob([bytes], { type: type.includes('image') ? type : 'image/png' });
    return [{ blob: imageBlob, url: URL.createObjectURL(imageBlob), filename: `${prefix}.png` }];
  }
  return [];
}

export function saveBlob(result) {
  const link = document.createElement('a');
  link.href = result.url;
  link.download = result.filename || 'novelai.png';
  link.click();
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

export function toast(message, kind = '', duration = 3600) {
  const host = document.getElementById('toastHost');
  if (!host) return;
  const node = document.createElement('div');
  node.className = `toast ${kind}`.trim();
  node.textContent = message;
  host.append(node);
  setTimeout(() => node.remove(), duration);
}
