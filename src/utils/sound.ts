// 音效管理
let audioContext: AudioContext | null = null;

// 初始化音频上下文
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

// 播放成功音效（轻快的上升音调）
export const playSuccessSound = (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    initAudioContext();
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置音调 - 轻快的上升旋律
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, now); // C5
    oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
    oscillator.frequency.setValueAtTime(1046.50, now + 0.3); // C6
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

// 播放积分增加音效（短促的"叮"声）
export const playPointSound = (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    initAudioContext();
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now); // A5
    oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // A6
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

// 播放徽章解锁音效（庆祝音效）
export const playBadgeSound = (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    initAudioContext();
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // 创建和弦
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C大调和弦
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1 + index * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
      
      oscillator.start(now);
      oscillator.stop(now + 1);
    });
    
    // 添加一些装饰音
    const decorOsc = audioContext.createOscillator();
    const decorGain = audioContext.createGain();
    decorOsc.connect(decorGain);
    decorGain.connect(audioContext.destination);
    
    decorOsc.type = 'triangle';
    decorOsc.frequency.setValueAtTime(1318.51, now + 0.2); // E6
    decorOsc.frequency.setValueAtTime(1567.98, now + 0.4); // G6
    decorOsc.frequency.setValueAtTime(2093.00, now + 0.6); // C7
    
    decorGain.gain.setValueAtTime(0.1, now + 0.2);
    decorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    decorOsc.start(now + 0.2);
    decorOsc.stop(now + 0.8);
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

// 播放兑换音效
export const playRedeemSound = (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    initAudioContext();
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, now); // A4
    oscillator.frequency.setValueAtTime(554.37, now + 0.1); // C#5
    oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};
