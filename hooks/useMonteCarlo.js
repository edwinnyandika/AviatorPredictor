import { useState, useEffect, useRef } from 'react';

export function useMonteCarlo(distribution) {
  const [metrics, setMetrics] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize standard WebWorker for unthrottled loop logic
    workerRef.current = new Worker('/montecarlo.js');
    
    workerRef.current.onmessage = (e) => {
      if (!e.data.error) {
        setMetrics(e.data);
      } else {
        console.error("Monte Carlo Worker Error:", e.data.error);
      }
      setIsSimulating(false);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    // Re-run simulation anytime the TF.js Distribution Tensor updates
    if (distribution && workerRef.current) {
      setIsSimulating(true);
      workerRef.current.postMessage({
        distribution,
        rounds: 10000,
        initialBankroll: 1000,
        betSize: 10
      });
    }
  }, [distribution]);

  return { metrics, isSimulating };
}
