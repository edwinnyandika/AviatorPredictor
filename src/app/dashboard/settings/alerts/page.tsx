'use client';
import { useState } from 'react';
import styles from './page.module.css';

type AlertRule = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  value: number;
  action: string;
  active: boolean;
};

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'Spike Hunter',
      metric: 'low_streak',
      operator: '>=',
      value: 12,
      action: 'push_notification',
      active: true
    },
    {
      id: '2',
      name: 'Volatility Warning',
      metric: 'avg_multiplier',
      operator: '<=',
      value: 1.5,
      action: 'dashboard_toast',
      active: true
    }
  ]);
  
  const [isPro] = useState(false); // Used to limit free accounts to 1 rule

  const addRule = () => {
    if (!isPro && rules.length >= 1) {
      alert("PRO users get 10 custom alert rules. Upgrade now to combine multiple strategies.");
      return;
    }
    const newRule: AlertRule = {
      id: Date.now().toString(),
      name: 'New Custom Rule',
      metric: 'low_streak',
      operator: '>=',
      value: 5,
      action: 'dashboard_toast',
      active: true
    };
    setRules([...rules, newRule]);
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Custom Alerts</h1>
          <p className={styles.subtitle}>Define visual rules to trigger Push Notifications or Dashboard Toasts.</p>
        </div>
        <button className={styles.addBtn} onClick={addRule}>
          + Create New Rule
        </button>
      </div>

      <div className={styles.rulesList}>
        {rules.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>You haven&apos;t set any custom alerts</h2>
            <p>Combine metrics to build your perfect betting notification.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className={styles.ruleCard} style={{ opacity: rule.active ? 1 : 0.6 }}>
              <div>
                <div className={styles.ruleHeader}>
                  <span className={styles.ruleBadge}>{rule.action.replace('_', ' ')}</span>
                  <h3 className={styles.ruleTitle}>{rule.name}</h3>
                </div>
                <div className={styles.ruleCondition}>
                  IF [ {rule.metric.replace('_', ' ')} ] {rule.operator} {rule.value} 
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" checked={rule.active} onChange={() => {
                    setRules(rules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
                  }} />
                  <span style={{ marginLeft: 8 }}>{rule.active ? 'Active' : 'Paused'}</span>
                </label>
                <button className={styles.deleteBtn} onClick={() => deleteRule(rule.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
