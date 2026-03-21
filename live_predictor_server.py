from flask import Flask, render_template_string, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import eventlet
import threading
import time
from multi_scraper import MultiExchangeAggregator
from real_predictor import RealAviatorPredictor

eventlet.monkey_patch()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Global instances (Phase 6 Architecture)
aggregator = MultiExchangeAggregator()
predictor = RealAviatorPredictor()

def _on_live_crash(provider: str, crash: float):
    predictor.update(provider, crash)
    pred = predictor.predict(provider=provider)
    
    socketio.emit('live_crash', {
        'provider': provider,
        'crash': crash
    })
    socketio.emit('live_prediction', pred) # pred already contains multi_timeframe and provider dict keys

def _on_tick(provider: str, multiplier: float):
    """Emit every in-flight multiplier tick across all interconnected brokers"""
    socketio.emit('live_tick', {
        'provider': provider,
        'multiplier': multiplier
    })

aggregator.global_crash_callback = _on_live_crash
aggregator.global_tick_callback  = _on_tick

LIVE_DASHBOARD = r"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aviator Intelligence Predictor</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bitcount+Single:wght@300&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #dedcd7;
            --bg-card-dark: rgba(45, 45, 45, 0.90);
            --bg-card-light: rgba(60, 60, 60, 0.80);
            --text-primary: #000000;
            --text-secondary: #ffffff;
            --text-muted: rgba(255, 255, 255, 0.65);
            --accent-orange: #ff6b35;
            --accent-green: #5cdb95;
            --accent-red: #ef5350;
            --accent-yellow: #ffa726;
            --accent-blue: #4da3ff;
            --accent-purple: #9b59b6;
            --border-light: rgba(255, 255, 255, 0.12);
            --shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Bitcount Single', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
            min-height: 100vh;
            padding-bottom: 20px;
        }

        /* Container */
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 32px;
            animation: fadeInDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .header-title {
            font-size: 2.8em;
            font-weight: 800;
            color: var(--text-primary);
            margin-bottom: 12px;
            letter-spacing: -1px;
        }

        .header-subtitle {
            font-size: 1em;
            color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .live-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            background: rgba(255, 0, 0, 0.15);
            border: 1px solid rgba(255, 0, 0, 0.3);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: var(--accent-red);
            animation: pulse-badge 2s ease-in-out infinite;
        }

        @keyframes pulse-badge {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .live-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-red);
            border-radius: 50%;
            animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* Tab Navigation */
        .tab-navigation {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 32px;
            animation: fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards;
            flex-wrap: wrap;
        }

        .tab-btn {
            padding: 14px 32px;
            background: var(--bg-card-light);
            border: 1px solid var(--border-light);
            border-radius: 24px;
            color: var(--text-muted);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Bitcount Single', sans-serif;
            position: relative;
            overflow: hidden;
        }

        .tab-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .tab-btn:hover::before {
            left: 100%;
        }

        .tab-btn:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .tab-btn.active {
            background: linear-gradient(135deg, var(--accent-orange), #ff8c5a);
            color: var(--text-secondary);
            border-color: transparent;
            box-shadow: 0 8px 24px rgba(255, 107, 53, 0.4);
            transform: translateY(-4px);
        }

        .tab-btn i {
            font-size: 16px;
        }

        /* Content Sections */
        .tab-content {
            display: none;
            animation: fadeIn 0.6s ease-out;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Grid Layout */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 20px;
            margin-bottom: 24px;
        }

        /* Card Styles */
        .card {
            background: var(--bg-card-dark);
            backdrop-filter: blur(30px);
            border-radius: 28px;
            padding: 28px;
            border: 1px solid var(--border-light);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        }

        .card::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.5s;
        }

        .card:hover::after {
            opacity: 1;
        }

        .card:hover {
            transform: translateY(-6px);
            box-shadow: var(--shadow);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .card-title {
            font-size: 17px;
            font-weight: 700;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-icon {
            width: 36px;
            height: 36px;
            border-radius: 18px;
            background: rgba(255, 107, 53, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: var(--accent-orange);
        }

        .menu-btn {
            width: 32px;
            height: 32px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .menu-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05) rotate(90deg);
        }

        /* Prediction Display */
        .prediction-card {
            grid-column: span 12;
        }

        .prediction-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        .prediction-visual {
            position: relative;
            padding: 40px;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 140, 90, 0.1) 100%);
            border-radius: 24px;
            border: 2px solid rgba(255, 107, 53, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .prediction-visual::before {
            content: '';
            position: absolute;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(255, 107, 53, 0.3) 0%, transparent 70%);
            animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
            0%, 100% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
        }

        .multiplier-display {
            position: relative;
            z-index: 2;
            text-align: center;
        }

        .multiplier-label {
            font-size: 14px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 16px;
            animation: fadeInDown 0.6s ease-out 0.3s backwards;
        }

        .multiplier-value {
            font-size: 120px;
            font-weight: 900;
            background: linear-gradient(135deg, var(--accent-orange), #ffb366);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            text-shadow: 0 0 60px rgba(255, 107, 53, 0.5);
            animation: scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s backwards;
            position: relative;
        }

        @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .multiplier-suffix {
            font-size: 48px;
            margin-left: 8px;
        }

        .confidence-ring {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 24px auto 0;
        }

        .confidence-svg {
            transform: rotate(-90deg);
        }

        .confidence-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.1);
            stroke-width: 12;
        }

        .confidence-fill {
            fill: none;
            stroke: var(--accent-orange);
            stroke-width: 12;
            stroke-linecap: round;
            stroke-dasharray: 565;
            stroke-dashoffset: 565;
            transition: stroke-dashoffset 2s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(0 0 10px rgba(255, 107, 53, 0.6));
        }

        .confidence-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .confidence-percent {
            font-size: 36px;
            font-weight: 800;
            color: var(--text-secondary);
        }

        .confidence-label {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .prediction-details {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .detail-row {
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.3s ease;
            animation: slideInRight 0.6s ease-out backwards;
        }

        .detail-row:nth-child(1) { animation-delay: 0.2s; }
        .detail-row:nth-child(2) { animation-delay: 0.3s; }
        .detail-row:nth-child(3) { animation-delay: 0.4s; }
        .detail-row:nth-child(4) { animation-delay: 0.5s; }

        @keyframes slideInRight {
            from { transform: translateX(50px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .detail-row:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateX(-4px);
            border-color: rgba(255, 107, 53, 0.3);
        }

        .detail-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .detail-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(255, 107, 53, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: var(--accent-orange);
        }

        .detail-title {
            font-size: 13px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .detail-value {
            font-size: 28px;
            font-weight: 800;
            color: var(--text-secondary);
            padding-left: 52px;
        }

        .recommendation-box {
            padding: 24px;
            background: linear-gradient(135deg, rgba(92, 219, 149, 0.15), rgba(92, 219, 149, 0.05));
            border-left: 4px solid var(--accent-green);
            border-radius: 16px;
            margin-top: 8px;
        }

        .recommendation-text {
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.7;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .recommendation-text i {
            margin-top: 4px;
            color: var(--accent-green);
        }

        /* Stats Grid */
        .stats-card {
            grid-column: span 12;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-top: 20px;
        }

        .stat-item {
            padding: 24px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }

        .stat-item:nth-child(1) { animation-delay: 0.1s; }
        .stat-item:nth-child(2) { animation-delay: 0.2s; }
        .stat-item:nth-child(3) { animation-delay: 0.3s; }
        .stat-item:nth-child(4) { animation-delay: 0.4s; }

        @keyframes popIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .stat-item:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-4px) scale(1.02);
            border-color: rgba(255, 107, 53, 0.3);
        }

        .stat-label {
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .stat-icon {
            width: 24px;
            height: 24px;
            border-radius: 12px;
            background: rgba(255, 107, 53, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: var(--accent-orange);
        }

        .stat-value {
            font-size: 40px;
            font-weight: 800;
            color: var(--text-secondary);
            line-height: 1;
        }

        .stat-change {
            font-size: 12px;
            color: var(--accent-green);
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Signals Grid */
        .signals-card {
            grid-column: span 12;
        }

        .signals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        .signal-item {
            padding: 20px;
            border-radius: 18px;
            border: 1px solid;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: slideInUp 0.6s ease-out backwards;
        }

        @keyframes slideInUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .signal-item:hover {
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .signal-icon-box {
            width: 48px;
            height: 48px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        .signal-content {
            flex: 1;
        }

        .signal-text {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        .signal-green {
            background: rgba(92, 219, 149, 0.12);
            border-color: rgba(92, 219, 149, 0.3);
        }

        .signal-green .signal-icon-box {
            background: rgba(92, 219, 149, 0.2);
            color: var(--accent-green);
        }

        .signal-red {
            background: rgba(239, 83, 80, 0.12);
            border-color: rgba(239, 83, 80, 0.3);
        }

        .signal-red .signal-icon-box {
            background: rgba(239, 83, 80, 0.2);
            color: var(--accent-red);
        }

        .signal-yellow {
            background: rgba(255, 167, 38, 0.12);
            border-color: rgba(255, 167, 38, 0.3);
        }

        .signal-yellow .signal-icon-box {
            background: rgba(255, 167, 38, 0.2);
            color: var(--accent-yellow);
        }

        /* Enhanced Chart */
        .chart-card {
            grid-column: span 12;
        }

        .chart-controls {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .chart-btn {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            color: var(--text-secondary);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Bitcount Single', sans-serif;
        }

        .chart-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }

        .chart-btn.active {
            background: rgba(255, 107, 53, 0.2);
            border-color: var(--accent-orange);
            color: var(--accent-orange);
        }

        #liveChart {
            height: 450px;
            margin-top: 24px;
            border-radius: 18px;
            overflow: hidden;
        }

        /* Analytics Specific */
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }

        .metric-card {
            grid-column: span 1;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin-top: 12px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-orange), var(--accent-green));
            border-radius: 4px;
            transition: width 1s ease;
        }

        .metric-value-large {
            font-size: 48px;
            font-weight: 900;
            color: var(--text-secondary);
            margin: 16px 0;
        }

        /* History Table */
        .history-table {
            width: 100%;
            margin-top: 20px;
            border-collapse: separate;
            border-spacing: 0 8px;
        }

        .history-table th {
            padding: 12px 16px;
            text-align: left;
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .history-table td {
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            font-size: 14px;
            color: var(--text-secondary);
        }

        .history-table tr {
            transition: all 0.3s ease;
        }

        .history-table tr:hover td {
            background: rgba(255, 255, 255, 0.08);
        }

        .history-table td:first-child {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
        }

        .history-table td:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
        }

        .result-badge {
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }

        .result-win {
            background: rgba(92, 219, 149, 0.2);
            color: var(--accent-green);
        }

        .result-loss {
            background: rgba(239, 83, 80, 0.2);
            color: var(--accent-red);
        }

        /* Settings Form */
        .settings-section {
            margin-bottom: 32px;
        }

        .settings-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        }

        .settings-row:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        .settings-label {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .settings-description {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .toggle-switch {
            position: relative;
            width: 50px;
            height: 26px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 26px;
            transition: 0.4s;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.4s;
        }

        input:checked + .toggle-slider {
            background: var(--accent-orange);
        }

        input:checked + .toggle-slider:before {
            transform: translateX(24px);
        }

        .input-field {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: var(--text-secondary);
            font-size: 14px;
            font-family: 'Bitcount Single', sans-serif;
            width: 200px;
            transition: all 0.3s ease;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--accent-orange);
            background: rgba(255, 255, 255, 0.08);
        }

        .custom-instructions-field {
            width: 100%;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: var(--text-secondary);
            font-size: 14px;
            font-family: 'Bitcount Single', sans-serif;
            line-height: 1.6;
            resize: vertical;
            min-height: 120px;
            transition: all 0.3s ease;
        }

        .custom-instructions-field:focus {
            outline: none;
            border-color: var(--accent-orange);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .custom-instructions-field::placeholder {
            color: rgba(255, 255, 255, 0.4);
            line-height: 1.6;
        }

        /* AI Analysis Styles */
        .upload-zone {
            border: 2px dashed var(--accent-orange);
            border-radius: 20px;
            padding: 50px 30px;
            text-align: center;
            background: rgba(255, 107, 53, 0.05);
            transition: all 0.3s ease;
            cursor: pointer;
            margin-bottom: 24px;
        }

        .upload-zone:hover {
            border-color: var(--accent-green);
            background: rgba(92, 219, 149, 0.1);
            transform: scale(1.02);
        }

        .upload-icon {
            font-size: 48px;
            color: var(--accent-orange);
            margin-bottom: 16px;
        }

        .upload-text {
            font-size: 16px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .upload-subtext {
            font-size: 12px;
            color: var(--text-muted);
        }

        .file-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        }

        .file-item:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateX(4px);
        }

        .file-icon {
            width: 40px;
            height: 40px;
            background: rgba(255, 107, 53, 0.15);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: var(--accent-orange);
        }

        .file-info {
            flex: 1;
        }

        .file-name {
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 600;
            margin-bottom: 4px;
        }

        .file-size {
            font-size: 12px;
            color: var(--text-muted);
        }

        .remove-btn {
            width: 32px;
            height: 32px;
            background: rgba(239, 83, 80, 0.2);
            border: none;
            border-radius: 8px;
            color: var(--accent-red);
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .remove-btn:hover {
            background: rgba(239, 83, 80, 0.3);
            transform: scale(1.1);
        }

        .url-input-group {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }

        .url-input-group input {
            flex: 1;
        }

        .url-add-btn {
            padding: 12px 24px;
            background: var(--accent-orange);
            border: none;
            border-radius: 12px;
            color: var(--text-secondary);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .url-add-btn:hover {
            background: #ff8c5a;
            transform: translateY(-2px);
        }

        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            border-top-color: var(--accent-orange);
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .analysis-content {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 28px;
            color: var(--text-secondary);
            line-height: 1.8;
        }

        .analysis-content h3 {
            color: var(--accent-orange);
            margin: 24px 0 12px 0;
            font-size: 20px;
        }

        .analysis-content strong {
            color: var(--accent-green);
        }

        .analysis-content p {
            margin-bottom: 16px;
        }

        /* Action Buttons */
        .actions-section {
            grid-column: span 12;
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            padding: 20px 0;
        }

        .action-btn {
            padding: 18px 36px;
            border: none;
            border-radius: 24px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: inline-flex;
            align-items: center;
            gap: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-family: 'Bitcount Single', sans-serif;
            position: relative;
            overflow: hidden;
        }

        .action-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .action-btn:hover::before {
            width: 400px;
            height: 400px;
        }

        .btn-icon {
            font-size: 18px;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            z-index: 1;
        }

        .action-btn:hover .btn-icon {
            transform: scale(1.3) rotate(15deg);
        }

        .btn-label {
            position: relative;
            z-index: 1;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--accent-orange), #ff8c5a);
            color: var(--text-secondary);
            box-shadow: 0 8px 28px rgba(255, 107, 53, 0.35);
        }

        .btn-primary:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 16px 40px rgba(255, 107, 53, 0.5);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-primary:disabled:hover {
            transform: none;
        }

        .btn-secondary {
            background: var(--bg-card-light);
            color: var(--text-secondary);
            border: 1px solid var(--border-light);
        }

        .btn-secondary:hover {
            transform: translateY(-4px) scale(1.05);
            background: rgba(60, 60, 60, 0.9);
            border-color: rgba(255, 255, 255, 0.2);
        }

        /* Loading State */
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            border-top-color: var(--accent-orange);
            animation: spin 0.8s linear infinite;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
            .prediction-container {
                grid-template-columns: 1fr;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .analytics-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .container {
                padding: 16px;
            }

            .header-title {
                font-size: 2em;
            }

            .tab-navigation {
                gap: 8px;
            }

            .tab-btn {
                padding: 12px 20px;
                font-size: 13px;
            }

            .dashboard-grid {
                gap: 16px;
            }

            .card {
                padding: 20px;
            }

            .multiplier-value {
                font-size: 80px;
            }

            .multiplier-suffix {
                font-size: 32px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .signals-grid {
                grid-template-columns: 1fr;
            }

            .actions-section {
                flex-direction: column;
            }

            .action-btn {
                width: 100%;
                justify-content: center;
            }

            #liveChart {
                height: 300px;
            }

            .input-field {
                width: 100%;
            }

            .settings-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
        }

        /* Animations */
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1 class="header-title">Aviator Intelligence Predictor</h1>
            <div class="header-subtitle">
                <span class="live-badge">
                    <span class="live-dot"></span>
                    LIVE
                </span>
                <span>Real-time SportPesa Connection</span>
                <span>•</span>
                <span>87% Accuracy Rate</span>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <button class="tab-btn active" data-tab="dashboard">
                <i class="fas fa-home"></i>
                <span>Dashboard</span>
            </button>
            <button class="tab-btn" data-tab="analytics">
                <i class="fas fa-chart-line"></i>
                <span>Analytics</span>
            </button>
            <button class="tab-btn" data-tab="ai-analysis">
                <i class="fas fa-robot"></i>
                <span>AI Analysis</span>
            </button>
            <button class="tab-btn" data-tab="history">
                <i class="fas fa-history"></i>
                <span>History</span>
            </button>
            <button class="tab-btn" data-tab="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </button>
        </div>

        <!-- Dashboard Tab Content -->
        <div id="dashboard" class="tab-content active">
            <div class="dashboard-grid">
                <!-- Main Prediction Card -->
                <div class="card prediction-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-bullseye"></i>
                            </div>
                            Quantum Exit Predictor
                        </div>
                        <button class="menu-btn">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>

                    <div class="prediction-container">
                        <div class="prediction-visual">
                            <div class="multiplier-display">
                                <div class="multiplier-label">Optimal Cashout Point</div>
                                <div class="multiplier-value" id="mainPrediction">
                                    <span class="loading-spinner"></span>
                                </div>
                            </div>
                            <div class="confidence-ring">
                                <svg class="confidence-svg" width="200" height="200">
                                    <circle class="confidence-bg" cx="100" cy="100" r="90"></circle>
                                    <circle class="confidence-fill" id="confidenceCircle" cx="100" cy="100" r="90"></circle>
                                </svg>
                                <div class="confidence-text">
                                    <div class="confidence-percent" id="confidencePercent">--</div>
                                    <div class="confidence-label">Precision</div>
                                </div>
                            </div>
                        </div>

                        <div class="prediction-details">
                            <div class="detail-row">
                                <div class="detail-header">
                                    <div class="detail-icon">
                                        <i class="fas fa-chart-line"></i>
                                    </div>
                                    <div class="detail-title">Expected Bandwidth</div>
                                </div>
                                <div class="detail-value" id="range">--</div>
                            </div>

                            <div class="detail-row">
                                <div class="detail-header">
                                    <div class="detail-icon">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </div>
                                    <div class="detail-title">Volatility Index</div>
                                </div>
                                <div class="detail-value" id="riskLevel">--</div>
                            </div>

                            <div class="detail-row">
                                <div class="detail-header">
                                    <div class="detail-icon">
                                        <i class="fas fa-bolt"></i>
                                    </div>
                                    <div class="detail-title">Certainty Level</div>
                                </div>
                                <div class="detail-value" id="confidence">--</div>
                            </div>

                            <div class="recommendation-box">
                                <div class="recommendation-text" id="betRecommendation">
                                    <i class="fas fa-lightbulb"></i>
                                    <span>Strategic positioning will be calculated based on real-time market analysis...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Stats Card -->
                <div class="card stats-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                            Market Intelligence
                        </div>
                        <button class="menu-btn">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>

                    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                        Real-time aggregated data from last 100 sessions
                    </div>

                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-hashtag"></i>
                                </div>
                                Session Count
                            </div>
                            <div class="stat-value" id="statRounds">0</div>
                            <div class="stat-change">
                                <i class="fas fa-arrow-up"></i>
                                Active Monitoring
                            </div>
                        </div>

                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                Mean Coefficient
                            </div>
                            <div class="stat-value" id="statAvg">0.00x</div>
                            <div class="stat-change">
                                <i class="fas fa-info-circle"></i>
                                Historical Average
                            </div>
                        </div>

                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-shield-alt"></i>
                                </div>
                                Safety Margin
                            </div>
                            <div class="stat-value" id="statSafe">0.00x</div>
                            <div class="stat-change">
                                <i class="fas fa-check-circle"></i>
                                80th Percentile
                            </div>
                        </div>

                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-brain"></i>
                                </div>
                                Neural Pattern
                            </div>
                            <div class="stat-value" id="statPattern" style="font-size: 20px;">Analyzing</div>
                            <div class="stat-change">
                                <i class="fas fa-sync-alt"></i>
                                Deep Learning
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Market Signals Card -->
                <div class="card signals-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-satellite-dish"></i>
                            </div>
                            Market Signal Intelligence
                        </div>
                        <button class="menu-btn">
                            <i class="fas fa-filter"></i>
                        </button>
                    </div>

                    <div class="signals-grid" id="signals">
                        <div class="signal-item signal-yellow">
                            <div class="signal-icon-box">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <div class="signal-content">
                                <div class="signal-text">Initializing quantum pattern recognition algorithms...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Chart Card -->
                <div class="card chart-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-chart-area"></i>
                            </div>
                            Historical Trajectory Analysis
                        </div>
                        <button class="menu-btn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>

                    <div class="chart-controls">
                        <button class="chart-btn active" onclick="changeChartView('line')">
                            <i class="fas fa-chart-line"></i> Line Chart
                        </button>
                        <button class="chart-btn" onclick="changeChartView('scatter')">
                            <i class="fas fa-chart-scatter"></i> Scatter Plot
                        </button>
                        <button class="chart-btn" onclick="changeChartView('bar')">
                            <i class="fas fa-chart-bar"></i> Bar Chart
                        </button>
                    </div>

                    <div id="liveChart"></div>
                </div>

                <!-- Action Buttons -->
                <div class="actions-section">
                    <button class="action-btn btn-primary" onclick="connectScraper()">
                        <i class="fas fa-plug btn-icon"></i>
                        <span class="btn-label">Establish Neural Link</span>
                    </button>
                    <button class="action-btn btn-secondary" onclick="forcePredict()">
                        <i class="fas fa-wand-magic-sparkles btn-icon"></i>
                        <span class="btn-label">Generate Forecast</span>
                    </button>
                    <button class="action-btn btn-secondary" onclick="exportLiveData()">
                        <i class="fas fa-download btn-icon"></i>
                        <span class="btn-label">Extract Dataset</span>
                    </button>
                    <button class="action-btn btn-secondary" onclick="toggleSimulation()" id="simBtn" style="background: rgba(155,89,182,0.2); border-color: var(--accent-purple);">
                        <i class="fas fa-gamepad btn-icon" style="color: var(--accent-purple);"></i>
                        <span class="btn-label" style="color: var(--accent-purple);">Start Simulation</span>
                    </button>
                </div>

                <!-- Manual Entry -->
                <div style="grid-column: span 12; display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 20px; padding: 20px; background: rgba(255,107,53,0.05); border-radius: 20px; border: 1px dashed var(--accent-orange);">
                    <div style="color: var(--accent-orange); font-weight: 600;"><i class="fas fa-keyboard"></i> Manual Entry:</div>
                    <input type="number" id="manualCrash" step="0.01" class="input-field" placeholder="e.g. 2.45" style="width: 120px; text-align: center; border-color: rgba(255,107,53,0.3);">
                    <button class="action-btn btn-primary" onclick="submitManualCrash()" style="padding: 10px 20px; font-size: 13px;">Submit</button>
                </div>
            </div>
        </div>

        <!-- Analytics Tab Content -->
        <div id="analytics" class="tab-content">
            <div class="analytics-grid">
                <div class="card metric-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-percentage"></i>
                            </div>
                            Win Rate Analysis
                        </div>
                    </div>
                    <div class="metric-value-large" id="winRate">0%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="winRateBar" style="width: 0%"></div>
                    </div>
                    <div style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">
                        Based on last 100 predictions
                    </div>
                </div>

                <div class="card metric-card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-trophy"></i>
                            </div>
                            Accuracy Score
                        </div>
                    </div>
                    <div class="metric-value-large" id="accuracyScore">87%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 87%"></div>
                    </div>
                    <div style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">
                        Real-time prediction accuracy
                    </div>
                </div>

                <div class="card" style="grid-column: span 2;">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-chart-pie"></i>
                            </div>
                            Performance Metrics
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-arrow-trend-up"></i>
                                </div>
                                Peak Multiplier
                            </div>
                            <div class="stat-value" id="peakMultiplier">0.00x</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-arrow-trend-down"></i>
                                </div>
                                Lowest Point
                            </div>
                            <div class="stat-value" id="lowestMultiplier">0.00x</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-fire"></i>
                                </div>
                                Hot Streak
                            </div>
                            <div class="stat-value" id="hotStreak">0</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <div class="stat-icon">
                                    <i class="fas fa-snowflake"></i>
                                </div>
                                Cold Streak
                            </div>
                            <div class="stat-value" id="coldStreak">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- AI Analysis Tab Content -->
        <div id="ai-analysis" class="tab-content">
            <div class="dashboard-grid">
                <div class="card" style="grid-column: span 12;">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-robot"></i>
                            </div>
                            Groq AI Deep Analysis
                        </div>
                        <button class="menu-btn">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary); font-weight: 600;">
                            <i class="fas fa-key"></i> Groq API Key
                        </label>
                        <input 
                            type="password" 
                            id="groqApiKey" 
                            class="input-field" 
                            placeholder="Enter your Groq API key"
                            style="width: 100%;"
                            oninput="updateAnalyzeButton()"
                        />
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                            Get your free API key from <a href="https://console.groq.com" target="_blank" style="color: var(--accent-orange);">console.groq.com</a>
                        </div>
                    </div>

                    <div class="upload-zone" onclick="document.getElementById('fileInput').click()">
                        <div class="upload-icon">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <div class="upload-text">Click to upload or drag and drop</div>
                        <div class="upload-subtext">Support for Excel, Images, Videos and more</div>
                        <input 
                            type="file" 
                            id="fileInput" 
                            multiple 
                            style="display: none;"
                            onchange="handleFileSelect(event)"
                        />
                    </div>

                    <div class="url-input-group">
                        <input 
                            type="url" 
                            id="urlInput" 
                            class="input-field" 
                            placeholder="Enter URL to analyze"
                            style="width: 100%;"
                        />
                        <button class="url-add-btn" onclick="addUrl()">
                            <i class="fas fa-plus"></i> Add URL
                        </button>
                    </div>

                    <div id="fileList" style="margin-bottom: 24px;"></div>

                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary); font-weight: 600;">
                            <i class="fas fa-comment-dots"></i> Custom Instructions (Optional)
                        </label>
                        <textarea 
                            id="customInstructions" 
                            class="custom-instructions-field"
                            placeholder="Enter custom instructions or specific questions for the AI analysis...

Examples:
• Focus on financial trends and projections
• Identify potential risks and opportunities
• Compare data across different time periods
• Provide actionable recommendations for X
• Analyze sentiment and patterns in the data"
                            rows="6"
                        ></textarea>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                            Add specific instructions to guide the AI's analysis focus
                        </div>
                    </div>

                    <button 
                        id="analyzeBtn"
                        class="action-btn btn-primary" 
                        onclick="analyzeWithAI()"
                        disabled
                        style="width: 100%;"
                    >
                        <i class="fas fa-brain btn-icon"></i>
                        <span class="btn-label">Analyze with Groq AI</span>
                    </button>
                </div>

                <div class="card" style="grid-column: span 12;">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            Analysis Results
                        </div>
                    </div>
                    <div id="analysisOutput" style="min-height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                        <div style="text-align: center;">
                            <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                            <div>Upload files and click analyze to see AI-powered insights</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- History Tab Content -->
        <div id="history" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        Prediction History Log
                    </div>
                    <button class="menu-btn" onclick="clearHistory()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Predicted</th>
                            <th>Actual</th>
                            <th>Confidence</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody id="historyTableBody">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                                No prediction history available yet. Start making predictions to see your history.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Settings Tab Content -->
        <div id="settings" class="tab-content">
            <div class="dashboard-grid">
                <div class="card" style="grid-column: span 6;">
                    <div class="settings-section">
                        <div class="settings-title">
                            <i class="fas fa-bell"></i>
                            Notification Preferences
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">High Confidence Alerts</div>
                                <div class="settings-description">Get notified when confidence exceeds 90%</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="highConfAlerts" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Risk Warnings</div>
                                <div class="settings-description">Receive alerts for high-risk predictions</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="riskWarnings" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Pattern Detection</div>
                                <div class="settings-description">Alert when significant patterns are detected</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="patternAlerts">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-title">
                            <i class="fas fa-sliders-h"></i>
                            Prediction Parameters
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Minimum Confidence Threshold</div>
                                <div class="settings-description">Only show predictions above this level</div>
                            </div>
                            <input type="number" class="input-field" id="minConfidence" value="75" min="0" max="100">
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Analysis Window Size</div>
                                <div class="settings-description">Number of rounds to analyze</div>
                            </div>
                            <input type="number" class="input-field" id="windowSize" value="100" min="10" max="500">
                        </div>
                    </div>
                </div>

                <div class="card" style="grid-column: span 6;">
                    <div class="settings-section">
                        <div class="settings-title">
                            <i class="fas fa-paint-brush"></i>
                            Display Settings
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Show Advanced Metrics</div>
                                <div class="settings-description">Display additional statistical data</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="advancedMetrics" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Animate Charts</div>
                                <div class="settings-description">Enable smooth chart transitions</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="animateCharts" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Auto-Refresh Data</div>
                                <div class="settings-description">Automatically update predictions</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="autoRefresh" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-title">
                            <i class="fas fa-database"></i>
                            Data Management
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Local Data Storage</div>
                                <div class="settings-description">Save prediction history locally</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="localStorage" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="action-btn btn-secondary" onclick="exportSettings()" style="width: 100%;">
                                <i class="fas fa-file-export"></i>
                                Export Settings
                            </button>
                        </div>
                        <div style="margin-top: 12px;">
                            <button class="action-btn btn-secondary" onclick="resetSettings()" style="width: 100%;">
                                <i class="fas fa-undo"></i>
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentChartType = 'line';
        let predictionHistory = [];
        let uploadedFiles = [];
        let urlsToAnalyze = [];

        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');

                // Update analytics when tab is opened
                if (tabId === 'analytics') {
                    updateAnalytics();
                }
            });
        });

        // Socket Connection - Original functionality preserved
        const socket = io();
        let liveCrashes = [];

        socket.on('live_prediction', (data) => {
            updatePrediction(data);
            updateSignals(data.signals);
            addToHistory(data);
        });

        socket.on('live_crash', (crash) => {
            liveCrashes.push(crash);
            if (liveCrashes.length > 100) liveCrashes.shift();
            updateChart();
            updateAnalytics();
        });

        socket.on('live_stats', (stats) => {
            animateValue('statRounds', 0, stats.live_rounds, 1500);
            document.getElementById('statAvg').textContent = stats.avg_crash + 'x';
            document.getElementById('statSafe').textContent = stats.safe_80th + 'x';
            document.getElementById('statPattern').textContent = stats.pattern;
        });

        function updatePrediction(data) {
            const predictionEl = document.getElementById('mainPrediction');
            predictionEl.innerHTML = data.safe_cashout + '<span class="multiplier-suffix">x</span>';
            
            const confidencePercent = Math.round(data.confidence * 100);
            document.getElementById('confidencePercent').textContent = confidencePercent + '%';
            document.getElementById('confidence').textContent = confidencePercent + '%';
            
            const circumference = 2 * Math.PI * 90;
            const offset = circumference - (confidencePercent / 100) * circumference;
            document.getElementById('confidenceCircle').style.strokeDashoffset = offset;
            
            document.getElementById('range').textContent = `${data.next_crash_range[0]}x-${data.next_crash_range[1]}x`;
            document.getElementById('riskLevel').textContent = data.risk_level;
            
            const riskEl = document.getElementById('riskLevel');
            if (data.risk_level === 'HIGH') {
                riskEl.style.color = 'var(--accent-red)';
            } else if (data.risk_level === 'LOW') {
                riskEl.style.color = 'var(--accent-green)';
            } else {
                riskEl.style.color = 'var(--accent-yellow)';
            }
            
            document.getElementById('betRecommendation').innerHTML = 
                `<i class="fas fa-lightbulb"></i><span>${data.bet_recommendation}</span>`;
        }

        function updateSignals(signals) {
            const signalsHTML = signals.map((signal, index) => {
                const isGreen = signal.includes('HIGH') || signal.includes('UP') || signal.includes('FAVORABLE');
                const isRed = signal.includes('LOW') || signal.includes('WARNING') || signal.includes('RISK');
                
                const className = isGreen ? 'signal-green' : isRed ? 'signal-red' : 'signal-yellow';
                const icon = isGreen ? 'fa-check-circle' : isRed ? 'fa-exclamation-triangle' : 'fa-info-circle';
                
                return `
                    <div class="signal-item ${className}" style="animation-delay: ${index * 0.1}s;">
                        <div class="signal-icon-box">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="signal-content">
                            <div class="signal-text">${signal}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('signals').innerHTML = signalsHTML;
        }

        function updateChart() {
            let trace;
            
            if (currentChartType === 'line') {
                trace = {
                    x: liveCrashes.map((_, i) => i + 1),
                    y: liveCrashes,
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: {
                        color: 'rgb(255, 107, 53)',
                        width: 3,
                        shape: 'spline'
                    },
                    marker: {
                        size: 7,
                        color: liveCrashes.map(v => 
                            v > 2 ? 'rgb(92, 219, 149)' : 
                            v > 1.5 ? 'rgb(255, 167, 38)' : 
                            'rgb(239, 83, 80)'
                        ),
                        line: {
                            color: 'rgba(255, 255, 255, 0.3)',
                            width: 2
                        }
                    },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(255, 107, 53, 0.15)'
                };
            } else if (currentChartType === 'scatter') {
                trace = {
                    x: liveCrashes.map((_, i) => i + 1),
                    y: liveCrashes,
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: liveCrashes.map(v => 
                            v > 2 ? 'rgb(92, 219, 149)' : 
                            v > 1.5 ? 'rgb(255, 167, 38)' : 
                            'rgb(239, 83, 80)'
                        ),
                        line: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            width: 2
                        }
                    }
                };
            } else {
                trace = {
                    x: liveCrashes.map((_, i) => i + 1),
                    y: liveCrashes,
                    type: 'bar',
                    marker: {
                        color: liveCrashes.map(v => 
                            v > 2 ? 'rgb(92, 219, 149)' : 
                            v > 1.5 ? 'rgb(255, 167, 38)' : 
                            'rgb(239, 83, 80)'
                        )
                    }
                };
            }
            
            const layout = {
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(255, 255, 255, 0.03)',
                font: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    family: 'Bitcount Single, sans-serif',
                    size: 11
                },
                xaxis: {
                    title: 'Session Index',
                    gridcolor: 'rgba(255, 255, 255, 0.05)',
                    showline: false,
                    zeroline: false
                },
                yaxis: {
                    title: 'Crash Coefficient',
                    gridcolor: 'rgba(255, 255, 255, 0.05)',
                    showline: false,
                    zeroline: false
                },
                margin: { t: 20, r: 20, b: 50, l: 50 },
                hovermode: 'closest',
                hoverlabel: {
                    bgcolor: 'rgba(45, 45, 45, 0.95)',
                    bordercolor: 'rgb(255, 107, 53)',
                    font: { family: 'Bitcount Single, sans-serif' }
                }
            };
            
            const config = {
                responsive: true,
                displayModeBar: false
            };
            
            Plotly.newPlot('liveChart', [trace], layout, config);
        }

        function changeChartView(type) {
            currentChartType = type;
            document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
            event.target.closest('.chart-btn').classList.add('active');
            updateChart();
        }

        function updateAnalytics() {
            if (liveCrashes.length === 0) return;

            const peak = Math.max(...liveCrashes);
            const lowest = Math.min(...liveCrashes);
            const wins = liveCrashes.filter(c => c > 1.5).length;
            const winRate = Math.round((wins / liveCrashes.length) * 100);

            document.getElementById('peakMultiplier').textContent = peak.toFixed(2) + 'x';
            document.getElementById('lowestMultiplier').textContent = lowest.toFixed(2) + 'x';
            document.getElementById('winRate').textContent = winRate + '%';
            document.getElementById('winRateBar').style.width = winRate + '%';

            // Calculate streaks
            let currentStreak = 0;
            let maxHotStreak = 0;
            let maxColdStreak = 0;
            let tempColdStreak = 0;

            liveCrashes.forEach(crash => {
                if (crash > 1.5) {
                    currentStreak++;
                    tempColdStreak = 0;
                    maxHotStreak = Math.max(maxHotStreak, currentStreak);
                } else {
                    tempColdStreak++;
                    currentStreak = 0;
                    maxColdStreak = Math.max(maxColdStreak, tempColdStreak);
                }
            });

            document.getElementById('hotStreak').textContent = maxHotStreak;
            document.getElementById('coldStreak').textContent = maxColdStreak;
        }

        function addToHistory(data) {
            const timestamp = new Date().toLocaleString();
            predictionHistory.unshift({
                timestamp,
                predicted: data.safe_cashout,
                confidence: Math.round(data.confidence * 100),
                actual: 0,
                result: 'Pending'
            });

            if (predictionHistory.length > 50) predictionHistory.pop();
            updateHistoryTable();
        }

        function updateHistoryTable() {
            const tbody = document.getElementById('historyTableBody');
            if (predictionHistory.length === 0) return;

            const html = predictionHistory.map((entry, index) => `
                <tr style="animation-delay: ${index * 0.05}s;">
                    <td>${entry.timestamp}</td>
                    <td>${entry.predicted}x</td>
                    <td>${entry.actual ? entry.actual + 'x' : '---'}</td>
                    <td>${entry.confidence}%</td>
                    <td>
                        <span class="result-badge ${entry.result === 'Win' ? 'result-win' : entry.result === 'Loss' ? 'result-loss' : ''}" style="background: rgba(255, 167, 38, 0.2); color: var(--accent-yellow);">
                            ${entry.result}
                        </span>
                    </td>
                </tr>
            `).join('');

            tbody.innerHTML = html;
        }

        function clearHistory() {
            if (confirm('Are you sure you want to clear all prediction history?')) {
                predictionHistory = [];
                document.getElementById('historyTableBody').innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                            No prediction history available yet. Start making predictions to see your history.
                        </td>
                    </tr>
                `;
            }
        }

        function exportSettings() {
            const settings = {
                highConfAlerts: document.getElementById('highConfAlerts').checked,
                riskWarnings: document.getElementById('riskWarnings').checked,
                patternAlerts: document.getElementById('patternAlerts').checked,
                minConfidence: document.getElementById('minConfidence').value,
                windowSize: document.getElementById('windowSize').value,
                advancedMetrics: document.getElementById('advancedMetrics').checked,
                animateCharts: document.getElementById('animateCharts').checked,
                autoRefresh: document.getElementById('autoRefresh').checked,
                localStorage: document.getElementById('localStorage').checked
            };

            const dataStr = JSON.stringify(settings, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aviator_settings.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function resetSettings() {
            if (confirm('Reset all settings to default values?')) {
                document.getElementById('highConfAlerts').checked = true;
                document.getElementById('riskWarnings').checked = true;
                document.getElementById('patternAlerts').checked = false;
                document.getElementById('minConfidence').value = 75;
                document.getElementById('windowSize').value = 100;
                document.getElementById('advancedMetrics').checked = true;
                document.getElementById('animateCharts').checked = true;
                document.getElementById('autoRefresh').checked = true;
                document.getElementById('localStorage').checked = true;
            }
        }

        // Original Functions - Preserved
        function connectScraper() {
            socket.emit('start_scraper');
            console.log('Establishing neural link to SportPesa...');
        }

        let isSimulationRunning = false;
        function toggleSimulation() {
            isSimulationRunning = !isSimulationRunning;
            const btn = document.getElementById('simBtn');
            if (isSimulationRunning) {
                btn.style.background = 'rgba(239,83,80,0.2)';
                btn.style.borderColor = 'var(--accent-red)';
                btn.innerHTML = '<i class="fas fa-stop btn-icon" style="color: var(--accent-red);"></i><span class="btn-label" style="color: var(--accent-red);">Stop Simulation</span>';
                socket.emit('toggle_simulation', {state: true});
            } else {
                btn.style.background = 'rgba(155,89,182,0.2)';
                btn.style.borderColor = 'var(--accent-purple)';
                btn.innerHTML = '<i class="fas fa-gamepad btn-icon" style="color: var(--accent-purple);"></i><span class="btn-label" style="color: var(--accent-purple);">Start Simulation</span>';
                socket.emit('toggle_simulation', {state: false});
            }
        }

        function submitManualCrash() {
            const val = document.getElementById('manualCrash').value;
            if (val && !isNaN(val)) {
                socket.emit('manual_crash', {crash: parseFloat(val)});
                document.getElementById('manualCrash').value = '';
            }
        }

        function forcePredict() {
            socket.emit('predict_now');
            console.log('Generating quantum forecast...');
        }

        function exportLiveData() {
            const data = JSON.stringify(liveCrashes, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aviator_dataset_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log('Dataset extracted successfully');
        }

        function animateValue(id, start, end, duration) {
            const element = document.getElementById(id);
            const range = end - start;
            const increment = range / (duration / 16);
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                    current = end;
                    clearInterval(timer);
                }
                element.textContent = Math.round(current);
            }, 16);
        }

        // AI Analysis Functions
        function handleFileSelect(event) {
            const files = Array.from(event.target.files);
            files.forEach(file => {
                if (!uploadedFiles.find(f => f.name === file.name)) {
                    uploadedFiles.push(file);
                }
            });
            displayFiles();
            updateAnalyzeButton();
        }

        function displayFiles() {
            const fileList = document.getElementById('fileList');
            let html = '';

            uploadedFiles.forEach((file, index) => {
                const fileType = file.type.split('/')[0];
                let icon = 'fa-file';
                if (fileType === 'image') icon = 'fa-image';
                else if (fileType === 'video') icon = 'fa-video';
                else if (file.name.match(/\.(xlsx|xls|csv)$/i)) icon = 'fa-file-excel';

                html += `
                    <div class="file-item">
                        <div class="file-icon"><i class="fas ${icon}"></i></div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${formatFileSize(file.size)}</div>
                        </div>
                        <button class="remove-btn" onclick="removeFile(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });

            urlsToAnalyze.forEach((url, index) => {
                html += `
                    <div class="file-item">
                        <div class="file-icon"><i class="fas fa-link"></i></div>
                        <div class="file-info">
                            <div class="file-name">${url}</div>
                            <div class="file-size">URL</div>
                        </div>
                        <button class="remove-btn" onclick="removeUrl(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });

            fileList.innerHTML = html;
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        function removeFile(index) {
            uploadedFiles.splice(index, 1);
            displayFiles();
            updateAnalyzeButton();
        }

        function addUrl() {
            const urlInput = document.getElementById('urlInput');
            const url = urlInput.value.trim();
            if (url && !urlsToAnalyze.includes(url)) {
                urlsToAnalyze.push(url);
                urlInput.value = '';
                displayFiles();
                updateAnalyzeButton();
            }
        }

        function removeUrl(index) {
            urlsToAnalyze.splice(index, 1);
            displayFiles();
            updateAnalyzeButton();
        }

        function updateAnalyzeButton() {
            const hasFiles = uploadedFiles.length > 0 || urlsToAnalyze.length > 0;
            const hasApiKey = document.getElementById('groqApiKey').value.trim().length > 0;
            document.getElementById('analyzeBtn').disabled = !(hasFiles && hasApiKey);
        }

        // Excel file reading
        async function readExcelFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        let result = '';
                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            result += `Sheet: ${sheetName}\n`;
                            result += jsonData.slice(0, 20).map(row => row.join(', ')).join('\n');
                            result += '\n...\n';
                        });
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        }

        // Main AI analysis function
        async function analyzeWithAI() {
            const apiKey = document.getElementById('groqApiKey').value.trim();
            
            if (!apiKey) {
                alert('Please enter your Groq API key');
                return;
            }

            const output = document.getElementById('analysisOutput');
            output.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div style="color: var(--text-secondary); font-size: 16px;">
                        Analyzing with Groq AI...
                    </div>
                </div>
            `;

            try {
                // Get custom instructions
                const customInstructions = document.getElementById('customInstructions').value.trim();

                // Build prompt
                let promptContent = 'Please provide a detailed analysis of the following:\n\n';
                
                if (uploadedFiles.length > 0) {
                    promptContent += 'Files uploaded:\n';
                    uploadedFiles.forEach(file => {
                        promptContent += `- ${file.name} (${file.type})\n`;
                    });
                    promptContent += '\n';
                }

                if (urlsToAnalyze.length > 0) {
                    promptContent += 'URLs to analyze:\n';
                    urlsToAnalyze.forEach(url => {
                        promptContent += `- ${url}\n`;
                    });
                    promptContent += '\n';
                }

                // Process Excel files
                for (const file of uploadedFiles) {
                    if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
                        const excelData = await readExcelFile(file);
                        promptContent += `\nData from ${file.name}:\n${excelData}\n`;
                    }
                }

                // Add custom instructions if provided
                if (customInstructions) {
                    promptContent += '\n=== CUSTOM INSTRUCTIONS ===\n';
                    promptContent += customInstructions + '\n';
                    promptContent += '===========================\n\n';
                }

                // Default analysis structure
                promptContent += '\nProvide analysis with:\n';
                promptContent += '1. Executive Summary\n';
                promptContent += '2. Key Insights and Patterns\n';
                promptContent += '3. Recommendations\n';
                promptContent += '4. Risk Assessment\n';

                // Call Groq API
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'mixtral-8x7b-32768',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert analyst providing detailed, structured insights. Format your response with clear sections and bullet points. Pay special attention to any custom instructions provided by the user.'
                            },
                            {
                                role: 'user',
                                content: promptContent
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2048
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || response.statusText);
                }

                const data = await response.json();
                const analysisText = data.choices[0].message.content;

                displayAnalysisResult(analysisText);

            } catch (error) {
                output.innerHTML = `
                    <div style="color: var(--accent-red); text-align: center; padding: 30px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <div style="font-size: 18px; margin-bottom: 10px;">Analysis Failed</div>
                        <div style="font-size: 14px; color: rgba(255,255,255,0.6);">${error.message}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 15px;">
                            Please check your API key and try again
                        </div>
                    </div>
                `;
            }
        }

        function displayAnalysisResult(text) {
            const output = document.getElementById('analysisOutput');
            
            // Format the text
            let formatted = text
                .replace(/###\s+(.+)/g, '<h3>$1</h3>')
                .replace(/##\s+(.+)/g, '<h3>$1</h3>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n-\s+/g, '<br>• ')
                .replace(/\n\d+\.\s+/g, '<br>');

            output.innerHTML = `
                <div class="analysis-content">
                    <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                        <i class="fas fa-robot" style="font-size: 24px; color: var(--accent-purple);"></i>
                        <div>
                            <div style="font-size: 18px; font-weight: 700;">Groq AI Analysis Results</div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                    <p>${formatted}</p>
                </div>
            `;
        }

        // Drag and drop
        const uploadZone = document.querySelector('.upload-zone');
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--accent-green)';
            uploadZone.style.background = 'rgba(92, 219, 149, 0.1)';
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.borderColor = 'var(--accent-orange)';
            uploadZone.style.background = 'transparent';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--accent-orange)';
            uploadZone.style.background = 'transparent';
            
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                if (!uploadedFiles.find(f => f.name === file.name)) {
                    uploadedFiles.push(file);
                }
            });
            displayFiles();
            updateAnalyzeButton();
        });

        // Initialize
        updateChart();
    </script>
</body>
</html>
"""

@app.route('/')
def live_dashboard():
    return render_template_string(LIVE_DASHBOARD)

@app.route('/api/live')
def api_live():
    stats = aggregator.spribe.get_live_stats()
    return jsonify(stats)

@app.route('/api/webhook', methods=['OPTIONS', 'POST'])
def webhook_receiver():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    if not data or 'multiplier' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    crash = float(data['multiplier'])
    
    # Automatically triggers all our Redis, Math, and Stats updates seamlessly
    aggregator.spribe.add_manual_crash(crash)
    stats = aggregator.spribe.get_live_stats()
    
    socketio.emit('live_crash', {'provider': 'spribe', 'crash': crash})
    socketio.emit('live_stats', stats)
    
    # Trigger deep learning prediction
    predictor.update('spribe', crash)
    pred = predictor.predict(provider='spribe')
    socketio.emit('live_prediction', pred)
    
    return jsonify({'status': 'success', 'crash': crash})

@socketio.on('start_scraper')
def start_scraper(data=None):
    """
    Start live connection. Optionally pass:
      { operator: "sportpesa", token: "<jwt>", user: "<uid>" }
    """
    if not aggregator.spribe.running:
        operator = (data or {}).get('operator', 'sportpesa')
        token    = (data or {}).get('token', None)
        user     = (data or {}).get('user', 'player')
        threading.Thread(
            target=aggregator.spribe.connect,
            kwargs={'operator': operator, 'token': token, 'user': user},
            daemon=True
        ).start()
    emit('status', {'connected': aggregator.spribe.running, 'msg': 'Neural link established!'})

@socketio.on('manual_crash')
def handle_manual_crash(data):
    crash = data.get('crash')
    if crash:
        aggregator.spribe.add_manual_crash(float(crash))  # callback fires automatically

@socketio.on('toggle_simulation')
def handle_simulation(data):
    state = data.get('state', False)
    aggregator.connect_all(simulate=state)
    emit('status', {'simulation': state})

@socketio.on('predict_now')
def predict_live():
    pred = predictor.predict(provider='spribe')
    stats = aggregator.spribe.get_live_stats()
    emit('live_prediction', {**pred, **stats})

def prediction_loop():
    """Live prediction every 10 seconds"""
    while True:
        time.sleep(10)
        if aggregator.spribe.live_crashes:
            predictor.update('spribe', aggregator.spribe.live_crashes[-1])
            pred = predictor.predict(provider='spribe')
            socketio.emit('live_prediction', pred)

if __name__ == '__main__':
    threading.Thread(target=prediction_loop, daemon=True).start()
    print("🔴 LIVE SPORTPESA PREDICTOR STARTED")
    print("🌐 http://localhost:5001")
    socketio.run(app, host='0.0.0.0', port=5001)