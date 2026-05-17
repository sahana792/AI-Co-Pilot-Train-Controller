"""AI Chatbot Service - Rule-Based + Optional LLM"""
import re
from typing import Dict, Any, List, Optional


PATTERN_RESPONSES = [
    (r"obstacle|track.*clear|clear.*track", "obstacle"),
    (r"person|human|someone.*track|track.*person", "person"),
    (r"delay|late|behind.*schedule|schedule", "delay"),
    (r"risk|danger|critical|high.*risk|emergency", "risk"),
    (r"signal|red.*signal|green.*signal|signal.*status", "signal"),
    (r"speed|fast|slow|overspe", "speed"),
    (r"platform|station|crowd", "platform"),
    (r"recommend|action|should.*do|what.*do", "recommendation"),
    (r"alert|warning|alarm", "alerts"),
    (r"train.*list|all.*train|show.*train", "train_list"),
    (r"weather|fog|rain|storm", "weather"),
    (r"route.*conflict|conflict.*route|same.*track", "conflict"),
    (r"hello|hi|hey|help", "greeting"),
    (r"status|overview|summary|dashboard", "overview"),
]


def _match_intent(message: str) -> str:
    msg = message.lower()
    for pattern, intent in PATTERN_RESPONSES:
        if re.search(pattern, msg):
            return intent
    return "unknown"


def generate_response(message: str, trains: List[Dict], alerts: List[Dict]) -> Dict[str, Any]:
    intent = _match_intent(message)

    critical_trains = [t for t in trains if t.get("risk_level") == "Critical"]
    high_risk_trains = [t for t in trains if t.get("risk_level") == "High"]
    delayed_trains = [t for t in trains if t.get("delay_minutes", 0) > 0]
    unresolved_alerts = [a for a in alerts if not a.get("resolved", False)]

    related_trains = []
    alert_msgs = []

    if intent == "greeting":
        response = (
            "👋 Welcome to Railway AI Copilot! I'm your intelligent control assistant.\n\n"
            "I can help you with:\n"
            "• Track obstacle and hazard detection status\n"
            "• Train delays and scheduling\n"
            "• Signal and risk monitoring\n"
            "• Platform and route management\n"
            "• Emergency recommendations\n\n"
            "What would you like to know?"
        )

    elif intent == "overview":
        active = len(trains)
        critical = len(critical_trains)
        delayed = len(delayed_trains)
        response = (
            f"📊 **System Overview**\n\n"
            f"• Active Trains: {active}\n"
            f"• Critical Risk: {critical} train(s)\n"
            f"• Delayed: {delayed} train(s)\n"
            f"• Unresolved Alerts: {len(unresolved_alerts)}\n\n"
        )
        if critical_trains:
            response += f"⚠ CRITICAL: {', '.join(t['train_id'] for t in critical_trains)} require immediate attention!"
        related_trains = [t["train_id"] for t in critical_trains]

    elif intent == "obstacle":
        obstacle_trains = [t for t in trains if any("obstacle" in o.lower() or "track_damage" in o.lower() for o in t.get("detected_objects", []))]
        if obstacle_trains:
            response = f"⚠ **Obstacle/Damage Detected on Track**\n\n"
            for t in obstacle_trains:
                response += f"• {t['train_id']} ({t['route']}): {', '.join(t['detected_objects'])}\n"
                response += f"  → Recommendation: {t.get('recommendation', 'Stop and assess')}\n"
            related_trains = [t["train_id"] for t in obstacle_trains]
        else:
            response = "✅ No obstacles or track damage currently detected on any active routes."

    elif intent == "person":
        person_trains = [t for t in trains if any("person" in o.lower() for o in t.get("detected_objects", []))]
        if person_trains:
            response = "🚨 **CRITICAL: Person Detected on Track!**\n\n"
            for t in person_trains:
                response += f"• {t['train_id']} at {t['current_station']}\n"
                response += f"  → ACTION: Emergency stop immediately!\n"
            alert_msgs = [f"Person on track near {t['train_id']}" for t in person_trains]
            related_trains = [t["train_id"] for t in person_trains]
        else:
            response = "✅ No persons detected on active tracks."

    elif intent == "delay":
        if delayed_trains:
            response = f"⏱ **Delayed Trains ({len(delayed_trains)})**\n\n"
            for t in sorted(delayed_trains, key=lambda x: x.get("delay_minutes", 0), reverse=True):
                delay = t.get("delay_minutes", 0)
                response += f"• {t['train_id']} – {t['route']}: **{delay:.0f} min delay**\n"
                if delay > 20:
                    response += f"  → Rerouting recommended\n"
            related_trains = [t["train_id"] for t in delayed_trains]
        else:
            response = "✅ All trains are running on schedule. No delays detected."

    elif intent == "risk":
        if critical_trains or high_risk_trains:
            response = f"🔴 **High Risk Trains**\n\n"
            for t in critical_trains:
                response += f"• [CRITICAL] {t['train_id']}: {t.get('recommendation', 'Immediate action required')}\n"
            for t in high_risk_trains:
                response += f"• [HIGH] {t['train_id']}: {t.get('recommendation', 'Caution required')}\n"
            related_trains = [t["train_id"] for t in critical_trains + high_risk_trains]
        else:
            response = "✅ No high-risk situations detected. All trains operating normally."

    elif intent == "signal":
        red_signal_trains = [t for t in trains if t.get("signal_status") == "Red"]
        yellow_signal_trains = [t for t in trains if t.get("signal_status") == "Yellow"]
        response = f"🚦 **Signal Status Report**\n\n"
        if red_signal_trains:
            response += f"🔴 Red Signal: {', '.join(t['train_id'] for t in red_signal_trains)}\n"
        if yellow_signal_trains:
            response += f"🟡 Yellow Signal: {', '.join(t['train_id'] for t in yellow_signal_trains)}\n"
        green_count = len([t for t in trains if t.get("signal_status") == "Green"])
        response += f"🟢 Green Signal: {green_count} train(s)\n"
        related_trains = [t["train_id"] for t in red_signal_trains]

    elif intent == "speed":
        overspeed_trains = [t for t in trains if t.get("speed", 0) > 120]
        if overspeed_trains:
            response = f"⚡ **Overspeeding Alert**\n\n"
            for t in overspeed_trains:
                response += f"• {t['train_id']}: {t.get('speed', 0):.1f} km/h (limit: 120)\n"
            related_trains = [t["train_id"] for t in overspeed_trains]
        else:
            response = f"✅ All trains within speed limits. Fastest: {max((t.get('speed',0) for t in trains), default=0):.0f} km/h"

    elif intent == "platform":
        response = "🏠 **Platform Status**\n\nCheck the Platform Management dashboard for live platform allocation and crowd levels."

    elif intent == "recommendation":
        if critical_trains:
            t = critical_trains[0]
            response = f"🎯 **Top Recommendation for {t['train_id']}**\n\n{t.get('recommendation', 'Assess situation immediately')}"
            related_trains = [t["train_id"]]
        elif high_risk_trains:
            t = high_risk_trains[0]
            response = f"🎯 **Recommendation for {t['train_id']}**\n\n{t.get('recommendation', 'Proceed with caution')}"
            related_trains = [t["train_id"]]
        else:
            response = "✅ No urgent actions required. All systems normal. Continue routine monitoring."

    elif intent == "alerts":
        if unresolved_alerts:
            response = f"🔔 **Active Alerts ({len(unresolved_alerts)})**\n\n"
            for a in unresolved_alerts[:5]:
                response += f"• [{a.get('severity', 'Medium')}] {a.get('message', '')}\n"
        else:
            response = "✅ No active alerts. System is clear."

    elif intent == "train_list":
        response = f"🚂 **Active Trains ({len(trains)})**\n\n"
        for t in trains:
            risk_icon = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "🟢"}.get(t.get("risk_level", "Low"), "⚪")
            response += f"{risk_icon} {t['train_id']} – {t.get('current_station', '?')} → {t.get('next_station', '?')}\n"

    elif intent == "weather":
        weather_trains = {}
        for t in trains:
            w = t.get("weather", "Clear")
            weather_trains.setdefault(w, []).append(t["train_id"])
        response = "🌤 **Weather Conditions by Route**\n\n"
        for w, ids in weather_trains.items():
            response += f"• {w}: {', '.join(ids)}\n"

    elif intent == "conflict":
        response = "⚠ **Route Conflict Detection**\n\nUse the Route Conflict Alerts page to check for potential conflicts between trains on shared tracks."

    else:
        response = (
            "🤖 I'm not sure about that query. Try asking:\n\n"
            "• 'Is there any obstacle on the track?'\n"
            "• 'Which train is delayed?'\n"
            "• 'Show high-risk alerts'\n"
            "• 'What action should I take?'\n"
            "• 'Signal status report'\n"
            "• 'Give me a system overview'"
        )

    return {"response": response, "related_trains": related_trains, "alerts": alert_msgs}
