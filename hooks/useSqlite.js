import { useState, useEffect, useCallback } from 'react';
import initSqlJs from 'sql.js';

let sqlPromise = null;

export function useSqlite() {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    
    // We fetch the WASM binary from cdnjs to completely bypass Next.js Webpack loader issues
    if (!sqlPromise) {
      sqlPromise = initSqlJs({ locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm' });
    }
    
    sqlPromise
      .then(SQL => {
        if (!active) return;
        
        // Initialize an OPFS/in-memory SQLite database
        const localDb = new SQL.Database();
        
        // Build the core multi-exchange tick ledger
        localDb.run(`
          CREATE TABLE IF NOT EXISTS ticks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            event_type TEXT,
            value REAL,
            timestamp INTEGER
          );
        `);
        
        setDb(localDb);
        setIsReady(true);
        console.log("✅ WASM SQLite Database Initialized Successfully");
      })
      .catch(err => console.error("WASM SQLite Init Error:", err));

    return () => { active = false; };
  }, []);

  const insertTick = useCallback((provider = 'unknown', type = 'crash', value) => {
    if (!db) return;
    try {
      db.run('INSERT INTO ticks (provider, event_type, value, timestamp) VALUES (?, ?, ?, ?)', 
        [provider, type, value, Date.now()]);
    } catch(e) {
      console.error("SQLite Insert Error:", e);
    }
  }, [db]);

  const getAllTicks = useCallback(() => {
    if (!db) return [];
    try {
      const res = db.exec('SELECT * FROM ticks ORDER BY timestamp DESC LIMIT 2000');
      if (!res.length) return [];
      
      return res[0].values.map(v => ({
        id: v[0], 
        provider: v[1], 
        type: v[2], 
        value: v[3], 
        timestamp: v[4]
      }));
    } catch (e) {
      console.error("SQLite Select Error:", e);
      return [];
    }
  }, [db]);

  return { db, isReady, insertTick, getAllTicks };
}
