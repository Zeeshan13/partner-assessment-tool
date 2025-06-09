const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// =============================================================================
// DATA MODELS & CONFIGURATIONS
// =============================================================================

const DEMOGRAPHIC_OPTIONS = {
  ageGroup: {
    '18-24': 'Young Adult (18-24)',
    '25-34': 'Adult (25-34)',
    '35-44': 'Middle Adult (35-44)', 
    '45-54': 'Mature Adult (45-54)',
    '55+': 'Senior Adult (55+)'
  },
  gender: {
    'female': 'Female',
    'male': 'Male',
    'non-binary': 'Non-binary',
    'prefer-not-to-say': 'Prefer not to say'
  },
  region: {
    'north-america': 'North America',
    'europe': 'Europe',
    'asia': 'Asia',
    'africa': 'Africa',
    'south-america': 'South America',
    'oceania': 'Oceania',
    'middle-east': 'Middle East'
  },
  relationshipStatus: {
    'dating': 'Dating/In a relationship (not living together)',
    'living-together': 'Living together/Cohabiting',
    'engaged': 'Engaged',
    'married': 'Married',
    'complicated': 'It\'s complicated',
    'considering-leaving': 'Considering ending the relationship'
  },
  relationshipDuration: {
    'less-6-months': 'Less than 6 months',
    '6-months-2-years': '6 months to 2 years',
    '2-5-years': '2-5 years',
    '5-10-years': '5-10 years',
    'more-10-years': 'More than 10 years'
  }
};

const QUESTION_BANK = [
  {
    id: 'opener_1',
    text: "I'd like to understand your relationship dynamics better. Let's start with something simple - when you and your partner need to decide on everyday things like where to go for dinner or what to watch, how does that usually play out?",
    stage: 'opening'
  },
  {
    id: 'decision_1',
    text: "How do you feel when that happens? What do you typically do in response?",
    stage: 'decision_making'
  },
  {
    id: 'decision_2',
    text: "What about bigger decisions - like financial choices, social plans, or things that affect both of your lives?",
    stage: 'decision_making'
  },
  {
    id: 'communication_1',
    text: "When you have different viewpoints on something, what typically happens during those conversations?",
    stage: 'communication'
  },
  {
    id: 'communication_2',
    text: "How do you feel after those conversations? Does your partner acknowledge your perspective?",
    stage: 'communication'
  },
  {
    id: 'social_1',
    text: "How does your partner respond when you want to spend time with friends or family?",
    stage: 'social'
  },
  {
    id: 'social_2',
    text: "How has this affected your relationships with friends and family over time?",
    stage: 'social'
  },
  {
    id: 'emotional_1',
    text: "When you're having a difficult day or going through something stressful, how does your partner typically respond?",
    stage: 'emotional'
  },
  {
    id: 'emotional_2',
    text: "What about when you achieve something positive or have good news to share?",
    stage: 'emotional'
  },
  {
    id: 'boundaries_1',
    text: "Can you think of times when you've tried to set a boundary or express a need? How does your partner typically respond?",
    stage: 'boundaries'
  },
  {
    id: 'boundaries_2',
    text: "What about physical boundaries or personal space?",
    stage: 'boundaries'
  },
  {
    id: 'patterns_1',
    text: "Looking at your relationship overall, do you notice any patterns in how conflicts or difficult periods tend to unfold?",
    stage: 'patterns'
  },
  {
    id: 'safety_1',
    text: "Have you ever felt afraid of your partner's reaction to something you might say or do?",
    stage: 'safety'
  },
  {
    id: 'final_1',
    text: "Is there anything else about your relationship dynamics that you think would be helpful for me to understand?",
    stage: 'final'
  }
];

const PERSONAS = {
  'The Puppet Master': {
    title: "The Puppet Master",
    greeting: "Hey gorgeous! 🤗 Let's chat about what I'm seeing...",
    empathyOpener: "Okay, so I've been listening to everything you shared with me, and honey... I need to sit down with you for a heart-to-heart. You know how sometimes you need that one friend who'll tell you the truth with love? That's me right now. 💕",
    mainMessage: "Sweetie, this is giving me some serious manipulation vibes, but like... in your actual relationship. 😬",
    caring: "Listen babe, I don't want to alarm you, but from everything you've told me, your partner might be playing some pretty sophisticated mind games. I know this might be hard to hear because when you love someone, you want to see the best in them. But girl, your feelings are valid, and what you're experiencing isn't normal relationship stuff. 💙",
    worry: "And honey, I'm worried about you. Really worried. 🤗",
    riskLevel: 'high-concern',
    livingReality: [
      '🎭 Walking on Eggshells: You\'re probably exhausted from trying to keep them happy',
      '🧠 Second-Guessing Everything: Started questioning your own memory lately?',
      '👻 Feeling Invisible: Your friends don\'t call as much anymore, do they?',
      '📱 Digital Anxiety: Your phone feels more like a tracking device',
      '💔 Losing Yourself: Remember who you were before this relationship?'
    ]
  },
  'The Intimidator': {
    title: "The Intimidator",
    greeting: "Oh sweetie... 🤗 Come sit with me for a sec...",
    empathyOpener: "I've been thinking about everything you shared, and my heart is just... heavy for you right now. You know that feeling when someone you care about is going through something and you just want to wrap them in a hug? That's me right now. 💕",
    mainMessage: "Honey, I'm getting some serious 'walking on eggshells' energy from what you've told me. 😔",
    caring: "Babe, relationships aren't supposed to feel like you're constantly bracing for impact. I can hear in your words how tired you must be from all this tension. That hypervigilance? That's your body trying to protect you, and we need to listen to it. 🤗",
    worry: "I'm genuinely concerned about how this is affecting your peace of mind, love. 💙",
    riskLevel: 'safety-concern',
    livingReality: [
      '😰 Constant Alert Mode: You\'ve become a mind reader just to survive',
      '🗣️ Volume Wars: Normal conversations somehow become battles',
      '🎯 Always the Problem: Everything seems to circle back to being your fault',
      '🏃‍♀️ Escape Planning: You catch yourself looking for exits',
      '🤐 Self-Editing: You rehearse conversations before having them'
    ]
  },
  'The Clinger': {
    title: "The Clinger",
    greeting: "Hey beautiful! 🤗 Let's have a heart-to-heart...",
    empathyOpener: "So I've been processing everything you shared with me, and oh honey... I can feel how suffocated you must be feeling right now. Sometimes love can feel more like being wrapped in plastic wrap than a warm hug, you know? 💕",
    mainMessage: "Sweetie, this is giving me major 'lost my personal space' vibes. 😅",
    caring: "I know they probably call it love, and maybe you do too. But babe, healthy love doesn't make you feel like you can't breathe. You're allowed to exist as your own person, even in a relationship. Actually, especially in a relationship. 🤗",
    worry: "I'm worried you might be forgetting who you are outside of this relationship, love. 💙",
    riskLevel: 'space-concern',
    livingReality: [
      '📱 Digital Leash: They know your online activity better than you do',
      '👥 Social Desert: Friends slowly disappeared from your life',
      '🕰️ Time Audit: Every minute needs to be explained',
      '🎭 Guilt Shows: Oscar-worthy performances when you want alone time',
      '🚪 Permission Needed: Leaving feels like a negotiation'
    ]
  }
};

const CHARACTER_REFERENCES = {
  'north-america': {
    'The Puppet Master': {
      female: {
        '18-24': [
          { name: 'Regina George', source: 'Mean Girls', quote: 'Oh, you\'re upset? That\'s... interesting.', description: 'Makes being mean sound like caring' },
          { name: 'Amy Dunne', source: 'Gone Girl', quote: 'I was told love should feel natural, easy...', description: 'Creates elaborate scenarios to test your loyalty' },
          { name: 'Joe Goldberg', source: 'You', quote: 'Everything I do is because I love you SO much.', description: 'Makes stalking sound romantic (spoiler: it\'s not)' }
        ],
        '25-34': [
          { name: 'Christian Grey', source: '50 Shades', quote: 'I know what\'s best for you.', description: 'Your boundaries are more like suggestions they ignore' },
          { name: 'Blair Waldorf', source: 'Gossip Girl', quote: 'I\'m not controlling, I\'m organizing your life.', description: 'Disguises control as care and concern' }
        ],
        '35+': [
          { name: 'Frank Underwood', source: 'House of Cards', quote: 'Everything is about control.', description: 'Politics and manipulation in personal relationships' },
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'Love is weakness.', description: 'Uses love as a weapon rather than a gift' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Joe Goldberg', source: 'You', quote: 'I would do anything for you.', description: 'Monitors your life like it\'s his job' },
          { name: 'Christian Grey', source: '50 Shades', quote: 'I\'m fifty shades of f*cked up.', description: 'Uses trauma as an excuse for control' }
        ],
        '25-34': [
          { name: 'Gatsby', source: 'The Great Gatsby', quote: 'I\'ve been waiting for you all my life.', description: 'Creates fantasy versions of who you should be' },
          { name: 'Edward Cullen', source: 'Twilight', quote: 'You are my life now.', description: 'Possessive behavior disguised as deep love' }
        ],
        '35+': [
          { name: 'Walter White', source: 'Breaking Bad', quote: 'I did it for the family.', description: 'Justifies harmful behavior as protection' },
          { name: 'Tony Soprano', source: 'The Sopranos', quote: 'I\'m doing this for us.', description: 'Control freak with anger management issues' }
        ]
      }
    }
  }
};

const SCENARIO_ANALYSIS = {
  'Decision-Making Dynamics': {
    friendlyName: 'How Decisions Get Made',
    icon: '🎭',
    levels: {
      high: { label: 'Your voice seems to have gone missing', description: 'Remember when you used to have opinions about things? Yeah, those apparently don\'t matter anymore.', advice: 'Honey, in healthy relationships, both people get a vote. Not just one person deciding and the other saying "okay, sure." 💭', emoji: '😔' },
      medium: { label: 'Mostly their show, you\'re the audience', description: 'You get consulted sometimes, but final decisions? That\'s their department.', advice: 'Babe, being asked for your opinion after they\'ve decided isn\'t the same as making decisions together. 🤗', emoji: '😐' },
      low: { label: 'True partnership vibes', description: 'Decisions get made together, with both voices heard and respected.', advice: 'This is what healthy decision-making looks like! Both people matter. 💕', emoji: '😊' }
    }
  },
  'Conflict Resolution Patterns': {
    friendlyName: 'How Arguments Go Down',
    icon: '🎪',
    levels: {
      high: { label: 'You\'re always the villain in their story', description: 'Fights don\'t get resolved, they get... choreographed? You end up apologizing for things that happened TO you.', advice: 'Babe, healthy arguments end with understanding, not you questioning your sanity. 🤗', emoji: '😞' },
      medium: { label: 'Drama with occasional resolution', description: 'Arguments are intense and you often feel unheard, but sometimes things get worked out.', advice: 'Sweetie, conflict shouldn\'t leave you feeling emotionally drained every time. 💙', emoji: '😟' },
      low: { label: 'Healthy conflict resolution', description: 'Disagreements happen, but they\'re handled with respect and care for each other.', advice: 'This is beautiful! Conflict handled with love and respect. 💕', emoji: '😊' }
    }
  },
  'Social Connection Control': {
    friendlyName: 'What Happened to Your People',
    icon: '👥',
    levels: {
      high: { label: 'Your social circle got mysteriously smaller', description: 'Remember Sarah from college? And your cousin you used to be close with? Funny how they all became "drama" right around the time your partner showed up.', advice: 'Sweetie, people who love you want you to have OTHER people who love you too. 💕', emoji: '😢' },
      medium: { label: 'Some friends got the cold shoulder', description: 'Your partner has strong opinions about certain people in your life.', advice: 'Honey, it\'s okay to have preferences, but isolating you from support isn\'t love. 🤗', emoji: '😕' },
      low: { label: 'Supportive of your connections', description: 'They encourage your friendships and enjoy spending time with your people.', advice: 'This is lovely! A partner who celebrates your other relationships. 💕', emoji: '😊' }
    }
  },
  'Emotional Support Quality': {
    friendlyName: 'Emotional Support Situation',
    icon: '💙',
    levels: {
      high: { label: 'Support comes with strings attached', description: 'When you need comfort, somehow it becomes about them. Your problems become their spotlight moments.', advice: 'Real support doesn\'t come with a bill or conditions attached. 🤗', emoji: '😔' },
      medium: { label: 'Hit or miss support', description: 'Sometimes they\'re great, sometimes they\'re not really present.', advice: 'Consistency in emotional support matters, love. You deserve reliable care. 🤗', emoji: '😐' },
      low: { label: 'Genuinely supportive', description: 'They\'re there for you when you need them, no strings attached.', advice: 'This is what caring support looks like! Someone who shows up for you. 💕', emoji: '😊' }
    }
  },
  'Boundary Respect': {
    friendlyName: 'Boundary Respect',
    icon: '🚧',
    levels: {
      high: { label: 'What boundaries?', description: '"No" seems to be a foreign word they\'re still learning. Your phone, your space, your time - apparently it\'s all community property now?', advice: 'Darling, "no" is a complete sentence. You shouldn\'t have to explain or justify your boundaries. 💪', emoji: '😟' },
      medium: { label: 'Usually respectful', description: 'Most of the time they respect your limits, with occasional testing.', advice: 'Progress! Though boundaries should always be respected, not sometimes. 💭', emoji: '😌' },
      low: { label: 'Respects your boundaries', description: 'They understand and honor your limits consistently.', advice: 'Beautiful! This is what respect looks like in action. 💕', emoji: '😊' }
    }
  }
};

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const sessions = new Map();

class AssessmentSession {
  constructor(sessionId) {
    this.id = sessionId;
    this.demographics = {};
    this.conversationHistory = [];
    this.currentQuestionIndex = 0;
    this.responses = [];
    this.analysisResults = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  setDemographics(demographics) {
    this.demographics = demographics;
    this.lastActivity = new Date();
  }

  addResponse(question, response) {
    this.responses.push({
      questionId: question.id,
      questionText: question.text,
      response: response,
      timestamp: new Date()
    });
    this.conversationHistory.push(
      { type: 'question', content: question.text, timestamp: new Date() },
      { type: 'response', content: response, timestamp: new Date() }
    );
    this.lastActivity = new Date();
  }

  setAnalysisResults(results) {
    this.analysisResults = results;
    this.lastActivity = new Date();
  }
}

// =============================================================================
// SIMPLE ANALYSIS ENGINE
// =============================================================================

class SimpleAnalysisEngine {
  analyzeResponses(responses, demographics) {
    let controlScore = 0;
    let manipulationScore = 0;
    let isolationScore = 0;
    let supportScore = 0;
    let boundaryScore = 0;

    const responseText = responses.map(r => r.response.toLowerCase()).join(' ');

    // Control indicators
    if (responseText.includes('decides for') || responseText.includes('without asking') || 
        responseText.includes('takes charge') || responseText.includes('controls')) {
      controlScore += 30;
    }
    if (responseText.includes('my opinion doesn\'t matter') || responseText.includes('ignores what I want')) {
      controlScore += 25;
    }

    // Manipulation indicators
    if (responseText.includes('makes me feel crazy') || responseText.includes('questioning myself') ||
        responseText.includes('gaslighting') || responseText.includes('twist my words')) {
      manipulationScore += 35;
    }
    if (responseText.includes('guilt') || responseText.includes('blame me')) {
      manipulationScore += 20;
    }

    // Isolation indicators
    if (responseText.includes('don\'t see friends') || responseText.includes('isolates me') ||
        responseText.includes('friends disappeared') || responseText.includes('doesn\'t like my family')) {
      isolationScore += 40;
    }

    // Support indicators (inverse scoring)
    if (responseText.includes('not supportive') || responseText.includes('makes it about them') ||
        responseText.includes('dismisses my feelings')) {
      supportScore += 30;
    }

    // Boundary indicators
    if (responseText.includes('ignores my no') || responseText.includes('doesn\'t respect') ||
        responseText.includes('goes through my phone') || responseText.includes('violates privacy')) {
      boundaryScore += 35;
    }

    // Determine persona based on scores
    const totalScore = controlScore + manipulationScore + isolationScore + supportScore + boundaryScore;
    let persona = 'The Clinger';

    if (manipulationScore > 40 || (controlScore > 25 && manipulationScore > 20)) {
      persona = 'The Puppet Master';
    } else if (controlScore > 35 || (controlScore > 20 && boundaryScore > 25)) {
      persona = 'The Intimidator';
    }

    return {
      persona: persona,
      scenarioScores: {
        'Decision-Making Dynamics': Math.min(100, controlScore * 2),
        'Conflict Resolution Patterns': Math.min(100, manipulationScore * 2),
        'Social Connection Control': Math.min(100, isolationScore * 2),
        'Emotional Support Quality': Math.min(100, supportScore * 2),
        'Boundary Respect': Math.min(100, boundaryScore * 2)
      },
      riskLevel: totalScore > 100 ? 'high' : totalScore > 50 ? 'medium' : 'low'
    };
  }
}

// =============================================================================
// RESULTS GENERATOR
// =============================================================================

class ResultsGenerator {
  constructor() {
    this.analysisEngine = new SimpleAnalysisEngine();
  }

  generateResults(session) {
    const analysis = this.analysisEngine.analyzeResponses(session.responses, session.demographics);
    const persona = PERSONAS[analysis.persona];
    const characters = this.getCharacterReferences(analysis.persona, session.demographics);
    const scenarioAnalysis = this.generateScenarioAnalysis(analysis.scenarioScores);

    return {
      persona: persona,
      characters: characters,
      scenarioAnalysis: scenarioAnalysis,
      encouragement: this.generateEncouragement(analysis.riskLevel),
      gentleAdvice: this.generateGentleAdvice(session.demographics),
      supportResources: this.getSupportResources(),
      disclaimer: this.generateDisclaimer()
    };
  }

  getCharacterReferences(personaName, demographics) {
    const region = demographics.region || 'north-america';
    const gender = demographics.gender || 'female';
    const ageGroup = this.getAgeCategory(demographics.ageGroup);

    const regionData = CHARACTER_REFERENCES[region];
    if (!regionData || !regionData[personaName]) return [];

    const personaData = regionData[personaName];
    const genderData = personaData[gender] || personaData['female'];
    if (!genderData) return [];

    return genderData[ageGroup] || genderData['18-24'] || [];
  }

  getAgeCategory(ageGroup) {
    if (ageGroup === '18-24') return '18-24';
    if (['25-34'].includes(ageGroup)) return '25-34';
    return '35+';
  }

  generateScenarioAnalysis(scenarioScores) {
    const analysis = {};
    
    for (const [scenarioName, score] of Object.entries(scenarioScores)) {
      const scenario = SCENARIO_ANALYSIS[scenarioName];
      const level = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
      const levelData = scenario.levels[level];
      
      analysis[scenarioName] = {
        score: Math.round(score),
        friendlyName: scenario.friendlyName,
        level: levelData.label,
        description: levelData.description,
        advice: levelData.advice,
        emoji: levelData.emoji,
        icon: scenario.icon
      };
    }
    
    return analysis;
  }

  generateEncouragement(riskLevel) {
    return {
      main: "You're Not Crazy 🧠",
      message: "Everything you're feeling? Valid. Every weird interaction that made you uncomfortable? Trust that feeling. Your instincts are trying to protect you.",
      strength: "You're stronger than you know, smarter than you've been told, and worthy of so much more than what you're getting. 💕"
    };
  }

  generateGentleAdvice(demographics) {
    const ageSpecific = {
      '18-24': "Sweetie, I know this might be one of your first serious relationships, and that makes it even harder to know what's normal. Trust me when I say this: you're not being dramatic, you're not expecting too much, and you deserve better. 💕",
      '25-34': "Honey, I know you might be thinking about timelines and 'what if this is as good as it gets?' But settling for less than you deserve won't make you happy in the long run. You still have so much life ahead of you. 🤗",
      '35+': "I know it might feel like starting over is too scary or too late, but babe - you deserve happiness at every age. Your experience and wisdom are assets, not limitations. 💪"
    };

    return ageSpecific[demographics.ageGroup] || ageSpecific['25-34'];
  }

  getSupportResources() {
    return [
      {
        name: "National Domestic Violence Hotline",
        contact: "1-800-799-7233 (24/7)",
        description: "Confidential support from people who understand 💕",
        note: "They have chat and text options too if calling feels scary"
      },
      {
        name: "Crisis Text Line", 
        contact: "Text HOME to 741741",
        description: "24/7 support via text - sometimes typing feels easier than talking 📱",
        note: "Great for when you need immediate support but can't make a phone call"
      },
      {
        name: "Love is Respect",
        contact: "loveisrespect.org",
        description: "Specifically for people dealing with relationship concerns 🤗",
        note: "They have a chat feature and tons of resources"
      }
    ];
  }

  generateDisclaimer() {
    return {
      main: "One last hug, sweetie... 💕",
      message: "Listen, I want you to know something: you reaching out, taking this assessment, asking these questions - that takes courage. You're already being braver than you know.",
      reality: "Maybe this resonates completely, maybe it doesn't. Maybe you're not ready to hear some of this yet, and that's okay too. Healing isn't linear, and neither is recognizing unhealthy patterns.",
      gentle: "Just... please be gentle with yourself. You're doing the best you can with what you know right now. And now you know a little more. 🤗",
      disclaimer: "Remember: this reflection is based on our conversation and what you shared. It might not capture everything about your unique situation, and that's okay. Trust your gut, talk to people you love, and don't be afraid to ask for help.",
      closing: "You've got this, babe. Even when it doesn't feel like it. 💪💕",
      signature: "💕 Sending you love and strength, Your Assessment Bestie 🤗",
      ps: "P.S. - Seriously, text me (okay, text someone) if you need to talk. You're not alone in this. 📱💕"
    };
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

const resultsGenerator = new ResultsGenerator();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start new assessment
app.post('/api/assessment/start', (req, res) => {
  try {
    const sessionId = 'assess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = new AssessmentSession(sessionId);
    sessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId: sessionId,
      stage: 'demographics',
      demographicOptions: DEMOGRAPHIC_OPTIONS
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ success: false, error: 'Failed to start session' });
  }
});

// Submit demographics
app.post('/api/assessment/demographics', (req, res) => {
  try {
    const { sessionId, demographics } = req.body;

    if (!sessionId || !demographics) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.setDemographics(demographics);

    const firstQuestion = QUESTION_BANK[0];

    res.json({
      success: true,
      stage: 'assessment',
      question: firstQuestion,
      introMessage: `Thank you for sharing that information. Now I'd like to understand your relationship dynamics better through some everyday scenarios. 

This is a safe space to share your experiences, and there are no judgments here - just an opportunity to gain some clarity about patterns in your relationship.

Let's start with something simple...`
    });
  } catch (error) {
    console.error('Demographics error:', error);
    res.status(500).json({ success: false, error: 'Failed to process demographics' });
  }
});

// Submit response and get next question
app.post('/api/assessment/respond', (req, res) => {
  try {
    const { sessionId, questionId, response } = req.body;

    if (!sessionId || !response) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Find current question
    const currentQuestion = QUESTION_BANK.find(q => q.id === questionId) || QUESTION_BANK[session.currentQuestionIndex];
    
    // Add response
    session.addResponse(currentQuestion, response);
    session.currentQuestionIndex++;

    // Check if assessment is complete
    if (session.currentQuestionIndex >= QUESTION_BANK.length) {
      return res.json({
        success: true,
        complete: true,
        sessionId: sessionId,
        message: "Thank you for sharing your experiences with me. Let me analyze what you've told me and provide some insights about your partner's behavior patterns."
      });
    }

    // Get next question
    const nextQuestion = QUESTION_BANK[session.currentQuestionIndex];

    res.json({
      success: true,
      question: nextQuestion,
      progress: {
        questionsAnswered: session.currentQuestionIndex,
        estimatedRemaining: QUESTION_BANK.length - session.currentQuestionIndex
      }
    });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ success: false, error: 'Failed to process response' });
  }
});

// Get assessment results
app.get('/api/assessment/results/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Generate results if not already done
    if (!session.analysisResults) {
      const results = resultsGenerator.generateResults(session);
      session.setAnalysisResults(results);
    }

    res.json({
      success: true,
      results: session.analysisResults
    });
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ success: false, error: 'Failed to get results' });
  }
});

// Submit feedback
app.post('/api/assessment/feedback', (req, res) => {
  try {
    const { sessionId, quickRating, mostHelpful } = req.body;

    // In production, save to database
    console.log('Feedback received:', { sessionId, quickRating, mostHelpful, timestamp: new Date() });

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
});

// Cleanup old sessions (run periodically)
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    const age = now - session.lastActivity;
    if (age > 24 * 60 * 60 * 1000) { // 24 hours
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Start server
app.listen(PORT, () => {
  console.log(`Partner Assessment API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});