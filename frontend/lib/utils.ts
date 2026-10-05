import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: string | number | bigint, decimals = 1): string {
  const b = typeof bytes === 'string' ? parseInt(bytes, 10) : typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (!b || b === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function getFileTypeInfo(extension: string) {
  const ext = extension.toLowerCase().replace('.', '');
  switch (ext) {
    case 'py':
    case 'ipynb':
      return { label: 'Python Script', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
    case 'html':
    case 'css':
    case 'scss':
    case 'c':
    case 'cpp':
    case 'cs':
    case 'java':
    case 'go':
    case 'rs':
    case 'php':
    case 'rb':
    case 'sql':
    case 'sh':
    case 'yaml':
    case 'yml':
    case 'toml':
      return { label: 'Code File', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
    case 'pdf':
      return { label: 'PDF Document', color: 'text-red-400', bg: 'bg-red-500/10' };
    case 'doc':
    case 'docx':
    case 'odt':
    case 'rtf':
    case 'txt':
    case 'md':
    case 'markdown':
      return { label: 'Text Document', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'tsv':
    case 'ods':
      return { label: 'Spreadsheet', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'ppt':
    case 'pptx':
    case 'odp':
      return { label: 'Presentation', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico':
      return { label: 'Image', color: 'text-purple-400', bg: 'bg-purple-500/10' };
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
      return { label: 'Archive', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'mkv':
    case 'avi':
      return { label: 'Video', color: 'text-pink-400', bg: 'bg-pink-500/10' };
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
    case 'flac':
    case 'aac':
      return { label: 'Audio', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    default:
      return { label: 'Document', color: 'text-slate-400', bg: 'bg-slate-500/10' };
  }
}
