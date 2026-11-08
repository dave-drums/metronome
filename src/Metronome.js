// MIT — Copyright (c) 2025 Dave Drums.
// Migrated from dave-drums/vault @ 44b400a690b498a90f822b1678fb3f196b5802c0.
import React, { useState, useEffect, useRef } from 'react';
import { bindTempoStepper, TEMPO_STEP } from './tempo-stepper.js';
import { startPlaybackTimer } from './playback-timer.js';
import toolIcons from './tool-icons.json';

export default function Metronome({ keyboardTarget = window, assetBase = new URL(import.meta.env.BASE_URL, window.location.origin).href } = {}) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [subdivision, setSubdivision] = useState(0);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdivisionType, setSubdivisionType] = useState(1);
  const [beatEmphasis, setBeatEmphasis] = useState(['accent', ...Array(15).fill('normal')]);
  const [tapTimes, setTapTimes] = useState([]);
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [showBeatsPopup, setShowBeatsPopup] = useState(false);
  const [showSubdivisionsPopup, setShowSubdivisionsPopup] = useState(false);
  const [trainerEnabled, setTrainerEnabled] = useState(false);
  const [trainerStart, setTrainerStart] = useState(80);
  const [trainerCycle, setTrainerCycle] = useState(0);
  const [trainerError, setTrainerError] = useState('');
  const [trainerAmount, setTrainerAmount] = useState(5);
  const [trainerInterval, setTrainerInterval] = useState(4);
  const [trainerStop, setTrainerStop] = useState(120);
  const intervalRef = useRef(null);
  const audioBuffersRef = useRef({});
  const audioContextRef = useRef(null);
  const barCountRef = useRef(0);
  const bpmRef = useRef(120);
  const trainerSettingsRef = useRef(null);
  const trainerInputsRef = useRef(null);
  const emphasisRef = useRef(beatEmphasis);
  const visualTimeoutsRef = useRef(new Set());
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const currentSubdivisionRef = useRef(0);
  const displayTimeoutsRef = useRef(new Set());
  const sourcesRef = useRef(new Set());
  const minusRef = useRef(null);
  const plusRef = useRef(null);
  const popupReturnRef = useRef(null);

  const scheduleDisplay = (callback, delay, timers = displayTimeoutsRef.current) => {
    const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
    timers.add(id);
  };

  function clearPlayback() {
    visualTimeoutsRef.current.forEach(clearTimeout);
    visualTimeoutsRef.current.clear();
    sourcesRef.current.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
    sourcesRef.current.clear();
  }
  useEffect(() => () => {
    displayTimeoutsRef.current.forEach(clearTimeout);
    clearPlayback();
  }, []);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { emphasisRef.current = beatEmphasis; }, [beatEmphasis]);

  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    const context = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = context;
    const loadSound = async (url) => {
      const response = await fetch(new URL(url, assetBase), { signal: abort.signal });
      if (!response.ok) throw new Error(`Metronome sample unavailable: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await context.decodeAudioData(arrayBuffer);
    };
    Promise.all([
      loadSound('assets/metronome-low.mp3'),
      loadSound('assets/metronome-normal.mp3'),
      loadSound('assets/metronome-high.mp3')
    ]).then(([low, normal, high]) => {
      if (!disposed) audioBuffersRef.current = { low, normal, high };
    }).catch(error => { if (!disposed) console.error('Could not load metronome audio', error); });
    return () => { disposed = true; abort.abort(); context.close().catch(() => {}); };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.closest?.('input,select,textarea,button,[role="dialog"]')) return;
      if (isPlaying && trainerEnabled && e.key !== ' ') return;
      switch(e.key) {
        case ' ': e.preventDefault(); togglePlayback(); break;
        case 'ArrowUp': e.preventDefault(); setBpm(prev => Math.min(300, prev + 1)); break;
        case 'ArrowDown': e.preventDefault(); setBpm(prev => Math.max(1, prev - 1)); break;
        case 'ArrowRight': e.preventDefault(); setBpm(prev => Math.min(300, prev + 5)); break;
        case 'ArrowLeft': e.preventDefault(); setBpm(prev => Math.max(1, prev - 5)); break;
      }
    };
    keyboardTarget.addEventListener('keydown', handleKeyPress);
    return () => keyboardTarget.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, trainerEnabled, trainerStart, trainerStop, trainerAmount, trainerInterval]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const subdivisions = [
    { value: 1, name: 'Quarter', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "24", height: "24", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "8", cy: "18", rx: "3.5", ry: "2.5", transform: "rotate(-20 8 18)" }), React.createElement('rect', { x: "10.5", y: "5", width: "2", height: "13", rx: "1" }))) },
    { value: 2, name: 'Eighth', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "32", height: "24", viewBox: "0 0 32 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "6", cy: "18", rx: "3", ry: "2", transform: "rotate(-20 6 18)" }), React.createElement('rect', { x: "8", y: "7", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "20", cy: "18", rx: "3", ry: "2", transform: "rotate(-20 20 18)" }), React.createElement('rect', { x: "22", y: "7", width: "1.5", height: "11", rx: "0.75" }), React.createElement('rect', { x: "8", y: "7", width: "15.5", height: "2", rx: "1" }))) },
    { value: 3, name: '8th Triplet', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "42", height: "28", viewBox: "0 0 42 28", fill: "currentColor" }, React.createElement('text', { x: "21", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '3'), React.createElement('ellipse', { cx: "6", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 6 21)" }), React.createElement('rect', { x: "7.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "18", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 18 21)" }), React.createElement('rect', { x: "19.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "30", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 30 21)" }), React.createElement('rect', { x: "31.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('rect', { x: "7.5", y: "10", width: "25.5", height: "2", rx: "1" }))) },
    { value: 4, name: '16th', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "44", height: "24", viewBox: "0 0 44 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "5", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 18)" }), React.createElement('rect', { x: "6.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "15", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 15 18)" }), React.createElement('rect', { x: "16.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "25", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 25 18)" }), React.createElement('rect', { x: "26.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "35", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 35 18)" }), React.createElement('rect', { x: "36.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "6", width: "31.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "9", width: "31.5", height: "1.8", rx: "0.9" }))) },
    { value: 5, name: 'Fivelet', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "52", height: "28", viewBox: "0 0 52 28", fill: "currentColor" }, React.createElement('text', { x: "26", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '5'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "14", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 14 21)" }), React.createElement('rect', { x: "15.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "23", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 23 21)" }), React.createElement('rect', { x: "24.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "32", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 32 21)" }), React.createElement('rect', { x: "33.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "41", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 41 21)" }), React.createElement('rect', { x: "42.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "37.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "37.5", height: "1.8", rx: "0.9" }))) },
    { value: 6, name: '16th Triplet', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "60", height: "28", viewBox: "0 0 60 28", fill: "currentColor" }, React.createElement('text', { x: "30", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '6'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "13.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 13.5 21)" }), React.createElement('rect', { x: "15", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "22", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 22 21)" }), React.createElement('rect', { x: "23.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "30.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 30.5 21)" }), React.createElement('rect', { x: "32", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "39", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 39 21)" }), React.createElement('rect', { x: "40.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "47.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 47.5 21)" }), React.createElement('rect', { x: "49", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "44", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "44", height: "1.8", rx: "0.9" }))) },
    { value: 7, name: 'Sevenlet', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "68", height: "28", viewBox: "0 0 68 28", fill: "currentColor" }, React.createElement('text', { x: "34", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '7'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "13", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 13 21)" }), React.createElement('rect', { x: "14.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "21", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 21 21)" }), React.createElement('rect', { x: "22.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "29", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 29 21)" }), React.createElement('rect', { x: "30.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "37", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 37 21)" }), React.createElement('rect', { x: "38.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "45", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 45 21)" }), React.createElement('rect', { x: "46.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "53", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 53 21)" }), React.createElement('rect', { x: "54.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "49.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "49.5", height: "1.8", rx: "0.9" }))) },
    { value: 8, name: '32nd', svg: React.createElement('div', { className: 'met-note-icon' }, React.createElement('svg', { width: "76", height: "24", viewBox: "0 0 76 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "5", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 18)" }), React.createElement('rect', { x: "6.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "13", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 13 18)" }), React.createElement('rect', { x: "14.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "21", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 21 18)" }), React.createElement('rect', { x: "22.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "29", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 29 18)" }), React.createElement('rect', { x: "30.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "37", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 37 18)" }), React.createElement('rect', { x: "38.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "45", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 45 18)" }), React.createElement('rect', { x: "46.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "53", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 53 18)" }), React.createElement('rect', { x: "54.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "61", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 61 18)" }), React.createElement('rect', { x: "62.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "5", width: "57.5", height: "1.5", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "8", width: "57.5", height: "1.5", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "11", width: "57.5", height: "1.5", rx: "0.75" }))) }
  ];

  const playClick = (isSubdivision, currentBeatIndex, time) => {
    if (emphasisRef.current[currentBeatIndex] === 'mute') return;
    const audioContext = audioContextRef.current;
    if (!audioContext || !audioBuffersRef.current.low) return;
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    if (isSubdivision) {
      source.buffer = audioBuffersRef.current.low;
      gainNode.gain.value = 0.15;
    } else if (emphasisRef.current[currentBeatIndex] === 'accent') {
      source.buffer = audioBuffersRef.current.high;
      gainNode.gain.value = 0.4;
    } else {
      source.buffer = audioBuffersRef.current.normal;
      gainNode.gain.value = 0.25;
    }
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(time);
  };

  const getRowSplit = (total) => {
    if (total <= 8) return [total];
    const splits = { 9: [5, 4], 10: [5, 5], 11: [6, 5], 12: [6, 6], 13: [7, 6], 14: [7, 7], 15: [8, 7], 16: [8, 8] };
    return splits[total] || [total];
  };

  useEffect(() => {
    setBeatEmphasis(prev => {
      const newEmphasis = ['accent', ...Array(15).fill('normal')];
      for (let i = 0; i < beatsPerBar && i < prev.length; i++) {
        newEmphasis[i] = prev[i];
      }
      return newEmphasis;
    });
  }, [beatsPerBar]);

  useEffect(() => {
    if (!isPlaying) {
      setBeat(0); setSubdivision(0); setTrainerCycle(0);
      return;
    }
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    setBeat(0); setSubdivision(0);
    barCountRef.current = 0;
    currentBeatRef.current = 0;
    currentSubdivisionRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime;
    const scheduler = () => {
      const stamp = audioContext.getOutputTimestamp?.();
      const audibleTime = stamp?.performanceTime > 0
        ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
        : audioContext.currentTime - (audioContext.outputLatency || audioContext.baseLatency || 0);
      while (nextNoteTimeRef.current < audioContext.currentTime + 0.1) {
        const settings = trainerSettingsRef.current;
        const scheduledBpm = settings
          ? Math.min(settings.target, settings.start + Math.floor(barCountRef.current / settings.every) * settings.increase)
          : Number(bpmRef.current) || 1;
        const scheduleTime = nextNoteTimeRef.current;
        const displayTime = Math.max(0, (scheduleTime - audibleTime) * 1000);
        const beatToPlay = currentBeatRef.current, subdivisionToPlay = currentSubdivisionRef.current;
        if (subdivisionToPlay === 0) {
          playClick(false, beatToPlay, scheduleTime);
          scheduleDisplay(() => setBeat(beatToPlay), displayTime, visualTimeoutsRef.current);
          if (settings && beatToPlay === 0) {
            const cycle = barCountRef.current % settings.every + 1;
            scheduleDisplay(() => { setTrainerCycle(cycle); setBpm(scheduledBpm); }, displayTime, visualTimeoutsRef.current);
          }
        } else playClick(true, beatToPlay, scheduleTime);
        scheduleDisplay(() => setSubdivision(subdivisionToPlay), displayTime, visualTimeoutsRef.current);
        currentSubdivisionRef.current++;
        if (currentSubdivisionRef.current >= subdivisionType) {
          currentSubdivisionRef.current = 0;
          currentBeatRef.current++;
          if (currentBeatRef.current >= beatsPerBar) { currentBeatRef.current = 0; barCountRef.current++; }
        }
        nextNoteTimeRef.current += (60 / scheduledBpm) / subdivisionType;
      }
    };
    scheduler();
    intervalRef.current = setInterval(scheduler, 25);
    return () => { clearInterval(intervalRef.current); clearPlayback(); };
  }, [isPlaying, beatsPerBar, subdivisionType]);

  useEffect(() => {
    if (!isPlaying) { setElapsedTime('0:00'); return; }
    return startPlaybackTimer(setElapsedTime);
  }, [isPlaying]);

  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);
    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(1, Math.min(300, calculatedBpm)));
    }
    scheduleDisplay(() => {
      setTapTimes(prev => {
        const lastTap = prev[prev.length - 1];
        if (lastTap && Date.now() - lastTap > 3000) return [];
        return prev;
      });
    }, 3000);
  };

  const cycleBeatEmphasis = (index) => {
    setBeatEmphasis(prev => {
      const newEmphasis = [...prev];
      const current = newEmphasis[index];
      newEmphasis[index] = current === 'normal' ? 'accent' : current === 'accent' ? 'mute' : 'normal';
      return newEmphasis;
    });
  };

  useEffect(() => {
    const disposers = [
      bindTempoStepper(minusRef.current, () => setBpm(prev => Math.max(1, (Number(prev) || 1) - TEMPO_STEP))),
      bindTempoStepper(plusRef.current, () => setBpm(prev => Math.min(300, (Number(prev) || 1) + TEMPO_STEP))),
    ];
    return () => disposers.forEach(dispose => dispose());
  }, []);

  function togglePlayback() {
    if (isPlaying) { setIsPlaying(false); return; }
    let settings = null;
    if (trainerEnabled) {
      const fields = [...trainerInputsRef.current.querySelectorAll('input')];
      if (fields.some(field => !field.reportValidity())) return;
      settings = { start: Number(trainerStart), target: Number(trainerStop), increase: Number(trainerAmount), every: Number(trainerInterval) };
      if (settings.target < settings.start) {
        setTrainerError('Target BPM must be equal to or above starting BPM.');
        fields[1].focus(); return;
      }
      setBpm(settings.start); bpmRef.current = settings.start;
    }
    trainerSettingsRef.current = settings;
    setTrainerError(''); setTrainerCycle(0); setIsPlaying(true);
  }

  const handleBpmChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setBpm(Math.max(1, Math.min(300, value)));
    } else if (e.target.value === '') {
      setBpm('');
    }
  };

  const handleBpmBlur = () => {
    if (bpm === '' || bpm < 1) setBpm(1);
    if (bpm > 300) setBpm(300);
  };

  const trainerActive = isPlaying && trainerEnabled;
  const popupOpen = showBeatsPopup || showSubdivisionsPopup;
  useEffect(() => {
    if (!popupOpen) return;
    const scope = keyboardTarget.querySelector ? keyboardTarget : document;
    const dialog = scope.querySelector('[role="dialog"]');
    if (!dialog) return;
    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const fields = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
      const first = fields[0], last = fields.at(-1);
      const focused = dialog.getRootNode().activeElement;
      if (event.shiftKey && focused === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && focused === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); popupReturnRef.current?.focus(); };
  }, [popupOpen]);

  const h = React.createElement;
  const icon = (name, extra = {}) => h('svg', { className: 'tool-icon', viewBox: toolIcons[name].viewBox,
    'data-icon': name, 'aria-hidden': true, focusable: false, ...extra },
    ...toolIcons[name].nodes.map(([tag, attrs], key) => h(tag, { ...attrs, key })));
  const closePopup = () => { setShowBeatsPopup(false); setShowSubdivisionsPopup(false); };
  const popup = (title, content, footer) => h('div', { className: 'met-popup-backdrop', onClick: closePopup },
    h('section', { className: 'met-popup', role: 'dialog', 'aria-modal': true, 'aria-label': title,
      onClick: e => e.stopPropagation(), onKeyDown: e => { if (e.key === 'Escape') closePopup(); } },
      h('div', { className: 'met-popup-header' }, h('h2', null, title),
        h('button', { className: 'tool-control met-close', 'aria-label': 'Close', onClick: closePopup, autoFocus: true }, icon('close'))),
      h('div', { className: 'met-popup-body' }, content),
      footer && h('div', { className: 'met-popup-footer' }, footer)));
  const choice = (label, selected, onClick, extra = {}) => h('button', {
    className: 'tool-control', 'aria-pressed': selected, onClick, ...extra }, label);
  return h('div', { className: 'metronome-wrapper tool-ui' },
    h('div', { className: 'metronome-card' },
      h('div', { className: 'bpm-display tool-tempo-display' },
        h('div', { className: 'met-bpm-row' },
          h('button', { className: 'tool-control tool-tempo-step met-step', 'aria-label': 'Decrease tempo by 5 BPM',
            disabled: trainerActive, ref: minusRef }, icon('minus')),
          h('input', { className: 'met-bpm tool-number', type: 'text', inputMode: 'numeric', 'aria-label': 'Tempo in beats per minute',
            disabled: trainerActive, value: bpm, onChange: handleBpmChange, onBlur: handleBpmBlur }),
          h('button', { className: 'tool-control tool-tempo-step met-step', 'aria-label': 'Increase tempo by 5 BPM',
            disabled: trainerActive, ref: plusRef }, icon('plus'))),
        h('input', { className: 'met-slider', type: 'range', 'aria-label': 'Tempo slider', min: '1', max: '300', disabled: trainerActive, value: bpm,
          onChange: e => setBpm(parseInt(e.target.value)) }),
        h('div', { className: 'met-tempo-scale' }, h('span', null, '1'), h('span', null, 'Tempo · BPM'), h('span', null, '300'))),
      h('div', { className: 'met-beats' }, getRowSplit(beatsPerBar).map((rowCount, rowIndex) => {
        const startIndex = rowIndex === 0 ? 0 : getRowSplit(beatsPerBar)[0];
        return h('div', { className: 'met-beat-row', 'data-beats': rowCount, key: rowIndex }, [...Array(rowCount)].map((_, colIndex) => {
          const index = startIndex + colIndex, emphasis = beatEmphasis[index], isActive = isPlaying && beat === index;
          return h('button', { key: index, className: 'beat-circle', 'data-emphasis': emphasis, 'data-active': isActive,
            'aria-label': `Beat ${index + 1}: ${emphasis}`, onClick: () => cycleBeatEmphasis(index) },
            isActive && subdivisionType > 1 && emphasis !== 'mute'
              ? h('span', { className: 'met-subdivision-dots' },
                (subdivisionType <= 4 ? [subdivisionType] : [Math.ceil(subdivisionType / 2), Math.floor(subdivisionType / 2)]).map((count,row) =>
                  h('span', { className: 'met-subdivision-row', key: row }, [...Array(count)].map((_,i) => {
                    const index = row === 0 ? i : Math.ceil(subdivisionType / 2) + i;
                    return h('span', { key: index, className: 'subdivision-dot', 'data-subdivision': index, 'data-current': index <= subdivision });
                  }))))
              : emphasis === 'mute' ? icon('speaker-off')
              : emphasis === 'accent' ? icon('chevron-up') : null);
        }));
      })),
      h('div', { className: 'met-controls' },
        h('button', { className: 'tool-control tool-primary met-play tool-playback', 'aria-label': isPlaying ? 'Stop metronome' : 'Start metronome',
          'aria-pressed': isPlaying, onClick: togglePlayback }, icon(isPlaying ? 'stop' : 'play'), h('span', null, isPlaying ? elapsedTime : 'Start')),
        h('button', { className: 'tool-control tool-tap', 'aria-label': 'Tap tempo', disabled: trainerActive, onClick: handleTapTempo },
          icon('tap'), h('span', null, 'Tap tempo')),
        h('button', { className: 'tool-control', disabled: trainerActive, onClick: e => { popupReturnRef.current = e.currentTarget; setShowBeatsPopup(true); } }, `Beats: ${beatsPerBar}`),
        h('button', { className: 'tool-control', disabled: trainerActive, onClick: e => { popupReturnRef.current = e.currentTarget; setShowSubdivisionsPopup(true); } }, `Subdivision: ${subdivisionType}`)),
      h('section', { className: 'tool-trainer met-trainer', 'aria-label': 'Speed trainer' },
        h('div', { className: 'tool-trainer-heading' },
          h('label', { className: 'tool-trainer-toggle', htmlFor: 'met-trainer-enabled' },
            h('input', { id: 'met-trainer-enabled', type: 'checkbox', checked: trainerEnabled, disabled: isPlaying,
              onChange: e => { setTrainerEnabled(e.target.checked); setTrainerError(''); } }), h('span', null, `Speed trainer ${trainerEnabled ? 'active' : 'inactive'}`)),
          h('output', { className: 'tool-trainer-cycle', 'aria-label': 'Repetition in current cycle', 'aria-live': 'off', hidden: !trainerEnabled },
            `Repetition ${trainerCycle} of ${Math.max(1, Number(trainerInterval) || 1)}`)),
        h('fieldset', { className: 'tool-trainer-fields', ref: trainerInputsRef, disabled: isPlaying || !trainerEnabled },
          h('legend', { className: 'met-sr-only' }, 'Speed trainer settings'),
          ...[['start','Starting BPM',trainerStart,setTrainerStart,1,300],['target','Target BPM',trainerStop,setTrainerStop,1,300],
            ['increase','Increase by',trainerAmount,setTrainerAmount,1,299],['every','Every … repetitions',trainerInterval,setTrainerInterval,1,100]]
            .map(([name,label,value,setValue,min,max]) => h('div', { className: 'tool-trainer-field', key: name },
              h('label', { htmlFor: `met-trainer-${name}` }, label),
              h('input', { id: `met-trainer-${name}`, name, type: 'number', inputMode: 'numeric', required: true, min, max, step: 1,
                disabled: isPlaying || !trainerEnabled, value, onChange: e => { setValue(e.target.value); setTrainerError(''); } })))),
        h('p', { className: 'met-trainer-error', role: 'alert' }, trainerError),
        h('p', { className: 'tool-trainer-hint' }, 'Stop playback to edit speed trainer settings.'))),
    showBeatsPopup && popup('Beats', h('div', { className: 'beats-popup-grid' },
      [...Array(16)].map((_, i) => choice(i+1, beatsPerBar === i+1, () => { setBeatsPerBar(i+1); closePopup(); }, { key: i+1 })))),
    showSubdivisionsPopup && popup('Subdivision', h('div', { className: 'subdivisions-popup-grid' },
      subdivisions.map(sub => choice(h(React.Fragment, null, h('span', { className: 'met-subdivision-icon' }, sub.svg),
        h('span', null, sub.name)), subdivisionType === sub.value, () => { setSubdivisionType(sub.value); closePopup(); }, { key: sub.value }))))
  );
}
