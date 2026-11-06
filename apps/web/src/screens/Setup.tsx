import { suggestTarget } from '@press16/shared';
import { useState, type FormEvent } from 'react';
import { createCycle, todayIso } from '../data/actions';

const STEPS = [5, 2.5, 1.25, 1, 0.5];

export function Setup() {
  const [currentMax, setCurrentMax] = useState('100');
  const [increase, setIncrease] = useState('5');
  const [target, setTarget] = useState<string | null>(null);
  const [step, setStep] = useState('2.5');
  const [bar, setBar] = useState('20');
  const [startDate, setStartDate] = useState(todayIso());
  const [error, setError] = useState('');

  const max = Number(currentMax);
  const suggested = max > 0 ? suggestTarget(max, Number(increase) || 0, Number(step)) : 0;
  const targetValue = target ?? String(suggested);
  const targetNum = Number(targetValue);
  const aggressive = max > 0 && targetNum > max * 1.1;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!(max > 0) || !(targetNum > 0) || !(Number(bar) >= 0)) {
      setError('Enter positive numbers for max, target and bar weight.');
      return;
    }
    await createCycle({
      currentMax: max,
      targetMax: targetNum,
      roundingStep: Number(step),
      barWeight: Number(bar),
      startDate,
    });
  }

  return (
    <section className="screen">
      <h1>New 16-week cycle</h1>
      <p className="muted">
        Muravyov's program: 2 bench sessions a week, all weights are percentages of the result you expect at the end
        (100%). Keep it conservative: about +5% over your current max.
      </p>
      <form className="form" onSubmit={submit}>
        <label>
          Current bench max (kg)
          <input inputMode="decimal" value={currentMax} onChange={(e) => setCurrentMax(e.target.value)} />
        </label>
        <label>
          Planned increase (%)
          <input inputMode="decimal" value={increase} onChange={(e) => { setIncrease(e.target.value); setTarget(null); }} />
        </label>
        <label>
          Target = 100% (kg)
          <input inputMode="decimal" value={targetValue} onChange={(e) => setTarget(e.target.value)} />
        </label>
        {aggressive && <p className="warn">That's more than +10% over your current max — sources recommend +5–10%.</p>}
        <label>
          Round weights to (kg)
          <select value={step} onChange={(e) => setStep(e.target.value)}>
            {STEPS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bar weight (kg)
          <input inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} />
        </label>
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {error && <p className="warn">{error}</p>}
        <button className="primary" type="submit">
          Start cycle
        </button>
      </form>
    </section>
  );
}
