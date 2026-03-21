import * as tf from '@tensorflow/tfjs';
import { useState, useCallback, useEffect } from 'react';

// Neural buckets for Probability Distribution
// Index 0: 1.00 - 1.50x
// Index 1: 1.50 - 2.00x
// Index 2: 2.00 - 3.00x
// Index 3: 3.00 - 10.00x
// Index 4: 10.00x +
const BUCKETS = [
  { label: '1.0x - 1.5x', min: 1.0, max: 1.5 },
  { label: '1.5x - 2.0x', min: 1.5, max: 2.0 },
  { label: '2.0x - 3.0x', min: 2.0, max: 3.0 },
  { label: '3.0x - 10.0', min: 3.0, max: 10.0 },
  { label: '10.0x+', min: 10.0, max: 99999.0 }
];

export function useTFJS() {
  const [model, setModel] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [distribution, setDistribution] = useState(null);
  const SEQUENCE_LENGTH = 15; // Number of previous ticks to look at

  useEffect(() => {
    // Initialize the neural network structure
    const initModel = async () => {
      // Ensure backend is ready (WebGL/CPU)
      await tf.ready();
      
      const lstmModel = tf.sequential();
      
      // Layer 1: LSTM for sequence analysis
      lstmModel.add(tf.layers.lstm({
        units: 32,
        inputShape: [SEQUENCE_LENGTH, 1],
        returnSequences: false
      }));
      
      // Layer 2: Dropout to prevent overfitting
      lstmModel.add(tf.layers.dropout({ rate: 0.2 }));
      
      // Layer 3: Dense map to probability buckets
      lstmModel.add(tf.layers.dense({
        units: BUCKETS.length,
        activation: 'softmax'
      }));
      
      lstmModel.compile({
        optimizer: tf.train.adam(0.005),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      setModel(lstmModel);
      console.log('🧠 TensorFlow.js LSTM Engine Booted Successfully');
    };

    initModel();
  }, []);

  const categorizeCrash = (multiplier) => {
    return BUCKETS.findIndex(b => multiplier >= b.min && multiplier < b.max);
  };

  /**
   * Train the LSTM model dynamically using the SQLite historical array
   */
  const trainModel = useCallback(async (historicalTicks) => {
    if (!model || historicalTicks.length <= SEQUENCE_LENGTH + 1) return;
    setIsTraining(true);

    try {
      // historicalTicks is assumed to be chronological oldest->newest
      const values = historicalTicks.map(t => t.value);
      
      const xs = [];
      const ys = [];
      
      // Build sliding window sequences
      for (let i = 0; i < values.length - SEQUENCE_LENGTH; i++) {
        const seq = values.slice(i, i + SEQUENCE_LENGTH);
        const target = values[i + SEQUENCE_LENGTH];
        
        // Normalize sequence by dividing by 10 (keeps inputs roughly 0.1 - 2.0)
        xs.push(seq.map(v => [Math.min(v / 10.0, 5.0)]));
        
        const targetCat = categorizeCrash(target);
        const oneHot = Array(BUCKETS.length).fill(0);
        oneHot[targetCat] = 1;
        ys.push(oneHot);
      }
      
      const tensorX = tf.tensor3d(xs, [xs.length, SEQUENCE_LENGTH, 1]);
      const tensorY = tf.tensor2d(ys, [ys.length, BUCKETS.length]);
      
      // Background fit
      await model.fit(tensorX, tensorY, {
        epochs: 5,
        batchSize: 16,
        shuffle: true,
        verbose: 0
      });
      
      tensorX.dispose();
      tensorY.dispose();
      
      console.log(`🧠 Model trained on ${xs.length} sequences`);
    } catch(e) {
      console.error("TF.js Training Error:", e);
    } finally {
      setIsTraining(false);
    }
  }, [model]);

  /**
   * Predict the next multiplier probability distribution
   */
  const getProbabilityDistribution = useCallback(async (recentTicks) => {
    if (!model || recentTicks.length < SEQUENCE_LENGTH) return null;
    
    try {
      // Grab exactly the last SEQUENCE_LENGTH values
      const sequence = recentTicks.slice(-SEQUENCE_LENGTH).map(t => t.value);
      
      // Normalize layout exactly as trained
      const input = [sequence.map(v => [Math.min(v / 10.0, 5.0)])];
      
      const tensorInput = tf.tensor3d(input, [1, SEQUENCE_LENGTH, 1]);
      const prediction = model.predict(tensorInput);
      
      const probabilities = await prediction.data(); // Float32Array
      
      tensorInput.dispose();
      prediction.dispose();
      
      // Map back to our buckets
      const distDict = BUCKETS.map((b, i) => ({
        label: b.label,
        probability: Math.round(probabilities[i] * 100)
      }));
      
      setDistribution(distDict);
      return distDict;
      
    } catch (e) {
      console.error("TF.js Prediction Error:", e);
      return null;
    }
  }, [model]);

  return { model, isTraining, distribution, trainModel, getProbabilityDistribution };
}
