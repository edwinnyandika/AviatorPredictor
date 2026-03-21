// WebWorker for off-thread GPU-equivalent Monte Carlo Risk Simulations
self.addEventListener('message', (e) => {
  const { distribution, rounds = 10000, initialBankroll = 1000, betSize = 10 } = e.data;
  
  if (!distribution || distribution.length === 0) {
    self.postMessage({ error: "No distribution provided" });
    return;
  }

  // Flatten the distribution into a cumulative map
  let cumulative = 0;
  const cdf = distribution.map(d => {
    cumulative += d.probability;
    return { ...d, _ceil: cumulative };
  });

  const maxProb = cumulative; // Should be ~100

  let ruinCount = 0;
  let totalDrawdown = 0;
  const finalBankrolls = [];

  // Run 'rounds' independent simulations of 100-bet sequences
  const SIMULATION_LENGTH = 100;

  for (let i = 0; i < rounds; i++) {
    let currentBankroll = initialBankroll;
    let peakBankroll = initialBankroll;
    let maxSimulationDrawdown = 0;
    
    // Each specific simulation plays SIMULATION_LENGTH times
    for (let j = 0; j < SIMULATION_LENGTH; j++) {
      if (currentBankroll <= betSize) {
        ruinCount++;
        break; // Bankrupt
      }
      
      currentBankroll -= betSize;
      
      // Roll RNG against the Tensor Probability Distribution
      const roll = Math.random() * maxProb;
      const bucket = cdf.find(b => roll <= b._ceil);
      
      // Calculate payout: random point inside the winning bucket
      // If the bucket is 2.0x - 3.0x, we pick a random multiplier in there
      const resultMult = bucket.min + (Math.random() * (bucket.max - bucket.min));
      
      // Strict Risk Logic: We assume cashout at 1.5x for baseline risk metrics
      const TARGET_CASHOUT = 1.5;
      if (resultMult >= TARGET_CASHOUT) {
        currentBankroll += (betSize * TARGET_CASHOUT);
      }
      
      if (currentBankroll > peakBankroll) peakBankroll = currentBankroll;
      const drawdown = (peakBankroll - currentBankroll) / peakBankroll;
      if (drawdown > maxSimulationDrawdown) maxSimulationDrawdown = drawdown;
    }
    
    totalDrawdown += maxSimulationDrawdown;
    finalBankrolls.push(currentBankroll);
  }

  // Calculate 95% Confidence Intervals
  finalBankrolls.sort((a, b) => a - b);
  const lower95 = finalBankrolls[Math.floor(rounds * 0.025)];
  const upper95 = finalBankrolls[Math.floor(rounds * 0.975)];
  const medianReturn = finalBankrolls[Math.floor(rounds * 0.5)];
  
  const probOfRuin = (ruinCount / rounds) * 100;
  const expectedDrawdown = (totalDrawdown / rounds) * 100;

  self.postMessage({
    probOfRuin: Math.round(probOfRuin * 10) / 10,
    expectedDrawdown: Math.round(expectedDrawdown * 10) / 10,
    lower95: Math.round(lower95),
    upper95: Math.round(upper95),
    medianReturn: Math.round(medianReturn),
    iterations: rounds
  });
});
