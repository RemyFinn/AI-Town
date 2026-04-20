import { NPC_DEFINITIONS_BY_NAME } from "../content/npcs";

export interface StatusFetchResult {
  dialogues: Record<string, string>;
  source: "backend" | "fallback";
  error?: string;
}

export interface ChatFetchResult {
  message: string;
  source: "backend" | "fallback";
  error?: string;
}

const STATUS_PRESETS = {
  morning: {
    张三: "早上好，今天继续打磨多智能体系统。",
    李四: "我先整理一下今天的会议和需求优先级。",
    王五: "先来杯咖啡，再把新界面的层次调顺。",
  },
  noon: {
    张三: "写了一上午代码，那个疑难 bug 总算松动了。",
    李四: "中午正好把需求清单再过一遍，下午推进更稳。",
    王五: "这个配色差一点意思，我想再压一压明度。",
  },
  afternoon: {
    张三: "这个算法还可以再快一点，我准备继续拆热点路径。",
    李四: "下午的重点是把下周评审需要的材料补完整。",
    王五: "设计稿差不多成型了，接下来补交互细节。",
  },
  evening: {
    张三: "今天的提交基本收尾了，明天继续清理技术债。",
    李四: "我在整理明天的待办，让节奏别断掉。",
    王五: "今天的视觉方案先这样，明天再做最后一轮微调。",
  },
} as const;

const getTimeBucket = (date = new Date()): keyof typeof STATUS_PRESETS => {
  const hour = date.getHours();
  if (hour < 12) {
    return "morning";
  }
  if (hour < 14) {
    return "noon";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
};

const describeFetchError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "未知网络错误";
};

export class TownBackendClient {
  readonly apiBaseUrl: string;

  constructor(apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000") {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
  }

  async fetchNpcStatuses(): Promise<StatusFetchResult> {
    try {
      const payload = await this.fetchJson<{ dialogues?: Record<string, string> }>("/npcs/status");
      const dialogues = payload.dialogues ?? this.getFallbackStatuses();

      return {
        dialogues,
        source: payload.dialogues ? "backend" : "fallback",
        error: payload.dialogues ? undefined : "后端未返回 NPC 状态，已切换到本地。",
      };
    } catch (error) {
      return {
        dialogues: this.getFallbackStatuses(),
        source: "fallback",
        error: describeFetchError(error),
      };
    }
  }

  async sendChat(npcName: string, message: string): Promise<ChatFetchResult> {
    try {
      const payload = await this.fetchJson<{ message?: string }>("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          npc_name: npcName,
          message,
        }),
      });

      if (!payload.message) {
        return {
          message: this.getFallbackChat(npcName, message),
          source: "fallback",
          error: "后端未返回对话内容，已使用本地回复。",
        };
      }

      return {
        message: payload.message,
        source: "backend",
      };
    } catch (error) {
      return {
        message: this.getFallbackChat(npcName, message),
        source: "fallback",
        error: describeFetchError(error),
      };
    }
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private getFallbackStatuses(): Record<string, string> {
    return STATUS_PRESETS[getTimeBucket()];
  }

  private getFallbackChat(npcName: string, message: string): string {
    const npc = NPC_DEFINITIONS_BY_NAME[npcName];
    const normalizedMessage = message.toLowerCase();

    if (message.includes("你好") || normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
      return `你好，我是${npcName}${npc ? `，负责${npc.title}` : ""}。现在是离线兜底模式，不过我们还是可以先聊聊。`;
    }

    if (message.includes("做什么") || message.includes("在忙") || normalizedMessage.includes("doing")) {
      if (npcName === "张三") {
        return "我在盯多智能体系统那块逻辑，想把响应链路再收紧一点。";
      }
      if (npcName === "李四") {
        return "我在梳理需求优先级，尽量让研发和设计都更顺畅。";
      }
      return "我在推界面细节，想让这个小镇既清晰又有一点生活感。";
    }

    if (message.includes("谢谢") || message.includes("感谢")) {
      return "不客气，等后端服务在线后，我们的对话会更完整。";
    }

    return `${npcName}想了想说：“${message.slice(0, 18)}${message.length > 18 ? "..." : ""}”这个话题不错，后端在线后我能给你更完整的回答。`;
  }
}
