import React, { useState, useRef } from 'react';
import './App.css';

// Fixed API configuration - no duplicates
const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_BASE || 'https://your-backend-app.railway.app/api'
  : process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

const TALLY_FORM_URL = process.env.REACT_APP_TALLY_URL || 'https://tally.so/r/w8gx25';

// Debug logging
console.log('API_BASE:', API_BASE);
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_BASE: process.env.REACT_APP_API_BASE,
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
});

function App() {
  const [currentView, setCurrentView] = useState('intro');
  const [sessionId, setSessionId] = useState(null);
  const [demographicOptions, setDemographicOptions] = useState({});
  const [demographics, setDemographics] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(null);
  //const [userResponse, setUserResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ questionsAnswered: 0, estimatedRemaining: 14 });
  const [results, setResults] = useState(null);

   // ADD THE NEW HOOKS HERE - INSIDE THE COMPONENT
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);
/*
  // Add this useEffect to sync states when question changes
   useEffect(() => {
  if (currentQuestion) {
    setInputValue('');
  }
}, [currentQuestion]);
*/
  // Enhanced error handling
  const handleError = (error, fallbackMessage) => {
    console.error(error);
    setError(fallbackMessage);
    setLoading(false);
  };


  // Clear error when user takes action
  const clearError = () => setError(null);

  // Auto-scroll to current question helper
  const scrollToCurrentQuestion = () => {
    setTimeout(() => {
      const element = document.querySelector('.current-question');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const startAssessment = async () => {
    setLoading(true);
    clearError();
    console.log('Attempting to connect to:', `${API_BASE}/assessment/start`);
    try {
      const response = await fetch(`${API_BASE}/assessment/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      setSessionId(data.sessionId);
      setDemographicOptions(data.demographicOptions);
      setCurrentView('demographics');
    } else {
      throw new Error(data.error || 'Failed to start assessment');
    }
  } catch (error) {
    console.error('Full error details:', error);
    handleError(error, 'Unable to connect to the assessment service. Please check your internet connection and try again.');
  }
  setLoading(false);
};


  const submitDemographics = async () => {
    // Enhanced validation
    const requiredFields = ['ageGroup', 'gender', 'region', 'relationshipStatus'];
    const missingFields = requiredFields.filter(field => !demographics[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.map(field => field.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}`);
      return;
    }

    setLoading(true);
    clearError();
    
    try {
      const response = await fetch(`${API_BASE}/assessment/demographics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          demographics: demographics
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCurrentQuestion(data.question);
        setConversationHistory([{
          type: 'intro',
          content: data.introMessage,
          timestamp: new Date()
        }]);
        setCurrentView('assessment');
      } else {
        throw new Error(data.error || 'Failed to submit demographics');
      }
    } catch (error) {
      handleError(error, 'Failed to save your information. Please try again.');
    }
    setLoading(false);
  };

  const submitResponse = async () => {
  // Get value directly from textarea if inputValue is empty
  let responseValue = inputValue;
  if (!responseValue && textareaRef.current) {
    responseValue = textareaRef.current.value;
  }
  
  if (!responseValue.trim()) {
    setError('Please share your thoughts before continuing.');
    return;
  }

  

  const currentResponse = responseValue.trim();
  setLoading(true);
  clearError();

  const currentQuestionData = currentQuestion;

  try {
    const response = await fetch(`${API_BASE}/assessment/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        questionId: currentQuestion.id,
        response: currentResponse
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      const newHistory = [...conversationHistory, 
        { type: 'question', content: currentQuestionData.text, timestamp: new Date() },
        { type: 'response', content: currentResponse, timestamp: new Date() }
      ];
      setConversationHistory(newHistory);
      
      // Clear both the state and the textarea
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
      
      if (data.complete) {
        setConversationHistory([...newHistory, {
          type: 'completion',
          content: data.message,
          timestamp: new Date()
        }]);
        
        setTimeout(() => {
          getResults();
        }, 1000);
      } else {
        setCurrentQuestion(data.question);
        setProgress(data.progress || progress);
        scrollToCurrentQuestion();
      }
    } else {
      throw new Error(data.error || 'Failed to process response');
    }
  } catch (error) {
    handleError(error, 'Failed to save your response. Please try again.');
  }

  setLoading(false);
};

  const getResults = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await fetch(`${API_BASE}/assessment/results/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setCurrentView('results');
      } else {
        throw new Error(data.error || 'Failed to generate results');
      }
    } catch (error) {
      handleError(error, 'Failed to generate your results. Please try refreshing the page.');
    }
    setLoading(false);
  };

  // Error display component
  const ErrorDisplay = ({ error, onRetry }) => (
    <div className="error-display">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            Try Again
          </button>
        )}
      </div>
    </div>
  );

  const IntroView = () => (
    <div className="intro-container">
      <div className="intro-content">
        <h1>🔍 Relationship Pattern Assessment</h1>
        <div className="intro-description">
          <p>Discover the hidden patterns in your relationship through our confidential assessment.</p>
          <p><strong>Get personalized insights</strong> about your partner's behavior patterns, complete with character references you'll recognize!</p>
        </div>
        
        <div className="intro-features">
          <div className="feature">
            <span className="feature-icon">🎭</span>
            <span><strong>Character Insights:</strong> See your partner's patterns through familiar movie/TV characters</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span><strong>100% Confidential:</strong> Anonymous and secure</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⏱️</span>
            <span><strong>Quick & Easy:</strong> 15 minutes to life-changing insights</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span><strong>Personalized:</strong> Tailored to your demographics and situation</span>
          </div>
        </div>

        <div className="privacy-note">
          <h3>🛡️ Your Safety & Privacy</h3>
          <p>This assessment is completely anonymous. We'll ask for some basic demographic information to provide more relevant character references, but no personal details are stored.</p>
          <p><strong>If you're in immediate danger:</strong> Contact emergency services or the National Domestic Violence Hotline at 1-800-799-7233.</p>
        </div>

        {error && <ErrorDisplay error={error} onRetry={() => { clearError(); startAssessment(); }} />}

        <button 
          className="start-button"
          onClick={startAssessment}
          disabled={loading}
        >
          {loading ? '🔄 Starting...' : '🚀 Start Your Assessment'}
        </button>
      </div>
    </div>
  );

  const DemographicsView = () => (
    <div className="demographics-container">
      <div className="demographics-content">
        <h2>📊 Tell Us About Yourself</h2>
        <p>This helps us provide more relatable character references and personalized insights.</p>

        {error && <ErrorDisplay error={error} />}

        <div className="demographic-form">
          <div className="form-group">
            <label>Age Group *</label>
            <select 
              value={demographics.ageGroup || ''} 
              onChange={(e) => { setDemographics({...demographics, ageGroup: e.target.value}); clearError(); }}
              required
            >
              <option value="">Select age group</option>
              {Object.entries(demographicOptions.ageGroup || {}).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Gender *</label>
            <select 
              value={demographics.gender || ''} 
              onChange={(e) => { setDemographics({...demographics, gender: e.target.value}); clearError(); }}
              required
            >
              <option value="">Select gender</option>
              {Object.entries(demographicOptions.gender || {}).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Region *</label>
            <select 
              value={demographics.region || ''} 
              onChange={(e) => { setDemographics({...demographics, region: e.target.value}); clearError(); }}
              required
            >
              <option value="">Select region</option>
              {Object.entries(demographicOptions.region || {}).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Relationship Status *</label>
            <select 
              value={demographics.relationshipStatus || ''} 
              onChange={(e) => { setDemographics({...demographics, relationshipStatus: e.target.value}); clearError(); }}
              required
            >
              <option value="">Select status</option>
              {Object.entries(demographicOptions.relationshipStatus || {}).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Relationship Duration</label>
            <select 
              value={demographics.relationshipDuration || ''} 
              onChange={(e) => setDemographics({...demographics, relationshipDuration: e.target.value})}
            >
              <option value="">Select duration (optional)</option>
              {Object.entries(demographicOptions.relationshipDuration || {}).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          className="continue-button"
          onClick={submitDemographics}
          disabled={loading}
        >
          {loading ? '🔄 Processing...' : '➡️ Continue to Assessment'}
        </button>
      </div>
    </div>
  );

  const AssessmentView = () => (
    <div className="assessment-container">
      <div className="progress-bar">
        <div className="progress-fill" 
             style={{ width: `${Math.max(5, (progress.questionsAnswered / 14) * 100)}%` }}>
        </div>
        <span className="progress-text">
          Question {progress.questionsAnswered + 1} of 14
        </span>
      </div>

      {error && <ErrorDisplay error={error} onRetry={() => { clearError(); submitResponse(); }} />}

      <div className="conversation">
        {conversationHistory.map((item, index) => (
          <div key={index} className={`message ${item.type}`}>
            {item.type === 'intro' && (
              <div className="intro-message">
                <p>{item.content}</p>
              </div>
            )}
            {item.type === 'question' && (
              <div className="question-message">
                <span className="message-label">💭 Assessment</span>
                <p>{item.content}</p>
              </div>
            )}
            {item.type === 'response' && (
              <div className="response-message">
                <span className="message-label">You</span>
                <p>{item.content}</p>
              </div>
            )}
            {item.type === 'completion' && (
              <div className="completion-message">
                <span className="message-label">✅ Assessment Complete</span>
                <p>{item.content}</p>
                <div className="generating-results">
                  <p><em>🔄 Generating your personalized results...</em></p>
                </div>
              </div>
            )}
          </div>
        ))}

        {currentQuestion && (
          <div className="current-question">
            <div className="question-message">
              <span className="message-label">💭 Assessment</span>
              <p>{currentQuestion.text}</p>
            </div>
          </div>
        )}
      </div>

      {currentQuestion && (
  <div className="response-input" style={{ direction: 'ltr' }}>
    <textarea
      key={`textarea-${currentQuestion.id}`}
      ref={textareaRef}
      placeholder="Share your thoughts here... Be as detailed as you'd like."
      rows={4}
      disabled={loading}
      autoFocus
      style={{
        direction: 'ltr',
        textAlign: 'left',
        unicodeBidi: 'normal',
        writingMode: 'horizontal-tb',
        fontFamily: 'inherit'
      }}
      dir="ltr"
    />
    <button 
      onClick={async () => {
        const value = textareaRef.current?.value || '';
        if (!value.trim()) {
          setError('Please share your thoughts before continuing.');
          return;
        }
        
        clearError();
        setLoading(true);

        const currentResponse = value.trim();
        const currentQuestionData = currentQuestion;

        try {
          const response = await fetch(`${API_BASE}/assessment/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              questionId: currentQuestion.id,
              response: currentResponse
            })
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            const newHistory = [...conversationHistory, 
              { type: 'question', content: currentQuestionData.text, timestamp: new Date() },
              { type: 'response', content: currentResponse, timestamp: new Date() }
            ];
            setConversationHistory(newHistory);
            
            // Clear the textarea
            if (textareaRef.current) {
              textareaRef.current.value = '';
            }
            
            if (data.complete) {
              setConversationHistory([...newHistory, {
                type: 'completion',
                content: data.message,
                timestamp: new Date()
              }]);
              
              setTimeout(() => {
                getResults();
              }, 1000);
            } else {
              setCurrentQuestion(data.question);
              setProgress(data.progress || progress);
              scrollToCurrentQuestion();
            }
          } else {
            throw new Error(data.error || 'Failed to process response');
          }
        } catch (error) {
          handleError(error, 'Failed to save your response. Please try again.');
        }

        setLoading(false);
      }}
      disabled={loading}
      className="submit-button"
    >
      {loading ? '🔄 Processing...' : '➡️ Continue'}
    </button>
  </div>
)}
    </div>
  );

  const ResultsView = () => {
    const [feedbackShown, setFeedbackShown] = useState(false);
    const [quickRating, setQuickRating] = useState(0);
    const [mostHelpful, setMostHelpful] = useState('');

    const submitQuickFeedback = async () => {
      try {
        await fetch(`${API_BASE}/assessment/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            quickRating,
            mostHelpful
          })
        });
        setFeedbackShown(true);
      } catch (error) {
        console.error('Feedback error:', error);
        // Don't block user if feedback fails
      }
    };

    return (
      <div className="results-container">
        <div className="results-content">
          <div className="greeting-section">
            <h1>{results?.persona?.greeting || "Hey gorgeous! 🤗"}</h1>
            <div className="empathy-opener">
              <p>{results?.persona?.empathyOpener || "Let me share what I'm seeing..."}</p>
            </div>
          </div>

          <div className="persona-reveal">
            <h2>Your Partner Seems to Be... "{results?.persona?.title || 'Complex'}" 🎭</h2>
            <div className="main-message">
              <h3>{results?.persona?.mainMessage || "Let's talk about what I'm noticing..."}</h3>
            </div>
            <div className="caring-message">
              <p>{results?.persona?.caring || "I want you to know that your feelings are valid."}</p>
            </div>
            <div className="worry-message">
              <p><em>{results?.persona?.worry || "I'm here to support you through this."}</em></p>
            </div>
          </div>

          {results?.characters?.length > 0 ? (
            <div className="character-section">
              <h3>🎬 Okay, so picture these characters... do any ring a bell?</h3>
              <p><em>I picked these based on what you told me about yourself - I think you'll recognize the patterns:</em></p>
              
              <div className="character-cards">
                {results.characters.map((character, index) => (
                  <div key={index} className="character-card">
                    <h4>{character.name} <em>({character.source})</em></h4>
                    <div className="character-quote">"{character.quote}"</div>
                    <div className="character-description">- {character.description}</div>
                  </div>
                ))}
              </div>
              
              <p className="character-note">
                <em>Baby, if you're nodding along to any of these, we need to talk more. Like, seriously. 💕</em>
              </p>
            </div>
          ) : (
            <div className="character-section">
              <h3>🎬 Character Analysis</h3>
              <p><em>Your situation is unique, and while we couldn't find specific character matches, your experiences are still valid and important.</em></p>
            </div>
          )}

          <div className="scenario-analysis">
            <h3>💭 Let's look at what's really happening, sweetie...</h3>
            <p><em>I'm going to break this down for you because sometimes when you're in it, it's hard to see clearly:</em></p>
            
            {Object.entries(results?.scenarioAnalysis || {}).map(([scenario, data]) => (
              <div key={scenario} className="scenario-item">
                <h4>{data.icon} {data.friendlyName}</h4>
                <div className="reality-check">
                  <strong>Reality Check:</strong> <em>{data.level}</em> {data.emoji}
                </div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: `${Math.min(100, Math.max(5, data.score))}%` }}></div>
                  <span className="score-text">{data.score}%</span>
                </div>
                <div className="what-this-means">
                  <strong>What this means:</strong> {data.description}
                </div>
                <div className="gentle-advice">
                  <em>{data.advice}</em>
                </div>
              </div>
            ))}
          </div>

          {results?.persona?.livingReality && (
            <div className="living-reality">
              <h3>💔 Honey, let's talk about what this is doing to YOU...</h3>
              <p><em>I can see this in your messages, in how you talk about yourself now:</em></p>
              <ul>
                {results.persona.livingReality.map((reality, index) => (
                  <li key={index}>{reality}</li>
                ))}
              </ul>
              <div className="validation">
                <p><strong><em>Babe, none of this is your fault. Read that again. NONE of this is your fault. 💕</em></strong></p>
              </div>
            </div>
          )}

          <div className="encouragement-section">
            <h3>🤗 Here's what your big sister wants you to know...</h3>
            <div className="encouragement-item">
              <h4>{results?.encouragement?.main || "You're Not Crazy 🧠"}</h4>
              <p>{results?.encouragement?.message || "Your feelings are valid and your instincts are trying to protect you."}</p>
            </div>
            <div className="strength-message">
              <p><em>{results?.encouragement?.strength || "You're stronger than you know. 💕"}</em></p>
            </div>
          </div>

          <div className="gentle-advice-section">
            <h3>💌 Some gentle advice from someone who cares...</h3>
            <div className="age-specific-advice">
              <p>{results?.gentleAdvice?.main || "Take care of yourself and trust your instincts."}</p>
              {results?.gentleAdvice?.followUp && (
                <p><em>{results.gentleAdvice.followUp}</em></p>
              )}
          </div>
        </div>

          <div className="support-section">
            <h3>🆘 Sweetie, if you ever feel scared or unsafe...</h3>
            <p><em>Promise me you'll reach out, okay? I'm worried about you.</em></p>
            
            <div className="resources-list">
              {results?.supportResources?.map((resource, index) => (
                <div key={index} className="resource-item">
                  <h4>{resource.name}</h4>
                  <p><strong>{resource.contact}</strong></p>
                  <p>{resource.description}</p>
                  <p><em>{resource.note}</em></p>
                </div>
              )) || (
                <div className="resource-item">
                  <h4>National Domestic Violence Hotline</h4>
                  <p><strong>1-800-799-7233 (24/7)</strong></p>
                  <p>Confidential support from people who understand 💕</p>
                </div>
              )}
            </div>
          </div>

          <div className="feedback-section">
            <h3>📝 Before you go, can you help me help others?</h3>
            <p><em>Your story could help another girl who's going through the same thing:</em></p>
            
            {!feedbackShown ? (
              <div className="quick-feedback-form">
                <div className="feedback-question">
                  <p><strong>How did this feel to read?</strong></p>
                  <div className="rating-options">
                    {[
                      { emoji: '😭', text: 'Oh my god, this is exactly my situation' },
                      { emoji: '😳', text: 'Some of this feels familiar' },
                      { emoji: '🤔', text: 'Made me think about some things' },
                      { emoji: '😕', text: 'Not really my experience' }
                    ].map((option, index) => (
                      <button 
                        key={index}
                        className={`rating-btn ${quickRating === index + 1 ? 'selected' : ''}`}
                        onClick={() => setQuickRating(index + 1)}
                      >
                        {option.emoji} {option.text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="helpful-question">
                  <p><strong>What helped you most?</strong></p>
                  <div className="helpful-options">
                    {[
                      '💭 Finally feeling understood',
                      '🎬 The character examples', 
                      '📊 Seeing the patterns laid out',
                      '💕 The supportive, caring tone'
                    ].map((option, index) => (
                      <button
                        key={index}
                        className={`helpful-btn ${mostHelpful === option ? 'selected' : ''}`}
                        onClick={() => setMostHelpful(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  className="submit-feedback-btn"
                  onClick={submitQuickFeedback}
                  disabled={!quickRating}
                >
                  Share Quick Feedback
                </button>
              </div>
            ) : (
              <div className="feedback-thanks">
                <p>🙏 <strong>Thank you for helping others, sweetie!</strong></p>
              </div>
            )}

            <button 
              className="detailed-feedback-btn"
              onClick={() => window.open(TALLY_FORM_URL, '_blank')}
            >
              📋 Share more thoughts here →
            </button>
          </div>

          <div className="disclaimer-section">
            <h3>{results?.disclaimer?.main || "One last hug, sweetie... 💕"}</h3>
            <p>{results?.disclaimer?.message || "You're doing the best you can with what you know right now."}</p>
            <p>{results?.disclaimer?.reality || "Maybe this resonates completely, maybe it doesn't. That's okay too."}</p>
            <p>{results?.disclaimer?.gentle || "Just... please be gentle with yourself. 🤗"}</p>
            <p><em>{results?.disclaimer?.disclaimer || "This reflection is based on our conversation and what you shared."}</em></p>
            <p><strong>{results?.disclaimer?.closing || "You've got this, babe. Even when it doesn't feel like it. 💪💕"}</strong></p>
            <div className="signature">
              <p>{results?.disclaimer?.signature || "💕 Sending you love and strength"}</p>
              <p><em>{results?.disclaimer?.ps || "You're not alone in this. 💕"}</em></p>
            </div>
          </div>

          <div className="results-actions">
            <button onClick={() => window.print()} className="print-button">
              🖨️ Save/Print Results
            </button>
            <button onClick={() => window.location.reload()} className="restart-button">
              🔄 Take Assessment Again
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      {currentView === 'intro' && <IntroView />}
      {currentView === 'demographics' && <DemographicsView />}
      {currentView === 'assessment' && <AssessmentView />}
      {currentView === 'results' && <ResultsView />}
    </div>
  );
}

export default App;