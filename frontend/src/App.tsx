import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import VoiceAlertControl from './components/VoiceAlertControl';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ControlRoom from './pages/ControlRoom';
import LiveDetection from './pages/LiveDetection';
import KarnatakaMap from './pages/KarnatakaMap';
import SignalControl from './pages/SignalControl';
import TrainMonitor from './pages/TrainMonitor';
import Alerts from './pages/Alerts';
import Chatbot from './pages/Chatbot';
import PlatformMgmt from './pages/PlatformMgmt';
import CCTVMonitor from './pages/CCTVMonitor';
import StationControl from './pages/StationControl';
import { TrafficControl, RouteConflict, EmergencyOverride } from './pages/TrafficPages';
import Reports from './pages/Reports';
import DelayPrediction from './pages/DelayPrediction';

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#02060f' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 230,
        padding: '20px 24px',
        minHeight: '100vh',
        background: '#02060f',
        color: '#e0eaff',
        overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Animated grid background */}
        <div style={{
          position: 'fixed', inset: 0, marginLeft: 230,
          backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none', zIndex: 0,
          animation: 'grid-fade 8s ease-in-out infinite',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </main>
      {/* 🔊 Global Voice Alert Control — visible on every page */}
      <VoiceAlertControl />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/"              element={<Navigate to="/control-room" replace />} />
        <Route path="/control-room"  element={<PrivateLayout><ControlRoom /></PrivateLayout>} />
        <Route path="/dashboard"     element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/live-detection"element={<PrivateLayout><LiveDetection /></PrivateLayout>} />
        <Route path="/karnataka-map" element={<PrivateLayout><KarnatakaMap /></PrivateLayout>} />
        <Route path="/signals"       element={<PrivateLayout><SignalControl /></PrivateLayout>} />
        <Route path="/trains"        element={<PrivateLayout><TrainMonitor /></PrivateLayout>} />
        <Route path="/alerts"        element={<PrivateLayout><Alerts /></PrivateLayout>} />
        <Route path="/chatbot"       element={<PrivateLayout><Chatbot /></PrivateLayout>} />
        <Route path="/platform"      element={<PrivateLayout><PlatformMgmt /></PrivateLayout>} />
        <Route path="/cctv"          element={<PrivateLayout><CCTVMonitor /></PrivateLayout>} />
        <Route path="/stations"      element={<PrivateLayout><StationControl /></PrivateLayout>} />
        <Route path="/traffic"       element={<PrivateLayout><TrafficControl /></PrivateLayout>} />
        <Route path="/conflict"      element={<PrivateLayout><RouteConflict /></PrivateLayout>} />
        <Route path="/emergency"     element={<PrivateLayout><EmergencyOverride /></PrivateLayout>} />
        <Route path="/reports"       element={<PrivateLayout><Reports /></PrivateLayout>} />
        <Route path="/delay"         element={<PrivateLayout><DelayPrediction /></PrivateLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
