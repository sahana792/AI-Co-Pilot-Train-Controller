// RailControl AI v7 — API Service

const BASE =
  import.meta.env.VITE_API_URL ||
  "https://ai-co-pilot-train-controller.onrender.com";

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${BASE}${path}`);

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    return res.json();
  },

  post: async (path: string, body: any) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    return res.json();
  },
};

// APIs
export const getTrains = () =>
  api.get("/api/trains");

export const getPlatforms = () =>
  api.get("/api/platform/status");

export const getSignals = () =>
  api.get("/api/signal/status");

export const getAlerts = () =>
  api.get("/api/alerts");

export const getOverview = () =>
  api.get("/api/control-room/overview");

export const chatbot = (query: string) =>
  api.post("/api/chatbot/ask", { query });

export const controlSignal = (
  signal_id: string,
  status: string
) =>
  api.post("/api/signal/control", {
    signal_id,
    status,
  });

export const updatePlatform = (
  platform_id: string,
  status: string
) =>
  api.post("/api/platform/update", {
    platform_id,
    status,
  });

export const predictDelay = (body: any) =>
  api.post("/api/ml/predict-delay", body);
