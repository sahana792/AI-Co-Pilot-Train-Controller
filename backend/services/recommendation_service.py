"""Rule-Based Expert System for Railway Safety"""
from typing import List, Dict, Any


RISK_PRIORITIES = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}

# ─── Rule definitions ─────────────────────────────────────────────────────────
RULES = [
    # Critical rules
    {
        "condition": lambda d: "person_on_track" in d["objects"] or "Person on Track" in d["objects"],
        "priority": "Critical",
        "actions": ["EMERGENCY STOP immediately", "Alert ground staff via intercom", "Activate emergency brakes"],
        "automated": ["brake_emergency", "alert_ground_staff", "activate_alarm"],
    },
    {
        "condition": lambda d: "track_damage" in d["objects"] or "Track Damage/Crack" in d["objects"],
        "priority": "Critical",
        "actions": ["Block route immediately", "Halt all trains on track", "Dispatch maintenance team", "File incident report"],
        "automated": ["block_route", "halt_trains", "notify_maintenance"],
    },
    {
        "condition": lambda d: d.get("signal_status") == "Red" and d.get("speed", 0) > 10,
        "priority": "Critical",
        "actions": ["Stop train immediately - Red signal violation", "Report signal override incident", "Notify signal controller"],
        "automated": ["emergency_stop", "log_violation"],
    },
    # High rules
    {
        "condition": lambda d: "obstacle_on_track" in d["objects"] or "Obstacle on Track" in d["objects"],
        "priority": "High",
        "actions": ["Stop train", "Dispatch clearing crew", "Assess obstacle type and size", "Inform next station"],
        "automated": ["stop_train", "dispatch_crew"],
    },
    {
        "condition": lambda d: "animal_on_track" in d["objects"] or "Animal on Track" in d["objects"],
        "priority": "High",
        "actions": ["Reduce speed immediately", "Sound horn repeatedly", "Alert station master", "Proceed with caution if clear"],
        "automated": ["reduce_speed", "sound_horn"],
    },
    {
        "condition": lambda d: "level_crossing_vehicle" in d["objects"] or "Level Crossing Vehicle" in d["objects"],
        "priority": "High",
        "actions": ["Activate level crossing alarm", "Halt train approach", "Notify traffic police", "Wait for clearance"],
        "automated": ["activate_lc_alarm", "notify_traffic"],
    },
    {
        "condition": lambda d: d.get("speed", 0) > 130,
        "priority": "High",
        "actions": ["Reduce speed immediately - Overspeeding", "Issue speed warning to driver", "Log speed violation"],
        "automated": ["speed_limit_warning", "log_violation"],
    },
    {
        "condition": lambda d: d.get("delay_minutes", 0) > 20,
        "priority": "High",
        "actions": [
            "Evaluate rerouting options via Dijkstra algorithm",
            "Notify passengers of delay",
            "Coordinate with next station",
            "Adjust platform allocation",
        ],
        "automated": ["notify_passengers", "calculate_reroute"],
    },
    # Medium rules
    {
        "condition": lambda d: "platform_crowd" in d["objects"] or "Platform Crowd" in d["objects"],
        "priority": "Medium",
        "actions": ["Reduce approach speed", "Request crowd management at platform", "Announce boarding zones"],
        "automated": ["reduce_approach_speed", "crowd_alert"],
    },
    {
        "condition": lambda d: d.get("congestion_level") in ("High", "Critical"),
        "priority": "Medium",
        "actions": ["Increase headway between trains", "Implement dynamic scheduling", "Monitor platform occupancy"],
        "automated": ["increase_headway"],
    },
    {
        "condition": lambda d: d.get("signal_status") == "Yellow",
        "priority": "Medium",
        "actions": ["Reduce speed to caution level (< 60 km/h)", "Prepare to stop if required", "Monitor signal status"],
        "automated": ["caution_speed"],
    },
]


def get_recommendations(train_id: str, risk_level: str, detected_objects: List[str],
                        delay_minutes: float, speed: float, signal_status: str,
                        congestion_level: str) -> Dict[str, Any]:
    ctx = {
        "objects": detected_objects,
        "risk_level": risk_level,
        "delay_minutes": delay_minutes,
        "speed": speed,
        "signal_status": signal_status,
        "congestion_level": congestion_level,
    }

    fired_rules = []
    for rule in RULES:
        try:
            if rule["condition"](ctx):
                fired_rules.append(rule)
        except Exception:
            pass

    if not fired_rules:
        return {
            "actions": ["Normal operation. Continue as scheduled.", "Maintain current speed.", "Monitor telemetry."],
            "priority": "Low",
            "automated_actions": ["monitor_telemetry"],
        }

    # Highest priority rule
    fired_rules.sort(key=lambda r: RISK_PRIORITIES.get(r["priority"], 0), reverse=True)
    top = fired_rules[0]
    all_actions = []
    all_automated = []
    for r in fired_rules[:3]:  # top 3 relevant
        for a in r["actions"]:
            if a not in all_actions:
                all_actions.append(a)
        for a in r["automated"]:
            if a not in all_automated:
                all_automated.append(a)

    return {
        "actions": all_actions,
        "priority": top["priority"],
        "automated_actions": all_automated,
    }


# ─── Traffic Controller ───────────────────────────────────────────────────────
def allocate_platform(train_id: str, priority: str, available_platforms: List[Dict]) -> Dict:
    """Priority scheduling for platform allocation."""
    if not available_platforms:
        return {"success": False, "message": "No platforms available", "platform": None}

    priority_order = {"Express": 0, "High": 1, "Normal": 2, "Low": 3}
    score_map = {"available": 0, "reserved": 1, "maintenance": 99, "occupied": 99}

    candidates = [p for p in available_platforms if p.get("status") == "available"]
    if not candidates:
        return {"success": False, "message": "All platforms occupied", "platform": None}

    # Prefer lower crowd level
    crowd_map = {"Low": 0, "Medium": 1, "High": 2}
    candidates.sort(key=lambda p: crowd_map.get(p.get("crowd_level", "Low"), 0))
    chosen = candidates[0]
    return {"success": True, "platform": chosen["platform_id"], "message": f"Platform {chosen['platform_id']} allocated to {train_id}"}


def check_route_conflict(train1: Dict, train2: Dict, track: str) -> Dict:
    """Detect route conflicts between two trains."""
    conflicts = []
    if train1.get("current_station") == train2.get("next_station") and train1.get("route") == train2.get("route"):
        conflicts.append(f"Head-on conflict risk on {track}")
    if train1.get("next_station") == train2.get("next_station"):
        conflicts.append(f"Platform conflict: both heading to {train1.get('next_station')}")
    if conflicts:
        return {"conflict": True, "warnings": conflicts, "resolution": f"Hold {train2.get('train_id')} for 5 minutes"}
    return {"conflict": False, "warnings": [], "resolution": "No conflict detected"}


def control_signal(signal_id: str, new_status: str, reason: str, detected_objects: List[str]) -> Dict:
    """Rule-based signal control."""
    safety_overrides = []
    if "person_on_track" in detected_objects or "Person on Track" in detected_objects:
        if new_status != "Red":
            new_status = "Red"
            safety_overrides.append("Forced RED: Person detected on track")
    if "obstacle_on_track" in detected_objects or "track_damage" in detected_objects:
        if new_status == "Green":
            new_status = "Red"
            safety_overrides.append("Forced RED: Obstacle/damage detected")
    return {
        "signal_id": signal_id,
        "new_status": new_status,
        "applied": True,
        "safety_overrides": safety_overrides,
        "message": f"Signal {signal_id} → {new_status}. Reason: {reason}",
    }
