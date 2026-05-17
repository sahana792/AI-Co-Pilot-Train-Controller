export interface Train {
  train_id: string;
  train_name: string;
  train_number: string;
  route: string;
  source: string;
  destination: string;
  current_station: string;
  next_station: string;
  platform: string;
  arrival_time: string;
  departure_time: string;
  speed: number;
  signal_status: string;
  weather: string;
  congestion_level: string;
  delay_minutes: number;
  detected_objects: string[];
  risk_level: string;
  run_status: string;
  recommendation: string;
  is_active: boolean;
  lat?: number;
  lng?: number;
  heading?: number;
}

export interface Platform {
  platform_id: string;
  station: string;
  platform_number: string;
  status: string;
  train_id?: string;
  capacity: number;
  current_occupancy: number;
  scheduled_arrival?: string;
  scheduled_departure?: string;
}

export interface Signal {
  signal_id: string;
  location: string;
  status: string;
  track: string;
  last_updated: string;
  auto_mode: boolean;
}

export interface Alert {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: string;
  operator_action: string;
  confidence?: number;
}

export interface Detection {
  label: string;
  category: string;
  confidence: number;
  bbox: number[];
}

export interface DelayPrediction {
  predicted_delay_minutes: number;
  confidence: number;
  recommendation: string;
  reasons: any[];
  timestamp: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  type: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
}
