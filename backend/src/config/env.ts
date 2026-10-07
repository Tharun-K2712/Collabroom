import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/collabroom?schema=public',
  
  JWT: {
    SECRET: process.env.JWT_SECRET || 'collabroom_super_secret_jwt_access_key_2026_production_ready',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'collabroom_super_secret_refresh_token_key_2026_production_ready',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRATION || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  SUPABASE: {
    URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bxktvnrvpsoejetaxxaq.supabase.co',
    KEY: process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_QTVLYK3r6FTmaLLMi5hCyQ_loaZ3ikl',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    BUCKET_NAME: process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'collabroom-files',
  },

  STORAGE: {
    PROVIDER: (process.env.STORAGE_PROVIDER || 'supabase') as 'supabase' | 'local',
  },

  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    FROM: process.env.EMAIL_FROM || 'CollabRoom <no-reply@collabroom.io>',
  },

  AI: {
    API_KEY: process.env.AI_API_KEY || '',
  },

  UPLOAD: {
    MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB default
    ALLOWED_EXTENSIONS: [
      // Code & Scripts
      'py', 'ipynb', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'json5',
      'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'go', 'rs', 'php', 'rb', 'swift', 'kt',
      'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'r', 'lua', 'dart', 'graphql',
      'yaml', 'yml', 'toml', 'ini', 'xml', 'env', 'conf', 'dockerfile', 'gitignore', 'prisma',
      // Documents & Office
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf',
      'txt', 'csv', 'tsv', 'md', 'markdown', 'tex', 'log',
      // Audio & Voice
      'wav', 'mp3', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'aiff',
      // Video & Multimedia
      'mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv',
      // Images & Graphics
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'psd', 'ai',
      // Archives & Data
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'parquet', 'avro'
    ],
  }
};
