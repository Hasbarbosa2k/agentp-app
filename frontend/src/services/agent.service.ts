import { api } from './api';
import axios from 'axios';

export interface TestAssets {
  videoUrl?: string;
  screenshots: string[];
}

class AgentService {
  private readonly basePath = '/agent';
  private readonly agentBaseUrl: string;

  async getAssets(testId: string): Promise<TestAssets> {
    const path = `${this.basePath}/assets/${encodeURIComponent(testId)}`;
    const url = this.agentBaseUrl ? `${this.agentBaseUrl}${path}` : path;
    console.log('🎥 [AGENT] GET assets request:', { testId, url });
    const response = await axios.get(url);
    const raw = response.data;
    const payload = raw?.data ?? raw;
    // Video: accept string or object { url }
    let videoUrl: string | undefined = undefined;
    if (typeof payload?.videoUrl === 'string') {
      videoUrl = payload.videoUrl;
    } else if (typeof payload?.primaryVideoUrl === 'string') {
      videoUrl = payload.primaryVideoUrl;
    } else if (typeof payload?.video === 'string') {
      videoUrl = payload.video;
    } else if (payload?.video && typeof payload.video === 'object' && typeof payload.video.url === 'string') {
      videoUrl = payload.video.url;
    }

    // Screenshots: accept string[] or { url }[]
    let screenshots: string[] = [];
    if (Array.isArray(payload?.screenshots)) {
      if (payload.screenshots.length > 0 && typeof payload.screenshots[0] === 'string') {
        screenshots = payload.screenshots as string[];
      } else {
        screenshots = (payload.screenshots as any[])
          .map((item) => (item && typeof item.url === 'string' ? item.url : null))
          .filter((u): u is string => Boolean(u));
      }
    }

    console.log('🎥 [AGENT] GET assets response:', {
      testId,
      url,
      hasVideo: Boolean(videoUrl),
      screenshotsCount: screenshots.length,
    });
    return { videoUrl, screenshots };
  }

  constructor() {
    // Separate base URL just for agent assets (e.g., http://localhost:3002)
    const envBase = import.meta.env.VITE_AGENT_API_URL as string | undefined;
    this.agentBaseUrl = (envBase || '').replace(/\/$/, '');
  }
}

export const agentService = new AgentService();
export default agentService;

