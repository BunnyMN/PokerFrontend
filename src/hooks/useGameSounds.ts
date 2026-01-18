import { useCallback, useRef, useEffect } from 'react';

// Sound URLs - using free sound effects from Mixkit
const SOUND_URLS = {
  cardShuffle: 'https://assets.mixkit.co/active_storage/sfx/2079/2079-preview.mp3',
  cardDeal: 'https://assets.mixkit.co/active_storage/sfx/2074/2074-preview.mp3',
  cardPlay: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3',
  cardSlide: 'https://assets.mixkit.co/active_storage/sfx/2076/2076-preview.mp3',
  yourTurn: 'https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  buttonClick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  pass: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  roundEnd: 'https://assets.mixkit.co/active_storage/sfx/1436/1436-preview.mp3',
};

type SoundType = keyof typeof SOUND_URLS;

export function useGameSounds() {
  const audioRef = useRef<Record<string, HTMLAudioElement | null>>({});
  const isEnabledRef = useRef(true);

  // Preload sounds
  useEffect(() => {
    // Preload all sounds
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.7;
      audioRef.current[key] = audio;
    });

    // Cleanup
    return () => {
      Object.values(audioRef.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRef.current = {};
    };
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    if (!isEnabledRef.current) return;

    try {
      let audio = audioRef.current[type];

      if (!audio) {
        // Create audio element if not cached
        audio = new Audio(SOUND_URLS[type]);
        audio.volume = 0.7;
        audioRef.current[type] = audio;
      }

      // Reset and play
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.log(`[Sound] Failed to play ${type}:`, error);
    }
  }, []);

  const toggleSounds = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
  }, []);

  // Convenience methods
  const playCardShuffle = useCallback(() => playSound('cardShuffle'), [playSound]);
  const playCardDeal = useCallback(() => playSound('cardDeal'), [playSound]);
  const playCardPlay = useCallback(() => playSound('cardPlay'), [playSound]);
  const playCardSlide = useCallback(() => playSound('cardSlide'), [playSound]);
  const playYourTurn = useCallback(() => playSound('yourTurn'), [playSound]);
  const playWin = useCallback(() => playSound('win'), [playSound]);
  const playLose = useCallback(() => playSound('lose'), [playSound]);
  const playButtonClick = useCallback(() => playSound('buttonClick'), [playSound]);
  const playPass = useCallback(() => playSound('pass'), [playSound]);
  const playRoundEnd = useCallback(() => playSound('roundEnd'), [playSound]);

  return {
    playSound,
    toggleSounds,
    playCardShuffle,
    playCardDeal,
    playCardPlay,
    playCardSlide,
    playYourTurn,
    playWin,
    playLose,
    playButtonClick,
    playPass,
    playRoundEnd,
  };
}
