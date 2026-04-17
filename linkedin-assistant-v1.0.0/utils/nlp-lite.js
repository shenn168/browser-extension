/*  ================================================
    LinkedLens — Lightweight NLP (Zero Dependencies)
    ================================================ */

const LLSentiment = {
  // ~400 word dictionary covering professional/LinkedIn context
  dictionary: {
    // Strong Positive (+3)
    "exceptional": 3, "outstanding": 3, "thrilled": 3, "incredible": 3,
    "phenomenal": 3, "extraordinary": 3, "remarkable": 3, "brilliant": 3,
    "amazing": 3, "fantastic": 3, "excellent": 3, "superb": 3,

    // Positive (+2)
    "excited": 2, "proud": 2, "grateful": 2, "delighted": 2, "love": 2,
    "great": 2, "wonderful": 2, "successful": 2, "achievement": 2,
    "innovative": 2, "transformative": 2, "inspiring": 2, "passionate": 2,
    "celebrate": 2, "congratulations": 2, "congrats": 2, "milestone": 2,
    "promotion": 2, "awarded": 2, "launched": 2, "growth": 2,
    "opportunity": 2, "thriving": 2, "empowering": 2, "breakthrough": 2,

    // Mild Positive (+1)
    "good": 1, "nice": 1, "happy": 1, "pleased": 1, "helpful": 1,
    "interesting": 1, "valuable": 1, "useful": 1, "effective": 1,
    "positive": 1, "improve": 1, "progress": 1, "benefit": 1,
    "learn": 1, "learned": 1, "growing": 1, "building": 1,
    "collaboration": 1, "teamwork": 1, "creative": 1, "solution": 1,
    "recommend": 1, "enjoy": 1, "agree": 1, "support": 1,
    "hiring": 1, "join": 1, "welcome": 1, "talent": 1,
    "motivated": 1, "driven": 1, "focused": 1, "committed": 1,

    // Neutral (0)
    "think": 0, "believe": 0, "consider": 0, "maybe": 0,
    "perhaps": 0, "however": 0, "although": 0, "update": 0,
    "announce": 0, "share": 0, "opinion": 0, "perspective": 0,

    // Mild Negative (-1)
    "difficult": -1, "challenge": -1, "challenging": -1, "concern": -1,
    "worried": -1, "issue": -1, "problem": -1, "struggle": -1,
    "hard": -1, "tough": -1, "unfortunately": -1, "decline": -1,
    "slow": -1, "miss": -1, "missed": -1, "risk": -1,
    "uncertain": -1, "confusing": -1, "complicated": -1, "delay": -1,

    // Negative (-2)
    "bad": -2, "poor": -2, "fail": -2, "failed": -2, "failure": -2,
    "disappoint": -2, "disappointed": -2, "frustrating": -2, "frustrated": -2,
    "layoff": -2, "layoffs": -2, "fired": -2, "downsizing": -2,
    "recession": -2, "crisis": -2, "toxic": -2, "burnout": -2,
    "quit": -2, "resign": -2, "rejected": -2, "rejection": -2,

    // Strong Negative (-3)
    "terrible": -3, "horrible": -3, "devastating": -3, "disaster": -3,
    "catastrophe": -3, "worst": -3, "awful": -3, "abysmal": -3,
    "scam": -3, "fraud": -3, "corrupt": -3, "exploitation": -3
  },

  // Negation words that flip sentiment
  negators: new Set([
    "not", "no", "never", "neither", "nobody", "nothing",
    "nowhere", "nor", "cannot", "cant", "can't", "don't",
    "doesn't", "didn't", "won't", "wouldn't", "shouldn't",
    "isn't", "aren't", "wasn't", "weren't", "hardly", "barely"
  ]),

  // Intensifiers that amplify
  intensifiers: {
    "very": 1.5, "extremely": 2, "incredibly": 2, "really": 1.5,
    "absolutely": 2, "truly": 1.5, "highly": 1.5, "deeply": 1.5,
    "so": 1.3, "quite": 1.2, "remarkably": 1.5
  },

  analyze(text) {
    if (!text || typeof text !== 'string') {
      return { score: 0, normalized: 0, label: 'neutral', confidence: 0, words: [] };
    }

    const clean = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 1);

    let totalScore = 0;
    let scoredWords = [];
    let scoredCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let wordScore = this.dictionary[word];

      if (wordScore === undefined) continue;

      // Check for negation in previous 3 words
      let negated = false;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (this.negators.has(words[j])) {
          negated = true;
          break;
        }
      }

      if (negated) wordScore = -wordScore;

      // Check for intensifier in previous word
      if (i > 0 && this.intensifiers[words[i - 1]]) {
        wordScore = Math.round(wordScore * this.intensifiers[words[i - 1]]);
      }

      totalScore += wordScore;
      scoredCount++;
      scoredWords.push({ word, score: wordScore });
    }

    const normalized = scoredCount > 0 ? totalScore / scoredCount : 0;
    const confidence = Math.min(scoredCount / Math.max(words.length * 0.1, 1), 1);

    let label;
    if (normalized > 0.5) label = 'positive';
    else if (normalized < -0.5) label = 'negative';
    else label = 'neutral';

    return {
      score: totalScore,
      normalized: Math.round(normalized * 100) / 100,
      label,
      confidence: Math.round(confidence * 100) / 100,
      words: scoredWords.slice(0, 10)
    };
  },

  // Flesch-Kincaid readability
  readability(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, w) => sum + this.countSyllables(w), 0);

    if (words.length === 0 || sentences.length === 0) {
      return { grade: 0, ease: 100, level: 'Very Easy' };
    }

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const ease = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    const grade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

    let level;
    if (ease >= 80) level = 'Easy';
    else if (ease >= 60) level = 'Standard';
    else if (ease >= 40) level = 'Moderate';
    else if (ease >= 20) level = 'Difficult';
    else level = 'Very Difficult';

    return {
      grade: Math.max(0, Math.round(grade * 10) / 10),
      ease: Math.round(Math.max(0, Math.min(100, ease))),
      level,
      wordCount: words.length,
      sentenceCount: sentences.length,
      readTime: Math.max(1, Math.ceil(words.length / 200))
    };
  },

  countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 2) return 1;
    word = word.replace(/e$/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
  }
};