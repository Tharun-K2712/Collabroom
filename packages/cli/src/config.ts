import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CliConfig {
  apiUrl: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  activeRoomId?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.collabroom');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  static getConfig(): CliConfig {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfig: CliConfig = {
          apiUrl: process.env.COLLABROOM_API_URL || 'http://localhost:5000/api',
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
      }
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        apiUrl: 'http://localhost:5000/api',
      };
    }
  }

  static saveConfig(config: CliConfig): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  static setAuth(token: string, user: CliConfig['user']): void {
    const config = this.getConfig();
    config.token = token;
    config.user = user;
    this.saveConfig(config);
  }

  static clearAuth(): void {
    const config = this.getConfig();
    delete config.token;
    delete config.user;
    this.saveConfig(config);
  }

  static setActiveRoom(roomId: string): void {
    const config = this.getConfig();
    config.activeRoomId = roomId;
    this.saveConfig(config);
  }
}
