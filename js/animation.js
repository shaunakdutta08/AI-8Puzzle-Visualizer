import { describeTransition } from './puzzle.js';

/** One timer, one path, explicit step 0. No DOM dependency: playback is testable. */
export class Playback {
  constructor(onChange, {
    schedule = (callback, delay) => setTimeout(callback, delay),
    unschedule = timer => clearTimeout(timer)
  } = {}) {
    this.onChange = onChange;
    this.schedule = schedule;
    this.unschedule = unschedule;
    this.path = [];
    this.step = 0;
    this.speed = 600;
    this.status = 'empty';
    this.timer = null;
  }
  stopTimer() {
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = null;
  }
  emit() {
    this.onChange({
      state: this.path[this.step], step: this.step, total: Math.max(0, this.path.length - 1),
      status: this.status, speed: this.speed,
      transition: this.step > 0 ? describeTransition(this.path[this.step - 1], this.path[this.step]) : null
    });
  }
  load(path) {
    this.stopTimer();
    this.path = path.map(state => [...state]);
    this.step = 0;
    this.status = path.length === 1 ? 'complete' : path.length ? 'ready' : 'empty';
    this.emit();
  }
  clear() { this.load([]); }
  tick() {
    if (this.status !== 'playing') return;
    this.timer = this.schedule(() => {
      this.timer = null;
      if (this.status !== 'playing') return;
      this.step++;
      if (this.step >= this.path.length - 1) this.status = 'complete';
      this.emit();
      if (this.status === 'playing') this.tick();
    }, this.speed);
  }
  play() {
    if (!this.path.length || this.status === 'playing') return;
    if (this.path.length === 1) { this.status = 'complete'; this.emit(); return; }
    if (this.step === this.path.length - 1) return this.replay();
    this.status = 'playing'; this.emit(); this.tick();
  }
  pause() {
    this.stopTimer();
    if (this.status === 'playing') this.status = 'paused';
    this.emit();
  }
  seek(step) {
    if (!this.path.length) return;
    this.stopTimer();
    this.step = Math.max(0, Math.min(step, this.path.length - 1));
    this.status = this.step === this.path.length - 1 ? 'complete' : 'paused';
    this.emit();
  }
  reset() { this.seek(0); }
  replay() {
    if (!this.path.length) return;
    this.reset(); this.play();
  }
  setSpeed(speed) {
    if (![1200, 600, 200].includes(speed)) throw new Error('Unsupported playback speed.');
    this.speed = speed;
    this.stopTimer();
    this.emit();
    if (this.status === 'playing') this.tick();
  }
}
