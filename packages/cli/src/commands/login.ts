import readline from 'readline';
import { ApiClient } from '../client';
import { ConfigManager } from '../config';

const ask = (query: string, hide = false): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hide) {
      process.stdout.write(query);
      let text = '';
      process.stdin.on('data', (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r' || c === '\u0004') {
          // enter
        } else if (c === '\u0003') {
          process.exit();
        } else if (c === '\b') {
          text = text.slice(0, -1);
        } else {
          text += c;
        }
      });
      rl.question('', () => {
        resolve(text.trim());
      });
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
};

export async function loginCommand(emailArg?: string, passwordArg?: string) {
  try {
    console.log('\n🔒 CollabRoom CLI Authentication\n');
    const email = emailArg || (await ask('Email: '));
    const password = passwordArg || (await ask('Password: '));

    if (!email || !password) {
      console.error('❌ Email and password are required.');
      process.exit(1);
    }

    console.log('🔄 Authenticating with CollabRoom server...');
    const res = await ApiClient.login(email, password);

    if (res.success && res.data) {
      ConfigManager.setAuth(res.data.accessToken, res.data.user);
      console.log(`\n✅ Successfully logged in as \x1b[32m${res.data.user.fullName}\x1b[0m (${res.data.user.email})`);
      console.log(`🔑 Session token saved to config.\n`);
    } else {
      console.error(`❌ Authentication failed: ${res.message || 'Unknown error'}`);
    }
  } catch (err: any) {
    console.error(`❌ Error during login: ${err.message}`);
  }
}

export async function logoutCommand() {
  ConfigManager.clearAuth();
  console.log('\n🚪 Logged out from CollabRoom CLI session.\n');
}

export async function whoamiCommand() {
  const config = ConfigManager.getConfig();
  if (!config.token || !config.user) {
    console.log('\n⚠️ Not logged in. Run \x1b[36mcollabroom login\x1b[0m to sign in.\n');
    return;
  }
  console.log(`\n👤 Authenticated User: \x1b[32m${config.user.fullName}\x1b[0m`);
  console.log(`📧 Email: ${config.user.email}`);
  console.log(`🌐 Connected API: ${config.apiUrl}\n`);
}
