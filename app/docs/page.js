'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function DocsPage() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);

  const handleCopy = (type) => {
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedApi(true);
      setTimeout(() => setCopiedApi(false), 2000);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/icon.svg" width="24" height="24" alt="Logo" />
          AviatorAI Docs
        </div>
        
        <Link href="/" style={{ color: 'var(--clr-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>←</span> Back to App
        </Link>
        
        <div className={styles.navGroup}>
          <div className={styles.navTitle}>Getting Started</div>
          <div className={`${styles.navItem} ${styles.active}`}>Installation Hook</div>
          <div className={styles.navItem}>Architecture Specs</div>
        </div>

        <div className={styles.navGroup}>
          <div className={styles.navTitle}>API Reference</div>
          <div className={styles.navItem}>WSS Telemetry</div>
          <div className={styles.navItem}>Neural Inference</div>
          <div className={styles.navItem}>Webhooks</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>System Variables</h1>
          <p className={styles.desc}>
            Learn how to deploy the WebSocket hooks, ingest Server-Sent Events from the Terminal, and leverage the exact mathematics behind the AviatorAI prediction array.
          </p>
        </header>

        <section className={styles.section}>
          <h2>1. Interceptor Deployment</h2>
          <p className={styles.text}>
            The Spribe Interceptor acts as a mathematical middleman between the web browser and the casino socket. To install, instantiate the raw Javascript file directly via Tampermonkey. It automatically parses out XHR payloads from the crash game and redirects them to the Aviator local environment.
          </p>
          
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span>tampermonkey-hook.js</span>
              <button className={styles.copyBtn} onClick={() => handleCopy('script')}>
                {copiedScript ? 'COPIED!' : 'COPY CODE'}
              </button>
            </div>
             <pre className={styles.pre}>
               <code className={styles.code}>
                 {'// ==UserScript=='}<br/>
                 {'// @name         Aviator Socket Hook'}<br/>
                 {'// @match        *://*.spribe.co/*'}<br/>
                 {'// ==/UserScript=='}<br/><br/>
                  <span className={styles.tokenKeyword}>const</span> <span className={styles.tokenFunction}>intercept</span> = <span className={styles.tokenKeyword}>new</span> WebSocketProxy();<br/>
                  intercept.<span className={styles.tokenFunction}>onMessage</span>((<span className={styles.tokenKeyword}>data</span>) =&gt; {'{'}<br/>
                    &nbsp;&nbsp;<span className={styles.tokenKeyword}>if</span> (data.<span className={styles.tokenFunction}>includes</span>(<span className={styles.tokenString}>&quot;multiplier&quot;</span>)) {'{'}<br/>
                   &nbsp;&nbsp;&nbsp;&nbsp;fetch(<span className={styles.tokenString}>&quot;http://localhost:3000/api/ingest&quot;</span>, {'{'}<br/>
                   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;method: <span className={styles.tokenString}>&quot;POST&quot;</span>,<br/>
                   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body: data<br/>
                   &nbsp;&nbsp;&nbsp;&nbsp;{'}'});<br/>
                   &nbsp;&nbsp;{'}'}<br/>
                   {'}'});
              </code>
            </pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>2. Inference Engine Endpoints</h2>
          <p className={styles.text}>
            Data streams are emitted down a normalized `wss://` port at 50ms intervals. The AviatorAI predictive engine intercepts these fragments and routes them to your local API routing edge. From there, the Neural model runs local inference to determine probabilistic crash intervals.
          </p>

          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span>POST /api/predict</span>
              <button className={styles.copyBtn} onClick={() => handleCopy('api')}>
                {copiedApi ? 'COPIED!' : 'COPY POST'}
              </button>
            </div>
            <pre className={styles.pre}>
              <code className={styles.code}>
                fetch(<span className={styles.tokenString}>&apos;https://api.aviatorai.com/v1/predict&apos;</span>, {'{'}<br/>
                &nbsp;&nbsp;headers: {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.tokenString}>&apos;Authorization&apos;</span>: <span className={styles.tokenString}>&apos;Bearer YOUR_OPERATOR_TOKEN&apos;</span>,<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.tokenString}>&apos;Content-Type&apos;</span>: <span className={styles.tokenString}>&apos;application/json&apos;</span><br/>
                &nbsp;&nbsp;{'}'},<br/>
                &nbsp;&nbsp;body: <span className={styles.tokenString}>JSON.stringify</span>({'{'} history_array: [1.2, 3.4, 1.1, 5.5] {'}'})<br/>
                {'}'})<br/>
                .<span className={styles.tokenFunction}>then</span>(res =&gt; res.<span className={styles.tokenFunction}>json</span>())<br/>
                .<span className={styles.tokenFunction}>then</span>(prediction =&gt; console.<span className={styles.tokenFunction}>log</span>(prediction.confidenceScore));
              </code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
