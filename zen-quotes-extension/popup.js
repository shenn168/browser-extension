document.addEventListener('DOMContentLoaded', function() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  const newQuoteBtn = document.getElementById('new-quote-btn');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const quoteContainer = document.querySelector('.quote-container');

  // Fetch quote on popup open
  fetchQuote();

  // Fetch new quote on button click
  newQuoteBtn.addEventListener('click', fetchQuote);

  async function fetchQuote() {
    // Show loading state
    showLoading(true);
    hideError();

    try {
      // Using ZenQuotes API with a proxy to avoid CORS issues
      // The API returns a random quote
      const response = await fetch('https://zenquotes.io/api/random', {
        method: 'GET',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        displayQuote(data[0].q, data[0].a);
      } else {
        throw new Error('No quote data received');
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      
      // Fallback to local quotes if API fails
      const fallbackQuote = getLocalQuote();
      displayQuote(fallbackQuote.quote, fallbackQuote.author);
    } finally {
      showLoading(false);
    }
  }

  function displayQuote(quote, author) {
    // Remove previous animation class
    quoteContainer.classList.remove('fade-in');
    
    // Trigger reflow to restart animation
    void quoteContainer.offsetWidth;
    
    // Add animation class
    quoteContainer.classList.add('fade-in');
    
    quoteText.textContent = quote;
    quoteAuthor.textContent = author;
  }

  function showLoading(show) {
    if (show) {
      loadingDiv.classList.remove('hidden');
      newQuoteBtn.disabled = true;
      newQuoteBtn.style.opacity = '0.6';
    } else {
      loadingDiv.classList.add('hidden');
      newQuoteBtn.disabled = false;
      newQuoteBtn.style.opacity = '1';
    }
  }

  function showError() {
    errorDiv.classList.remove('hidden');
  }

  function hideError() {
    errorDiv.classList.add('hidden');
  }

  // Fallback quotes in case API is unavailable
  function getLocalQuote() {
    const quotes = [
      { quote: "The mind is everything. What you think you become.", author: "Buddha" },
      { quote: "Peace comes from within. Do not seek it without.", author: "Buddha" },
      { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { quote: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
      { quote: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
      { quote: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
      { quote: "What we think, we become.", author: "Buddha" },
      { quote: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
      { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
      { quote: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha" },
      { quote: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
      { quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
      { quote: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
      { quote: "He who conquers himself is the mightiest warrior.", author: "Confucius" },
      { quote: "The present moment is filled with joy and happiness. If you are attentive, you will see it.", author: "Thich Nhat Hanh" }
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
});