// RailControl AI v7 — API Service

const BASE =
  import.meta.env.VITE_API_URL ||
  "https://ai-co-pilot-train-controller.onrender.com";

export const api = {
  get: (path: string) =>
    fetch(`${BASE}${path}`).then((r) => r.json()),

  post: (path: string, body: any) =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
};

// Correct backend endpoints
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
