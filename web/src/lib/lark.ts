
interface LarkConfig {
  appId: string;
  appSecret: string;
}

interface LarkTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

export class LarkClient {
  private appId: string;
  private appSecret: string;
  private baseUrl = 'https://open.feishu.cn/open-apis';

  constructor(config: LarkConfig) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
  }

  private async getAccessToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });
    
    const data: LarkTokenResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(`Failed to get access token: ${data.msg}`);
    }
    return data.tenant_access_token;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // Generic request wrapper
  async request(path: string, method: string = 'GET', body?: any) {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Lark API Error: ${data.msg} (Code: ${data.code})`);
    }
    return data.data;
  }
}
