// =============================================================================
// SECTION 1:Dependencies & Setup
// =============================================================================
// Add this to the top of your server.js file
const { createClient } = require('@supabase/supabase-js');

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

// Add this to the top of your server.js file
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('✅ Supabase initialized for session storage');
} else {
  console.log('⚠️ Supabase not configured - sessions will only be stored in memory');
}
// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://partner-assessment-tool.netlify.app',
    /\.netlify\.app$/, // This allows any netlify.app subdomain
    /\.netlify\.live$/ // This allows netlify preview deployments
  ],
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
// Section 2:DATA MODELS & CONFIGURATIONS
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

// =============================================================================
// Section 3:Question Bank
// =============================================================================

const QUESTION_BANK = [
  // OPENING (1 question) - Ice breaker about daily decisions
  {
    id: 'opener_1',
    text: "I'd like to understand your relationship dynamics better. Let's start with something simple - when you and your partner need to decide on everyday things like where to go for dinner or what to watch, how does that usually play out?",
    stage: 'opening'
  },

  // DECISION-MAKING (2 questions) - Who decides what, how input is handled
  {
    id: 'decision_1',
    text: "When it comes to bigger decisions - like financial choices, social plans, or things that affect both of your lives - who typically takes the lead on those?",
    stage: 'decision_making'
  },
  {
    id: 'decision_2',
    text: "When you have input or suggestions on decisions, what usually happens? Does your partner tend to consider your thoughts or handle things their own way?",
    stage: 'decision_making'
  },

  // COMMUNICATION (2 questions) - How disagreements are handled
  {
    id: 'communication_1',
    text: "When you and your partner see things differently or have a disagreement, what typically happens during those conversations?",
    stage: 'communication'
  },
  {
    id: 'communication_2',
    text: "After you've had different viewpoints on something, how do those conversations usually wrap up? Does your partner tend to acknowledge your perspective?",
    stage: 'communication'
  },

  // SOCIAL DYNAMICS (2 questions) - Impact on friendships/family
  {
    id: 'social_1',
    text: "How does your partner typically respond when you want to spend time with friends or family without them?",
    stage: 'social'
  },
  {
    id: 'social_2',
    text: "Have you noticed any changes in your friendships or family relationships since being with your partner? What's that looked like?",
    stage: 'social'
  },

  // EMOTIONAL SUPPORT (2 questions) - Response to good/bad news
  {
    id: 'emotional_1',
    text: "When you're going through something stressful or having a tough time, what does your partner typically do? How do they usually respond?",
    stage: 'emotional'
  },
  {
    id: 'emotional_2',
    text: "On the flip side, when you achieve something you're proud of or have exciting news to share, how does your partner usually react?",
    stage: 'emotional'
  },

  // BOUNDARIES (2 questions) - Respect for limits and personal space
  {
    id: 'boundaries_1',
    text: "Can you think of times when you've tried to set a boundary or express a need for something? How does your partner typically handle that?",
    stage: 'boundaries'
  },
  {
    id: 'boundaries_2',
    text: "What about when it comes to personal space, your belongings, or your privacy - how does your partner approach those areas?",
    stage: 'boundaries'
  },

  // PATTERNS (1 question) - Overall relationship patterns
  {
    id: 'patterns_1',
    text: "Looking at your relationship overall, do you notice any recurring patterns in how conflicts or challenging situations tend to play out between you two?",
    stage: 'patterns'
  },

  // SAFETY (1 question) - Fear of partner's reactions
  {
    id: 'safety_1',
    text: "Have there been times when you've hesitated to say something or act in a certain way because you were concerned about your partner's reaction?",
    stage: 'safety'
  },

  // FINAL (1 question) - Open-ended for additional concerns
  {
    id: 'final_1',
    text: "Is there anything else about your relationship dynamics that you think would be helpful for me to understand?",
    stage: 'final'
  }
];

// =============================================================================
// Section 4:COMPLETE PERSONAS SYSTEM (All 17 Personas)
// =============================================================================

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
    ],
    highTraits: ['EXPL', 'DECP', 'CHAR'],
    lowTraits: ['SNSE', 'ATCH', 'ACCO']
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
    ],
    highTraits: ['CTRL', 'BNDY', 'DOMN'],
    lowTraits: ['EMPA', 'ACCO', 'NEED']
  },

  'The Drill Sergeant': {
    title: "The Drill Sergeant",
    greeting: "Hey love! 🤗 Let's talk about what I'm noticing...",
    empathyOpener: "I've been processing everything you told me, and sweetie... I can feel how much pressure you must be under. It's like you're living in a constant performance review, isn't it? 💕",
    mainMessage: "Honey, this is giving me major 'nothing is ever good enough' vibes. 😟",
    caring: "Babe, I can hear how hard you're trying to meet their standards, but here's the thing - you shouldn't have to earn love through performance. Love isn't a report card where you're constantly being graded. You deserve to be appreciated for who you are, not criticized for who you're not. 🤗",
    worry: "I'm worried about how this constant criticism is affecting your self-worth, love. 💙",
    riskLevel: 'perfection-pressure',
    livingReality: [
      '📊 Living Report Card: Everything you do gets graded and critiqued',
      '🎯 Moving Goalposts: You can never quite meet their impossible standards',
      '🗣️ Unsolicited Life Coaching: Your choices constantly require their approval',
      '🏆 Competition Mode: They turn everything into a contest you can\'t win',
      '😤 Walking Disappointment: You feel like you\'re always letting them down'
    ],
    highTraits: ['GRAN', 'VALS', 'SUPR'],
    lowTraits: ['TRST', 'EMPA', 'ACCO']
  },

  'The Suspicious Strategist': {
    title: "The Suspicious Strategist",
    greeting: "Hey babe! 🤗 I need to share something with you...",
    empathyOpener: "After listening to everything you've shared, I can't shake this feeling that you're living with someone who treats life like a chess game - and you're not a player, you're a piece. 💕",
    mainMessage: "Sweetie, this is giving me serious 'trust no one' paranoia vibes. 🕵️‍♀️",
    caring: "Love, I can hear how exhausting it must be to live with someone who questions everything and everyone. That level of suspicion and control isn't about protecting the relationship - it's about power. You deserve to be trusted and to trust your partner, not live in constant surveillance. 🤗",
    worry: "I'm concerned about how this paranoia is isolating you from the world, honey. 💙",
    riskLevel: 'control-concern',
    livingReality: [
      '🕵️ Under Surveillance: They monitor everything like you\'re a suspect',
      '🤔 Questioning Everything: Your motives are always under investigation',
      '🏰 Fortress Mentality: It\'s you two against the world (mostly the world)',
      '📱 Digital Detective: They know your online activity better than you do',
      '👥 Social Screening: Every person in your life needs their approval'
    ],
    highTraits: ['CTRL', 'DOMN', 'SNSE'],
    lowTraits: ['NEED', 'EMOX', 'HYPL']
  },

  'Master of Everything': {
    title: "Master of Everything",
    greeting: "Oh honey... 🤗 We need to talk...",
    empathyOpener: "I've been thinking about what you shared, and my heart goes out to you. Living with someone who thinks they're the expert on everything must be incredibly lonely, even when you're together. 💕",
    mainMessage: "Babe, this is giving me 'know-it-all who actually knows nothing about love' energy. 🤓",
    caring: "Sweetie, I can hear how small you must feel when someone constantly positions themselves as superior. That's not partnership - that's patronizing. You deserve someone who sees you as an equal, not a student who needs constant correction. 🤗",
    worry: "I'm concerned about how this dynamic is affecting your confidence, love. 💙",
    riskLevel: 'intellectual-control',
    livingReality: [
      '🧠 Always the Student: They\'re the teacher, you\'re perpetually learning',
      '🚫 Wrong by Default: Your opinions need their expert correction',
      '📚 Living Lecture: Every conversation becomes a teaching moment',
      '🎓 Condescending Care: They help you like you\'re intellectually inferior',
      '🤷‍♀️ Doubt Everything: You\'ve stopped trusting your own judgment'
    ],
    highTraits: ['ISOL', 'CNFL', 'CTRL'],
    lowTraits: ['TRST', 'CHAR', 'IMPL']
  },

  'The Subtle Saboteur': {
    title: "The Subtle Saboteur",
    greeting: "Hey beautiful... 🤗 I'm a bit worried about you...",
    empathyOpener: "After everything you've shared, I can't shake this feeling that someone in your life is undermining you in ways so subtle, you might not even realize it's happening. 💕",
    mainMessage: "Sweetie, this is giving me 'death by a thousand paper cuts' vibes. 😔",
    caring: "Love, I can sense how confused you must feel when someone says they support you but their actions tell a different story. This kind of subtle sabotage is especially damaging because it makes you question your own perceptions. Trust your instincts - if something feels off, it probably is. 🤗",
    worry: "I'm worried about how this quiet undermining is affecting your sense of reality, honey. 💙",
    riskLevel: 'covert-control',
    livingReality: [
      '🎭 Mixed Messages: They say one thing but do another constantly',
      '🌊 Subtle Undermining: Small actions that slowly erode your confidence',
      '🤔 Gaslighting Lite: Making you doubt your perceptions in gentle ways',
      '😵‍💫 Confused Reality: You\'re never quite sure what\'s really happening',
      '🎪 Behind the Scenes: They manipulate situations without your knowledge'
    ],
    highTraits: ['DOMN', 'CNFL', 'GRAN'],
    lowTraits: ['ENSH', 'NEED', 'ACCO']
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
      '🕰️ Time Audit: Every minute needs to be explained and accounted for',
      '🎭 Guilt Shows: Oscar-worthy performances when you want alone time',
      '🚪 Permission Needed: Leaving the house feels like a negotiation'
    ],
    highTraits: ['DISP', 'INCO', 'CTRL'],
    lowTraits: ['DYRG', 'CNFL', 'ACCO']
  },

  'The Addict': {
    title: "The Addict",
    greeting: "Oh sweetheart... 🤗 This is a tough one...",
    empathyOpener: "I've been thinking about everything you shared, and my heart just aches for you right now. Loving someone with addiction is like loving someone through a wall sometimes - you can see them, but you can't quite reach them. 💕",
    mainMessage: "Honey, it sounds like you're in a three-way relationship, and you're not the priority. 😔",
    caring: "I know you love them, and I know they probably love you too. But babe, addiction is a thief - it steals people away from the ones who care about them most. This isn't about loving them harder or being more understanding. This is about recognizing that you can't love someone into recovery. 🤗",
    worry: "I'm worried about what this is costing you emotionally, mentally, and maybe financially too, love. 💙",
    riskLevel: 'codependency-concern',
    livingReality: [
      '🎭 Triangle Love: You, them, and their addiction make three',
      '💸 Resource Drain: Your energy and money fund their destructive habits',
      '🚨 Crisis Mode: You\'re always managing emergencies and disasters',
      '🤥 Truth Drought: Honesty became a rare and precious commodity',
      '🎢 Hope Roller Coaster: Promises and relapses in endless cycles'
    ],
    highTraits: ['ENSH', 'DYRG', 'IMPL'],
    lowTraits: ['SNSE', 'DISP', 'GRAN']
  },

  'The Freewheeler': {
    title: "The Freewheeler",
    greeting: "Hey babe! 🤗 Let's unpack this together...",
    empathyOpener: "I've been sitting with everything you told me, and sweetie... I can feel how exhausting this unpredictability must be for you. It's like trying to dance to music that keeps changing tempo, right? 💕",
    mainMessage: "Honey, this is giving me 'emotional whiplash' energy. 😵‍💫",
    caring: "I know the spontaneity probably felt exciting at first - maybe it still does sometimes. But babe, there's a difference between fun surprises and complete chaos. You deserve some stability, some reliability. Your need for consistency isn't boring, it's human. 🤗",
    worry: "I'm concerned about how this roller coaster is affecting your mental health, love. 💙",
    riskLevel: 'stability-concern',
    livingReality: [
      '🎲 Daily Lottery: You never know which version of them you\'ll get',
      '💸 Financial Mystery: Money seems to evaporate inexplicably',
      '📅 Schedule Chaos: Plans are more like rough suggestions',
      '🤷‍♂️ Blame Games: Somehow nothing is ever their responsibility',
      '🎪 Drama Central: Every day brings a new crisis or celebration'
    ],
    highTraits: ['DYRG', 'IMPL', 'INCO'],
    lowTraits: ['SNSE', 'CTRL', 'ACCO']
  },

  'The Thinker': {
    title: "The Thinker",
    greeting: "Hey love! 🤗 I've been analyzing what you shared...",
    empathyOpener: "After processing everything you told me, I can sense how emotionally starved you must feel. Living with someone who overthinks everything but under-feels everything must be incredibly lonely. 💕",
    mainMessage: "Sweetie, this is giving me 'living with a robot' vibes. 🤖",
    caring: "I can hear how much you crave emotional connection and spontaneity. While their analytical nature might feel safe sometimes, relationships need warmth, not just logic. You deserve someone who can meet you in the emotional space, not just the intellectual one. 🤗",
    worry: "I'm concerned about how this emotional distance is affecting your heart, honey. 💙",
    riskLevel: 'emotional-distance',
    livingReality: [
      '🧠 Everything\'s a Problem: Life is a series of puzzles to solve',
      '❄️ Emotional Desert: Feelings are treated like inconvenient data',
      '📊 Relationship Spreadsheet: Love gets analyzed instead of felt',
      '🤔 Overthinking Everything: Simple moments become complex theories',
      '💭 Missing the Feeling: Connection happens in their head, not their heart'
    ],
    highTraits: ['NEED', 'CHAR', 'IMPL'],
    lowTraits: ['DOMN', 'PERS', 'ACCO']
  },

  'Emotional Invalidator': {
    title: "Emotional Invalidator",
    greeting: "Oh honey... 🤗 I need to tell you something important...",
    empathyOpener: "I've been thinking about what you shared, and I can feel how dismissed and unheard you must feel. Having your emotions constantly invalidated is like having your reality constantly questioned. 💕",
    mainMessage: "Sweetie, this is giving me 'your feelings don't matter' energy. 😢",
    caring: "Love, I want you to know that your emotions are valid, important, and deserve to be heard. Someone who consistently dismisses or minimizes your feelings isn't helping you grow - they're helping you shrink. You deserve emotional validation and support. 🤗",
    worry: "I'm worried about how this constant invalidation is affecting your sense of self-worth, baby. 💙",
    riskLevel: 'emotional-abuse',
    livingReality: [
      '🚫 Feelings Police: Your emotions are constantly judged and corrected',
      '🎭 Emotional Theater: Only their feelings are treated as real and important',
      '😶 Silent Suffering: You\'ve learned to hide your true feelings',
      '🤷‍♀️ Second-Guessing: You question whether your emotions are justified',
      '💔 Emotional Starvation: Your need for validation goes consistently unmet'
    ],
    highTraits: ['DECP', 'INCO', 'SUPR'],
    lowTraits: ['ATCH', 'PERS', 'EMPA']
  },

  'The Emotionally Distant': {
    title: "The Emotionally Distant",
    greeting: "Hey sweetie... 🤗 I can sense your loneliness...",
    empathyOpener: "From everything you've shared, I can feel how isolated you must feel even when you're together. Emotional distance in a relationship is like being hungry at a feast - you're surrounded by what should nourish you, but you're still starving. 💕",
    mainMessage: "Honey, this is giving me 'alone together' vibes. 🏝️",
    caring: "I can hear how much you're craving deeper connection and intimacy. Physical presence isn't the same as emotional presence, and you deserve both. Your need for emotional closeness isn't needy - it's normal and healthy. 🤗",
    worry: "I'm concerned about how this emotional isolation is affecting your spirit, love. 💙",
    riskLevel: 'emotional-neglect',
    livingReality: [
      '🏝️ Island Living: You feel alone even when they\'re right next to you',
      '🚪 Closed Doors: They\'re emotionally unavailable when you need them most',
      '📺 Surface Level: Conversations stay shallow, never going deep',
      '❄️ Cold Comfort: Physical presence without emotional warmth',
      '🔇 Silent Treatment: Your bids for connection are ignored or dismissed'
    ],
    highTraits: ['IMPL', 'HYPL', 'SEEK'],
    lowTraits: ['CTRL', 'DOMN', 'IMPL']
  },

  'The Perpetual Victim': {
    title: "The Perpetual Victim", 
    greeting: "Oh babe... 🤗 I see what's happening here...",
    empathyOpener: "After listening to everything you shared, I can feel how exhausting it must be to constantly comfort someone who never seems to get better. You've become their emotional support system, haven't you? 💕",
    mainMessage: "Sweetie, this is giving me 'professional victim' energy. 😔",
    caring: "I can hear how much compassion you have and how hard you try to help and support them. But babe, there's a difference between someone going through a hard time and someone who makes being a victim their full-time job. You can't heal someone who's addicted to being broken. 🤗",
    worry: "I'm worried about how much of yourself you're losing in trying to save them, honey. 💙",
    riskLevel: 'emotional-drain',
    livingReality: [
      '🎭 Drama Central: Every day brings a new crisis or catastrophe',
      '🔄 Endless Cycles: Same problems, same complaints, no real solutions',
      '💔 Emotional ATM: They withdraw sympathy but never make deposits',
      '🚫 Never Their Fault: Everyone else is always the problem',
      '🎪 Attention Vampire: They feed off your concern and energy'
    ],
    highTraits: ['IMPL', 'PERS', 'TRST'],
    lowTraits: ['IMPL', 'CHAR', 'SEEK']
  },

  'The Parental Seeker': {
    title: "The Parental Seeker",
    greeting: "Hey love... 🤗 I think I see what's happening...",
    empathyOpener: "From everything you've shared, it sounds like you signed up to be a partner but somehow became a parent instead. That's not what you bargained for, is it? 💕",
    mainMessage: "Honey, this is giving me 'dating a child' vibes. 👶",
    caring: "I can hear how much you care for them and want to help them grow. But sweetie, you're not their parent, and they're not your child. Partners should take care of each other, not one person doing all the caretaking. You deserve an equal, not a dependent. 🤗",
    worry: "I'm concerned about how much responsibility you're carrying that isn't yours, babe. 💙",
    riskLevel: 'caretaker-burnout',
    livingReality: [
      '👶 Adult Baby: You handle their basic life responsibilities',
      '🏠 Household Manager: You do everything while they do nothing',
      '💰 Financial Caretaker: You manage money because they can\'t be trusted',
      '📅 Life Organizer: Their schedule, appointments, and obligations are your job',
      '😤 Constant Frustration: You feel more like a mom than a girlfriend'
    ],
    highTraits: ['DISP', 'GRAN', 'DOMN'],
    lowTraits: ['ENSH', 'ATCH', 'EMPA']
  },

  'The Rake': {
    title: "The Rake",
    greeting: "Oh sweetie... 🤗 This is hard to talk about...",
    empathyOpener: "I've been thinking about what you shared, and honey, I can feel how much you're hurting. Living with someone who treats commitment like a suggestion must be breaking your heart over and over. 💕",
    mainMessage: "Babe, this is giving me 'player who never stopped playing' vibes. 💔",
    caring: "I can hear how much you love them and how hard you're trying to make this work. But sweetie, you can't love someone into being faithful. You can't care enough for both of you. You deserve someone who chooses you every day, not someone who keeps their options open. 🤗",
    worry: "I'm worried about how this betrayal is affecting your ability to trust, love. 💙",
    riskLevel: 'infidelity-pattern',
    livingReality: [
      '📱 Phone Anxiety: Their device is more guarded than state secrets',
      '🕵️ Detective Mode: You\'ve become Sherlock Holmes in your own relationship',
      '🎭 Performance Art: They\'re always performing innocence',
      '💔 Broken Promises: Commitment means nothing to them',
      '🤔 Constant Doubt: You question everything because nothing feels secure'
    ],
    highTraits: ['INCO', 'SUPR', 'CTRL'],
    lowTraits: ['ENSH', 'DYRG', 'ATCH']
  },

  'The Future Faker': {
    title: "The Future Faker",
    greeting: "Hey beautiful... 🤗 I need to share something with you...",
    empathyOpener: "After everything you've told me, I can feel how confused and disappointed you must be. Living on promises that never materialize is like being perpetually hungry at a restaurant that never serves food. 💕",
    mainMessage: "Sweetie, this is giving me 'all talk, no action' energy. 🗣️",
    caring: "I can hear how much hope you have and how much you want to believe in the future they paint. But babe, actions speak louder than words, and consistency speaks louder than promises. You deserve someone whose words and actions align. 🤗",
    worry: "I'm concerned about how these broken promises are affecting your ability to plan and dream, honey. 💙",
    riskLevel: 'false-hope',
    livingReality: [
      '🌅 Tomorrow Land: Everything good is always coming "soon"',
      '📅 Moving Goalposts: Timelines constantly shift when deadlines approach',
      '💭 Dream Dealer: They sell you fantasies instead of building realities',
      '🎪 Promise Circus: Grand gestures and declarations with no follow-through',
      '😔 Endless Waiting: Your life is on hold for their someday'
    ],
    highTraits: ['CHAR', 'SEEK', 'INTN'],
    lowTraits: ['ATCH', 'ACCO', 'SNSE']
  },

  'The Self-Obsessed': {
    title: "The Self-Obsessed",
    greeting: "Oh honey... 🤗 I can see you're feeling invisible...",
    empathyOpener: "From everything you've shared, it sounds like you're in a relationship with someone who thinks the world revolves around them - and that includes your world too. That must be incredibly lonely. 💕",
    mainMessage: "Sweetie, this is giving me 'main character syndrome' vibes. 🎭",
    caring: "I can hear how much you try to support and celebrate them, but babe, relationships are supposed to be a two-way street. You deserve someone who's just as interested in your life, your dreams, and your feelings as they are in their own. 🤗",
    worry: "I'm worried about how much of yourself you're losing trying to orbit around their sun, love. 💙",
    riskLevel: 'narcissistic-pattern',
    livingReality: [
      '🎭 Supporting Actor: You exist to make them look good',
      '🎤 Monologue Master: Conversations are just them talking at you',
      '🏆 Competition Mode: Your successes threaten their spotlight',
      '📸 Photo Op: You\'re a prop in their perfect life performance',
      '🔇 Invisible Needs: Your problems are inconvenient interruptions'
    ],
    highTraits: ['VALS', 'INCO', 'EMOX'],
    lowTraits: ['ACCO', 'EMPA', 'PERS']
  }
};

// =============================================================================
// Section 5:COMPLETE CHARACTER REFERENCES SYSTEM
// =============================================================================

const CHARACTER_REFERENCES = {
  'north-america': {
    'The Puppet Master': {
      female: {
        '18-24': [
          { name: 'Regina George', source: 'Mean Girls', quote: 'Oh, you\'re upset? That\'s... interesting.', description: 'Makes being mean sound like caring' },
          { name: 'Amy Dunne', source: 'Gone Girl', quote: 'I was told love should feel natural, easy...', description: 'Creates elaborate scenarios to test your loyalty' },
          { name: 'Villanelle', source: 'Killing Eve', quote: 'I think about you all the time.', description: 'Obsession masquerading as devotion' }
        ],
        '25-34': [
          { name: 'Christian Grey', source: '50 Shades', quote: 'I know what\'s best for you.', description: 'Your boundaries are more like suggestions they ignore' },
          { name: 'Blair Waldorf', source: 'Gossip Girl', quote: 'I\'m not controlling, I\'m organizing your life.', description: 'Disguises control as care and concern' },
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'Love is weakness.', description: 'Uses love as a weapon rather than a gift' }
        ],
        '35+': [
          { name: 'Frank Underwood', source: 'House of Cards', quote: 'Everything is about control.', description: 'Politics and manipulation in personal relationships' },
          { name: 'Miranda Priestly', source: 'Devil Wears Prada', quote: 'By all means, move at a glacial pace.', description: 'Passive-aggressive perfectionism' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Joe Goldberg', source: 'You', quote: 'I would do anything for you.', description: 'Monitors your life like it\'s his job' },
          { name: 'Christian Grey', source: '50 Shades', quote: 'I\'m fifty shades of f*cked up.', description: 'Uses trauma as an excuse for control' },
          { name: 'Noah', source: 'The Notebook', quote: 'If you\'re a bird, I\'m a bird.', description: 'Romantic persistence that crosses into obsession' }
        ],
        '25-34': [
          { name: 'Gatsby', source: 'The Great Gatsby', quote: 'I\'ve been waiting for you all my life.', description: 'Creates fantasy versions of who you should be' },
          { name: 'Edward Cullen', source: 'Twilight', quote: 'You are my life now.', description: 'Possessive behavior disguised as deep love' },
          { name: 'Patrick Bateman', source: 'American Psycho', quote: 'I have to return some videotapes.', description: 'Charming surface hiding something darker' }
        ],
        '35+': [
          { name: 'Walter White', source: 'Breaking Bad', quote: 'I did it for the family.', description: 'Justifies harmful behavior as protection' },
          { name: 'Tony Soprano', source: 'The Sopranos', quote: 'I\'m doing this for us.', description: 'Control freak with anger management issues' },
          { name: 'Hannibal Lecter', source: 'Silence of the Lambs', quote: 'I do wish we could chat longer.', description: 'Sophisticated manipulation with deadly charm' }
        ]
      }
    },

    'The Intimidator': {
      female: {
        '18-24': [
          { name: 'Azula', source: 'Avatar: The Last Airbender', quote: 'Fear is the only reliable way.', description: 'Uses fear to maintain control over everyone' },
          { name: 'Katherine Pierce', source: 'Vampire Diaries', quote: 'I survive. That\'s what I do.', description: 'Ruthless and manipulative when threatened' },
          { name: 'Bellatrix Lestrange', source: 'Harry Potter', quote: 'I killed Sirius Black!', description: 'Takes pleasure in others\' fear and pain' }
        ],
        '25-34': [
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'When you play the game of thrones, you win or you die.', description: 'Will destroy anyone who threatens her power' },
          { name: 'Miranda Priestly', source: 'Devil Wears Prada', quote: 'That\'s all.', description: 'Dismissive authority that makes people feel small' }
        ],
        '35+': [
          { name: 'Nurse Ratched', source: 'One Flew Over the Cuckoo\'s Nest', quote: 'The best thing we can do is go on with our daily routine.', description: 'Institutional control disguised as care' },
          { name: 'Joan Crawford', source: 'Mommie Dearest', quote: 'No wire hangers!', description: 'Explosive anger over minor infractions' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Draco Malfoy', source: 'Harry Potter', quote: 'My father will hear about this!', description: 'Uses threats and family power to intimidate' },
          { name: 'Joffrey Baratheon', source: 'Game of Thrones', quote: 'I am the king!', description: 'Cruel and entitled, enjoys others\' suffering' },
          { name: 'Billy Hargrove', source: 'Stranger Things', quote: 'I\'m older than you.', description: 'Bullying behavior masked as authority' }
        ],
        '25-34': [
          { name: 'Ramsay Bolton', source: 'Game of Thrones', quote: 'If you think this has a happy ending, you haven\'t been paying attention.', description: 'Takes pleasure in psychological torture' },
          { name: 'Anton Chigurh', source: 'No Country for Old Men', quote: 'What\'s the most you ever lost on a coin toss?', description: 'Unpredictable violence keeps everyone on edge' }
        ],
        '35+': [
          { name: 'Hannibal Lecter', source: 'Silence of the Lambs', quote: 'A census taker once tried to test me.', description: 'Intellectual superiority used as intimidation' },
          { name: 'Gordon Gekko', source: 'Wall Street', quote: 'Greed is good.', description: 'Ruthless pursuit of power over others' }
        ]
      }
    },

    'The Clinger': {
      female: {
        '18-24': [
          { name: 'Bella Swan', source: 'Twilight', quote: 'I can\'t live without you.', description: 'Defines entire existence through romantic relationship' },
          { name: 'Annie Wilkes', source: 'Misery', quote: 'I\'m your number one fan.', description: 'Obsessive devotion that becomes dangerous' },
          { name: 'Glenn Close', source: 'Fatal Attraction', quote: 'I won\'t be ignored.', description: 'Refuses to accept rejection or boundaries' }
        ],
        '25-34': [
          { name: 'Amy Dunne', source: 'Gone Girl', quote: 'I was told love should feel natural.', description: 'Creates elaborate scenarios to maintain connection' },
          { name: 'Misery Bates', source: 'Misery', quote: 'We\'re going to be spending a lot of time together.', description: 'Traps others to ensure they can\'t leave' }
        ],
        '35+': [
          { name: 'Evelyn Harper', source: 'Two and a Half Men', quote: 'I gave you life!', description: 'Uses guilt and obligation to maintain control' },
          { name: 'Livia Soprano', source: 'The Sopranos', quote: 'I wish the Lord would take me now.', description: 'Emotional manipulation through victimization' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Edward Cullen', source: 'Twilight', quote: 'You are my life now.', description: 'Obsessive behavior disguised as romantic devotion' },
          { name: 'Ted Mosby', source: 'How I Met Your Mother', quote: 'I love you.', description: 'Says "I love you" way too early and too often' },
          { name: 'Ross Geller', source: 'Friends', quote: 'We were on a break!', description: 'Possessive and jealous, can\'t let go' }
        ],
        '25-34': [
          { name: 'Noah', source: 'The Notebook', quote: 'If you\'re a bird, I\'m a bird.', description: 'Romantic persistence that ignores boundaries' },
          { name: 'Gatsby', source: 'The Great Gatsby', quote: 'I\'ve been waiting for you.', description: 'Builds entire life around one person' }
        ],
        '35+': [
          { name: 'Leonard Hofstadter', source: 'Big Bang Theory', quote: 'I need you.', description: 'Clingy neediness disguised as romantic devotion' },
          { name: 'Jerry Seinfeld', source: 'Seinfeld', quote: 'What\'s the deal with...', description: 'Obsesses over relationship details' }
        ]
      }
    },

    'The Drill Sergeant': {
      female: {
        '18-24': [
          { name: 'Captain Marvel', source: 'Marvel Movies', quote: 'I have nothing to prove to you.', description: 'Arrogant perfectionism disguised as strength' },
          { name: 'Santana Lopez', source: 'Glee', quote: 'I\'m like a shark - I have to keep moving or I die.', description: 'Sharp-tongued criticism of everyone around her' },
          { name: 'Blair Waldorf', source: 'Gossip Girl', quote: 'I\'m not a stop along the way. I\'m a destination.', description: 'High standards that no one can meet' }
        ],
        '25-34': [
          { name: 'Miranda Bailey', source: 'Grey\'s Anatomy', quote: 'I am the chief. I am the chief.', description: 'Harsh criticism disguised as tough love' },
          { name: 'Victoria Grayson', source: 'Revenge', quote: 'Appearances matter.', description: 'Superficial perfectionism above all else' }
        ],
        '35+': [
          { name: 'Miranda Priestly', source: 'Devil Wears Prada', quote: 'By all means, move at a glacial pace.', description: 'Impossible standards with cutting sarcasm' },
          { name: 'Joan Crawford', source: 'Mommie Dearest', quote: 'No wire hangers!', description: 'Explosive perfectionism over minor details' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Sheldon Cooper', source: 'Big Bang Theory', quote: 'I\'m not crazy, my mother had me tested.', description: 'Know-it-all who corrects everyone constantly' },
          { name: 'Ross Geller', source: 'Friends', quote: 'We were on a break!', description: 'Arrogant intellectual who\'s always right' }
        ],
        '25-34': [
          { name: 'Hank Hill', source: 'King of the Hill', quote: 'That\'s not right.', description: 'Rigid standards for how everything should be done' },
          { name: 'Red Forman', source: 'That 70s Show', quote: 'Dumbass.', description: 'Constant criticism and put-downs' }
        ],
        '35+': [
          { name: 'J. Jonah Jameson', source: 'Spider-Man', quote: 'Get me pictures of Spider-Man!', description: 'Never satisfied, always demanding more' },
          { name: 'Gordon Ramsay', source: 'Hell\'s Kitchen', quote: 'This is raw!', description: 'Explosive criticism and impossible standards' }
        ]
      }
    },

    'The Suspicious Strategist': {
      female: {
        '18-24': [
          { name: 'Villanelle', source: 'Killing Eve', quote: 'I think about you all the time.', description: 'Calculates every move in relationships' },
          { name: 'Georgina Sparks', source: 'Gossip Girl', quote: 'I live for the drama.', description: 'Creates chaos while appearing innocent' }
        ],
        '25-34': [
          { name: 'Olivia Pope', source: 'Scandal', quote: 'It has to be handled.', description: 'Manipulates situations from behind the scenes' },
          { name: 'Annalise Keating', source: 'How to Get Away with Murder', quote: 'We\'re not friends.', description: 'Trust no one, control everything' }
        ],
        '35+': [
          { name: 'Jessica Pearson', source: 'Suits', quote: 'When I\'m done with you, you\'ll be lucky to get a job in the mailroom.', description: 'Strategic manipulation disguised as protection' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Light Yagami', source: 'Death Note', quote: 'I am justice.', description: 'Believes he\'s saving the world through control' },
          { name: 'Moriarty', source: 'Sherlock', quote: 'Every fairy tale needs a good old-fashioned villain.', description: 'Master manipulator who enjoys the game' }
        ],
        '25-34': [
          { name: 'Littlefinger', source: 'Game of Thrones', quote: 'Chaos is a ladder.', description: 'Creates problems to position himself as the solution' },
          { name: 'Walter White', source: 'Breaking Bad', quote: 'I am the one who knocks.', description: 'Justifies control through paranoia' }
        ],
        '35+': [
          { name: 'Saul Goodman', source: 'Better Call Saul', quote: 'It\'s all good, man.', description: 'Manipulates through charm and false reassurance' }
        ]
      }
    },

    'Master of Everything': {
      female: {
        '18-24': [
          { name: 'Hermione Granger', source: 'Harry Potter', quote: 'Actually, I\'m highly logical.', description: 'Has to be the smartest person in every room' },
          { name: 'Paris Geller', source: 'Gilmore Girls', quote: 'I\'m better than everyone.', description: 'Competitive perfectionist who knows everything' }
        ],
        '25-34': [
          { name: 'Leslie Knope', source: 'Parks & Recreation', quote: 'I am big enough to admit that I am often inspired by myself.', description: 'Overwhelming competence that makes others feel small' },
          { name: 'Cristina Yang', source: 'Grey\'s Anatomy', quote: 'I am the sun.', description: 'Brilliant but makes everyone else orbit around her' }
        ],
        '35+': [
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'I choose violence.', description: 'Uses intelligence to dominate and control' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Sherlock Holmes', source: 'Sherlock', quote: 'I\'m not a psychopath, I\'m a high-functioning sociopath.', description: 'Intellectual superiority over everyone' },
          { name: 'Tyrion Lannister', source: 'Game of Thrones', quote: 'I drink and I know things.', description: 'Uses wit and knowledge to maintain power' }
        ],
        '25-34': [
          { name: 'Tony Stark', source: 'Iron Man', quote: 'I am Iron Man.', description: 'Genius who reminds everyone constantly' },
          { name: 'House', source: 'House MD', quote: 'Everybody lies.', description: 'Brilliant but impossible to live with' }
        ],
        '35+': [
          { name: 'Hannibal Lecter', source: 'Silence of the Lambs', quote: 'I do wish we could chat longer.', description: 'Cultured intelligence used for manipulation' }
        ]
      }
    },

    'The Subtle Saboteur': {
      female: {
        '18-24': [
          { name: 'Mean Girls Regina', source: 'Mean Girls', quote: 'So you agree? You think you\'re really pretty?', description: 'Backhanded compliments that destroy confidence' },
          { name: 'Marnie Michaels', source: 'Girls', quote: 'I\'m the main character of my own story.', description: 'Undermines others while playing victim' }
        ],
        '25-34': [
          { name: 'Skyler White', source: 'Breaking Bad', quote: 'I didn\'t ask for this.', description: 'Passive-aggressive undermining disguised as concern' },
          { name: 'Betty Draper', source: 'Mad Men', quote: 'I\'m not happy.', description: 'Cold disapproval that chips away at confidence' }
        ],
        '35+': [
          { name: 'Livia Soprano', source: 'The Sopranos', quote: 'I wish the Lord would take me now.', description: 'Manipulative victim who destroys from within' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Joffrey Baratheon', source: 'Game of Thrones', quote: 'Everyone is mine to torment.', description: 'Cruel undermining disguised as teasing' },
          { name: 'Draco Malfoy', source: 'Harry Potter', quote: 'My father will hear about this.', description: 'Undermines through entitlement and put-downs' }
        ],
        '25-34': [
          { name: 'Jim Halpert', source: 'The Office', quote: 'Bears. Beets. Battlestar Galactica.', description: 'Pranks and undermining disguised as humor' },
          { name: 'Loki', source: 'Marvel Movies', quote: 'I am burdened with glorious purpose.', description: 'Charming sabotage that seems playful' }
        ],
        '35+': [
          { name: 'Frank Underwood', source: 'House of Cards', quote: 'Power is a lot like real estate.', description: 'Systematic undermining with a smile' }
        ]
      }
    },

    'The Addict': {
      female: {
        '18-24': [
          { name: 'Rue Bennett', source: 'Euphoria', quote: 'I promise this is the last time.', description: 'Addiction controls every relationship decision' },
          { name: 'Cassie Howard', source: 'Euphoria', quote: 'I just want to be loved.', description: 'Addicted to love and validation' }
        ],
        '25-34': [
          { name: 'Jessica Jones', source: 'Netflix', quote: 'I need a drink.', description: 'Uses substances to cope with intimacy' },
          { name: 'Carrie Mathison', source: 'Homeland', quote: 'I was right about everything.', description: 'Chaos addiction affects every relationship' }
        ],
        '35+': [
          { name: 'Nurse Jackie', source: 'Nurse Jackie', quote: 'Make it a double.', description: 'Functional addiction that destroys relationships' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Nate Jacobs', source: 'Euphoria', quote: 'I\'m trying to be better.', description: 'Addiction to control and violence' },
          { name: 'Jesse Pinkman', source: 'Breaking Bad', quote: 'Yeah, science!', description: 'Substance abuse complicates every connection' }
        ],
        '25-34': [
          { name: 'Don Draper', source: 'Mad Men', quote: 'I don\'t think about you at all.', description: 'Addicted to secrets and lies' },
          { name: 'Rick Sanchez', source: 'Rick and Morty', quote: 'Wubba lubba dub dub.', description: 'Alcohol and chaos addiction' }
        ],
        '35+': [
          { name: 'Tony Soprano', source: 'The Sopranos', quote: 'It\'s good to be in something from the ground floor.', description: 'Multiple addictions destroy family bonds' }
        ]
      }
    },

    'The Freewheeler': {
      female: {
        '18-24': [
          { name: 'Samantha Jones', source: 'Sex and the City', quote: 'I don\'t believe in the Republican party or the Democratic party. I just believe in parties.', description: 'Commitment feels like a cage' },
          { name: 'Fleabag', source: 'Fleabag', quote: 'I have a horrible feeling I\'m a greedy, perverted, selfish, apathetic, cynical, depraved, morally bankrupt woman.', description: 'Self-sabotages when things get serious' }
        ],
        '25-34': [
          { name: 'Rebecca Bunch', source: 'Crazy Ex-Girlfriend', quote: 'I\'m just a girl in love!', description: 'Chaos and impulsivity over stability' },
          { name: 'Phoebe Buffay', source: 'Friends', quote: 'I don\'t even have a pla--', description: 'Free spirit who avoids responsibility' }
        ],
        '35+': [
          { name: 'Selina Meyer', source: 'Veep', quote: 'I can\'t be held responsible for every little thing I say.', description: 'Avoids accountability in relationships' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Barney Stinson', source: 'How I Met Your Mother', quote: 'Challenge accepted!', description: 'Treats relationships like a game' },
          { name: 'Johnny Lawrence', source: 'Cobra Kai', quote: 'Strike first, strike hard, no mercy.', description: 'Impulsive decisions without considering consequences' }
        ],
        '25-34': [
          { name: 'Sterling Archer', source: 'Archer', quote: 'Phrasing!', description: 'Commitment phobia disguised as humor' },
          { name: 'Charlie Harper', source: 'Two and a Half Men', quote: 'I\'m not great at the advice. Can I interest you in a sarcastic comment?', description: 'Avoids serious conversations about the future' }
        ],
        '35+': [
          { name: 'Hank Moody', source: 'Californication', quote: 'I\'m not a romantic. I\'m a half-romantic.', description: 'Self-destructive behavior that hurts partners' }
        ]
      }
    },

    'The Thinker': {
      female: {
        '18-24': [
          { name: 'Amy Santiago', source: 'Brooklyn Nine-Nine', quote: 'I\'ve been preparing for this my entire life.', description: 'Overthinks every relationship decision' },
          { name: 'Velma Dinkley', source: 'Scooby-Doo', quote: 'Jinkies!', description: 'Analyzes love instead of feeling it' }
        ],
        '25-34': [
          { name: 'Temperance Brennan', source: 'Bones', quote: 'I don\'t know what that means.', description: 'Logic over emotion in relationships' },
          { name: 'Diane Chambers', source: 'Cheers', quote: 'I have a PhD in psychology.', description: 'Intellectualizes instead of connecting' }
        ],
        '35+': [
          { name: 'Dr. Frasier Crane', source: 'Frasier', quote: 'I\'m listening.', description: 'Over-analyzes every interaction' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Spencer Reid', source: 'Criminal Minds', quote: 'Actually, statistics show...', description: 'Facts and data over emotional connection' },
          { name: 'Sheldon Cooper', source: 'Big Bang Theory', quote: 'Bazinga!', description: 'Relationship agreements instead of romance' }
        ],
        '25-34': [
          { name: 'Spock', source: 'Star Trek', quote: 'Logic is the beginning of wisdom.', description: 'Emotions are illogical obstacles' },
          { name: 'Sherlock Holmes', source: 'Sherlock', quote: 'The game is on!', description: 'Puzzles are more interesting than people' }
        ],
        '35+': [
          { name: 'Data', source: 'Star Trek', quote: 'I am not programmed to experience emotions.', description: 'Studies human behavior instead of experiencing it' }
        ]
      }
    },

    'Emotional Invalidator': {
      female: {
        '18-24': [
          { name: 'Cordelia Chase', source: 'Buffy', quote: 'Ugh, feelings.', description: 'Dismisses emotions as weakness' },
          { name: 'April Ludgate', source: 'Parks & Rec', quote: 'I don\'t care about anything.', description: 'Emotional numbness presented as coolness' }
        ],
        '25-34': [
          { name: 'Dr. Cameron', source: 'House MD', quote: 'You\'re being emotional.', description: 'Clinical detachment in personal relationships' },
          { name: 'Elsa', source: 'Frozen', quote: 'Conceal, don\'t feel.', description: 'Shuts down emotional expression' }
        ],
        '35+': [
          { name: 'Martha Stewart', source: 'Real Life', quote: 'It\'s a good thing.', description: 'Perfectionism over emotional connection' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Zuko', source: 'Avatar', quote: 'I don\'t need anyone.', description: 'Anger as the only acceptable emotion' },
          { name: 'Ron Burgundy', source: 'Anchorman', quote: 'I don\'t know what we\'re yelling about!', description: 'Emotional cluelessness presented as humor' }
        ],
        '25-34': [
          { name: 'Don Draper', source: 'Mad Men', quote: 'What you call love was invented by guys like me.', description: 'Cynical dismissal of authentic emotion' },
          { name: 'Rick Sanchez', source: 'Rick and Morty', quote: 'That\'s stupid.', description: 'Intellectual superiority over feelings' }
        ],
        '35+': [
          { name: 'Tywin Lannister', source: 'Game of Thrones', quote: 'The lion does not concern himself with the opinion of sheep.', description: 'Emotions are for the weak' }
        ]
      }
    },

    'The Emotionally Distant': {
      female: {
        '18-24': [
          { name: 'Eleven', source: 'Stranger Things', quote: 'I don\'t understand.', description: 'Struggles to connect emotionally' },
          { name: 'Arya Stark', source: 'Game of Thrones', quote: 'A girl has no name.', description: 'Emotional walls for protection' }
        ],
        '25-34': [
          { name: 'Elsa', source: 'Frozen', quote: 'Let it go.', description: 'Isolation feels safer than intimacy' },
          { name: 'Katniss Everdeen', source: 'Hunger Games', quote: 'I\'m not good at expressing myself.', description: 'Emotional numbness from trauma' }
        ],
        '35+': [
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'Love is poison.', description: 'Emotional walls built from pain' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Jon Snow', source: 'Game of Thrones', quote: 'I know nothing.', description: 'Emotional confusion and withdrawal' },
          { name: 'Batman', source: 'DC Comics', quote: 'I work alone.', description: 'Isolation as self-protection' }
        ],
        '25-34': [
          { name: 'Dexter Morgan', source: 'Dexter', quote: 'I don\'t have feelings about anything.', description: 'Emotional emptiness masked as control' },
          { name: 'Logan', source: 'X-Men', quote: 'I\'m the best there is at what I do.', description: 'Emotional walls built from loss' }
        ],
        '35+': [
          { name: 'Omar Little', source: 'The Wire', quote: 'A man got to have a code.', description: 'Rules instead of emotional connection' }
        ]
      }
    },

    'The Perpetual Victim': {
      female: {
        '18-24': [
          { name: 'Bella Swan', source: 'Twilight', quote: 'I\'m not good for you.', description: 'Helplessness as identity' },
          { name: 'Marnie Michaels', source: 'Girls', quote: 'Why does everything happen to me?', description: 'Life happens TO them, never because of them' }
        ],
        '25-34': [
          { name: 'Skyler White', source: 'Breaking Bad', quote: 'I didn\'t ask for this.', description: 'Perpetual martyrdom in relationships' },
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'Everyone has always hurt me.', description: 'Past pain justifies current behavior' }
        ],
        '35+': [
          { name: 'Livia Soprano', source: 'The Sopranos', quote: 'Poor me.', description: 'Weaponized victimhood' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Kylo Ren', source: 'Star Wars', quote: 'I didn\'t choose this.', description: 'Blames others for their choices' },
          { name: 'Jesse Pinkman', source: 'Breaking Bad', quote: 'I\'m the victim here!', description: 'Consequences are always unfair' }
        ],
        '25-34': [
          { name: 'Ross Geller', source: 'Friends', quote: 'My marriage is falling apart.', description: 'Everything bad happens TO him' },
          { name: 'Ted Mosby', source: 'How I Met Your Mother', quote: 'Why do I always get hurt?', description: 'Romantic victim complex' }
        ],
        '35+': [
          { name: 'Jaime Lannister', source: 'Game of Thrones', quote: 'The things I do for love.', description: 'Past trauma excuses current behavior' }
        ]
      }
    },

    'The Parental Seeker': {
      female: {
        '18-24': [
          { name: 'Anastasia Steele', source: '50 Shades', quote: 'I don\'t know what I\'m doing.', description: 'Needs constant guidance and approval' },
          { name: 'Belle', source: 'Beauty and the Beast', quote: 'I want someone to take care of me.', description: 'Seeks father figure in romantic partner' }
        ],
        '25-34': [
          { name: 'Bridget Jones', source: 'Bridget Jones Diary', quote: 'I need someone to tell me what to do.', description: 'Adult decisions feel overwhelming' },
          { name: 'Carrie Bradshaw', source: 'Sex and the City', quote: 'I couldn\'t help but wonder...', description: 'Needs constant reassurance and validation' }
        ],
        '35+': [
          { name: 'Charlotte York', source: 'Sex and the City', quote: 'I just want to be taken care of.', description: 'Traditional dependence on partner' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Peter Parker', source: 'Spider-Man', quote: 'I need guidance.', description: 'Looks for mother figure in relationships' },
          { name: 'Luke Skywalker', source: 'Star Wars', quote: 'I need someone to show me my place in all this.', description: 'Seeks direction and approval' }
        ],
        '25-34': [
          { name: 'George Costanza', source: 'Seinfeld', quote: 'I live with my parents.', description: 'Wants partner to mother him' },
          { name: 'Andy Dwyer', source: 'Parks & Rec', quote: 'I don\'t know how to adult.', description: 'Childlike dependence on partner' }
        ],
        '35+': [
          { name: 'Ray Barone', source: 'Everybody Loves Raymond', quote: 'My mother says...', description: 'Never truly left parental home emotionally' }
        ]
      }
    },

    'The Rake': {
      female: {
        '18-24': [
          { name: 'Samantha Jones', source: 'Sex and the City', quote: 'I\'m a trisexual. I\'ll try anything once.', description: 'Seduction is a game, not intimacy' },
          { name: 'Cat Woman', source: 'Batman', quote: 'I am Catwoman. Hear me roar.', description: 'Uses sexuality to maintain power' }
        ],
        '25-34': [
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'Power is power.', description: 'Seduction as manipulation tool' },
          { name: 'Jessica Rabbit', source: 'Who Framed Roger Rabbit', quote: 'I\'m not bad, I\'m just drawn that way.', description: 'Weaponized sexuality' }
        ],
        '35+': [
          { name: 'Samantha Jones', source: 'Sex and the City', quote: 'I don\'t have relationships, I have affairs.', description: 'Seduction over substance' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Chuck Bass', source: 'Gossip Girl', quote: 'I\'m Chuck Bass.', description: 'Entitled seduction and conquest' },
          { name: 'James Bond', source: '007 Movies', quote: 'Bond. James Bond.', description: 'Charming but emotionally unavailable' }
        ],
        '25-34': [
          { name: 'Don Draper', source: 'Mad Men', quote: 'What you call love was invented by guys like me.', description: 'Professional seducer with empty core' },
          { name: 'Barney Stinson', source: 'How I Met Your Mother', quote: 'Legen... wait for it... dary!', description: 'Conquest over connection' }
        ],
        '35+': [
          { name: 'Frank Sinatra', source: 'Real Life', quote: 'I did it my way.', description: 'Classic rake - charming but unreliable' }
        ]
      }
    },

    'The Future Faker': {
      female: {
        '18-24': [
          { name: 'Daisy Buchanan', source: 'The Great Gatsby', quote: 'I hope she\'ll be a fool.', description: 'Beautiful promises that never materialize' },
          { name: 'Amy Dunne', source: 'Gone Girl', quote: 'I was told love should be unconditional.', description: 'Creates perfect future fantasies to manipulate' }
        ],
        '25-34': [
          { name: 'Cersei Lannister', source: 'Game of Thrones', quote: 'When you play the game of thrones, you win or you die.', description: 'Promises the world to get what she wants' },
          { name: 'Rebecca Bunch', source: 'Crazy Ex-Girlfriend', quote: 'I\'m just a girl in love!', description: 'Fantasy futures to avoid present reality' }
        ],
        '35+': [
          { name: 'Blanche DuBois', source: 'A Streetcar Named Desire', quote: 'I don\'t want realism. I want magic!', description: 'Lives in fantasy to avoid harsh reality' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Jay Gatsby', source: 'The Great Gatsby', quote: 'Of course you can repeat the past.', description: 'Grand romantic gestures that are hollow' },
          { name: 'Ted Mosby', source: 'How I Met Your Mother', quote: 'I love you.', description: 'Future plans on the second date' }
        ],
        '25-34': [
          { name: 'Don Draper', source: 'Mad Men', quote: 'It will shock you how much it never happened.', description: 'Sells dreams professionally and personally' },
          { name: 'Walter White', source: 'Breaking Bad', quote: 'I did it for the family.', description: 'Justifies present harm with future promises' }
        ],
        '35+': [
          { name: 'Willy Loman', source: 'Death of a Salesman', quote: 'The man who makes an appearance is the man who gets ahead.', description: 'Lives in fantasy of future success' }
        ]
      }
    },

    'The Self-Obsessed': {
      female: {
        '18-24': [
          { name: 'Regina George', source: 'Mean Girls', quote: 'I\'m not like other girls.', description: 'Everything is about how it affects her' },
          { name: 'Marnie Michaels', source: 'Girls', quote: 'I\'m the main character.', description: 'Others exist to support her story' }
        ],
        '25-34': [
          { name: 'Carrie Bradshaw', source: 'Sex and the City', quote: 'I couldn\'t help but wonder...', description: 'Every situation becomes about her feelings' },
          { name: 'Narcissa Malfoy', source: 'Harry Potter', quote: 'My son.', description: 'Others exist to reflect her greatness' }
        ],
        '35+': [
          { name: 'Lucille Bluth', source: 'Arrested Development', quote: 'I don\'t understand the question and I won\'t respond to it.', description: 'Complete inability to see other perspectives' }
        ]
      },
      male: {
        '18-24': [
          { name: 'Draco Malfoy', source: 'Harry Potter', quote: 'My father will hear about this.', description: 'Entitled narcissism from birth' },
          { name: 'Joffrey Baratheon', source: 'Game of Thrones', quote: 'I am the king!', description: 'Complete lack of empathy for others' }
        ],
        '25-34': [
          { name: 'Tony Stark', source: 'Iron Man', quote: 'I am Iron Man.', description: 'Genius as excuse for self-centeredness' },
          { name: 'Gaston', source: 'Beauty and the Beast', quote: 'No one\'s slick as Gaston.', description: 'Obsessed with his own reflection' }
        ],
        '35+': [
          { name: 'Frank Reynolds', source: 'It\'s Always Sunny', quote: 'I don\'t care.', description: 'Complete lack of concern for others' }
        ]
      }
    }

    // Add more personas with complete character references for all demographics...
  },

  'europe': {
    'The Drill Sergeant': {
      female: {
        '18-24': [
          {
            name: 'Hermione Granger (adult)',
            source: 'Harry Potter',
            quote: 'Are you sure that\'s a real spell? Well, it\'s not very good, is it?',
            description: 'Perfectionist who constantly corrects others and has impossibly high standards for everything'
          },
          {
            name: 'Miranda Priestly',
            source: 'The Devil Wears Prada',
            quote: 'By all means move at a glacial pace. You know how that thrills me.',
            description: 'Demanding perfectionist who criticizes every detail and expects flawless execution'
          },
          {
            name: 'Maeve Wiley',
            source: 'Sex Education',
            quote: 'You\'re all idiots. All of you.',
            description: 'Sharp-tongued critic who holds everyone to impossibly high intellectual standards'
          }
        ],
        '25-34': [
          {
            name: 'Fleabag\'s Stepmother',
            source: 'Fleabag',
            quote: 'I just think you could try a bit harder.',
            description: 'Passive-aggressive perfectionist who constantly finds fault in others\' efforts'
          },
          {
            name: 'Lady Catherine de Bourgh',
            source: 'Pride and Prejudice',
            quote: 'I am not used to submit to any person\'s whims.',
            description: 'Domineering woman who believes her way is the only correct way'
          },
          {
            name: 'Rebecca',
            source: 'Rebecca (2020)',
            quote: 'Last night I dreamt I went to Manderley again.',
            description: 'Sets impossibly high standards based on past perfection that can never be matched'
          }
        ],
        '35+': [
          {
            name: 'Violet Crawley',
            source: 'Downton Abbey',
            quote: 'What is a weekend?',
            description: 'Old-fashioned perfectionist who judges others by rigid traditional standards'
          },
          {
            name: 'Margaret Thatcher',
            source: 'The Crown',
            quote: 'I don\'t think there will be a woman prime minister in my lifetime.',
            description: 'Iron-willed leader who demands absolute precision and conformity'
          },
          {
            name: 'Mrs. Danvers',
            source: 'Rebecca',
            quote: 'She knew everyone who mattered. Everyone loved her.',
            description: 'Obsessed with maintaining impossible standards of perfection from the past'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Draco Malfoy',
            source: 'Harry Potter',
            quote: 'My father will hear about this!',
            description: 'Entitled perfectionist who expects everyone to meet his exacting standards'
          },
          {
            name: 'Chuck Bass',
            source: 'Gossip Girl',
            quote: 'I\'m Chuck Bass.',
            description: 'Demanding perfectionist who controls through criticism and impossible expectations'
          },
          {
            name: 'Adam Groff',
            source: 'Sex Education',
            quote: 'You\'re embarrassing me.',
            description: 'Rigid perfectionist who criticizes partners for not meeting his exact standards'
          }
        ],
        '25-34': [
          {
            name: 'Mr. Darcy (early)',
            source: 'Pride and Prejudice',
            quote: 'She is tolerable, but not handsome enough to tempt me.',
            description: 'Critical perfectionist who judges others harshly by his impossibly high standards'
          },
          {
            name: 'Sherlock Holmes',
            source: 'Sherlock (BBC)',
            quote: 'Anderson, don\'t talk out loud. You lower the IQ of the whole street.',
            description: 'Brilliant but harsh critic who constantly points out others\' inadequacies'
          },
          {
            name: 'Gordon Ramsay',
            source: 'Hell\'s Kitchen UK',
            quote: 'This is a bloody disaster!',
            description: 'Explosive perfectionist who berates others for failing to meet his exacting standards'
          }
        ],
        '35+': [
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'A lion doesn\'t concern himself with the opinion of sheep.',
            description: 'Ruthless perfectionist who demands absolute excellence and obedience'
          },
          {
            name: 'Captain von Trapp',
            source: 'The Sound of Music',
            quote: 'In this house discipline comes first!',
            description: 'Military-minded perfectionist who runs his household like a regiment'
          },
          {
            name: 'Professor Snape',
            source: 'Harry Potter',
            quote: 'You have no subtlety, Potter.',
            description: 'Harsh critic who finds fault in everything and shows no mercy for mistakes'
          }
        ]
      }
    },
    'The Suspicious Strategist': {
      female: {
        '18-24': [
          {
            name: 'Alison DiLaurentis',
            source: 'Pretty Little Liars',
            quote: 'I know all of your secrets.',
            description: 'Manipulative strategist who creates drama to maintain control and relevance'
          },
          {
            name: 'Georgina Sparks',
            source: 'Gossip Girl',
            quote: 'I live for danger.',
            description: 'Creates chaos and problems then positions herself as the solution or savior'
          },
          {
            name: 'Meredith Blake',
            source: 'The Parent Trap',
            quote: 'I\'m not a camp counselor, I\'m a publicist.',
            description: 'Suspicious and scheming, always plotting to get what she wants through manipulation'
          }
        ],
        '25-34': [
          {
            name: 'Amy Dunne',
            source: 'Gone Girl',
            quote: 'I was told love should feel like home. Instead, it felt like I was settling.',
            description: 'Master manipulator who orchestrates elaborate schemes to control her narrative'
          },
          {
            name: 'Rebecca Sharp',
            source: 'Vanity Fair',
            quote: 'I think I could be a good woman, if I had five thousand a year.',
            description: 'Calculating strategist who creates situations to advance her own position'
          },
          {
            name: 'Villanelle',
            source: 'Killing Eve',
            quote: 'I have a very specific skill set.',
            description: 'Paranoid strategist who sees threats everywhere and responds with elaborate schemes'
          }
        ],
        '35+': [
          {
            name: 'Lady Macbeth',
            source: 'Macbeth',
            quote: 'Look like the innocent flower, but be the serpent under it.',
            description: 'Master manipulator who plants seeds of paranoia and orchestrates tragic outcomes'
          },
          {
            name: 'Cersei Lannister',
            source: 'Game of Thrones',
            quote: 'When you play the game of thrones, you win or you die.',
            description: 'Paranoid strategist who sees enemies everywhere and responds with elaborate schemes'
          },
          {
            name: 'Mrs. Coulter',
            source: 'His Dark Materials',
            quote: 'We\'re going to change everything.',
            description: 'Manipulative strategist who creates crises to position herself as indispensable'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Tom Riddle',
            source: 'Harry Potter',
            quote: 'I can make bad things happen to people who are mean to me.',
            description: 'Manipulative strategist who creates problems then offers himself as the solution'
          },
          {
            name: 'Joe Goldberg',
            source: 'You',
            quote: 'I will figure out a way to love me, and you will love me.',
            description: 'Paranoid strategist who creates elaborate scenarios to justify his controlling behavior'
          },
          {
            name: 'Nate Jacobs',
            source: 'Euphoria',
            quote: 'I\'m not a violent person.',
            description: 'Creates toxic situations then positions himself as the victim or hero'
          }
        ],
        '25-34': [
          {
            name: 'Iago',
            source: 'Othello',
            quote: 'I am not what I am.',
            description: 'Master manipulator who plants seeds of suspicion and watches relationships crumble'
          },
          {
            name: 'Petyr Baelish',
            source: 'Game of Thrones',
            quote: 'Chaos is a ladder.',
            description: 'Creates instability and crisis to position himself as indispensable'
          },
          {
            name: 'Moriarty',
            source: 'Sherlock (BBC)',
            quote: 'Every fairy tale needs a good old-fashioned villain.',
            description: 'Orchestrates elaborate schemes to create problems only he can solve'
          }
        ],
        '35+': [
          {
            name: 'Frank Underwood',
            source: 'House of Cards',
            quote: 'There are two kinds of pain. The sort of pain that makes you strong, or useless pain.',
            description: 'Paranoid strategist who manufactures crises to advance his own agenda'
          },
          {
            name: 'Hannibal Lecter',
            source: 'Hannibal',
            quote: 'I\'ve always found the idea of death comforting.',
            description: 'Manipulative strategist who creates psychological chaos then offers twisted comfort'
          },
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'The lion does not concern himself with the opinion of sheep.',
            description: 'Strategic paranoid who sees threats everywhere and responds with calculated schemes'
          }
        ]
      }
    },
    'Master of Everything': {
      female: {
        '18-24': [
          {
            name: 'Emma Woodhouse',
            source: 'Emma',
            quote: 'I always deserve the best treatment because I never put up with any other.',
            description: 'Self-appointed expert who believes she knows what\'s best for everyone'
          },
          {
            name: 'Blair Waldorf',
            source: 'Gossip Girl',
            quote: 'I\'m not a stop along the way. I\'m a destination.',
            description: 'Believes she\'s an expert on fashion, relationships, and social dynamics'
          },
          {
            name: 'Lisa Simpson',
            source: 'The Simpsons',
            quote: 'I\'m an eight-year-old girl with a 159 IQ.',
            description: 'Young know-it-all who has expertise on every subject imaginable'
          }
        ],
        '25-34': [
          {
            name: 'Elizabeth Bennet (early)',
            source: 'Pride and Prejudice',
            quote: 'I am perfectly convinced that Mr. Darcy has no defect.',
            description: 'Quick-witted woman who believes her first impressions are always correct'
          },
          {
            name: 'Liz Lemon',
            source: '30 Rock',
            quote: 'That\'s not that much cheese.',
            description: 'Believes she has all the answers despite evidence to the contrary'
          },
          {
            name: 'Miranda Hart',
            source: 'Miranda',
            quote: 'Such fun!',
            description: 'Self-proclaimed expert on social situations despite constant mishaps'
          }
        ],
        '35+': [
          {
            name: 'Margaret Thatcher',
            source: 'The Crown',
            quote: 'If you want something said, ask a man. If you want something done, ask a woman.',
            description: 'Believes she knows the right way to handle every political and personal situation'
          },
          {
            name: 'Professor McGonagall',
            source: 'Harry Potter',
            quote: 'A witch or wizard\'s true character is shown in times of trouble.',
            description: 'Academic expert who has definitive knowledge on every magical subject'
          },
          {
            name: 'Mary Poppins',
            source: 'Mary Poppins',
            quote: 'Practically perfect in every way.',
            description: 'Self-proclaimed expert on childcare, household management, and life in general'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Spencer Reid',
            source: 'Criminal Minds',
            quote: 'Actually, that\'s not entirely accurate.',
            description: 'Young genius who has encyclopedic knowledge on virtually every subject'
          },
          {
            name: 'Sheldon Cooper',
            source: 'The Big Bang Theory',
            quote: 'I\'m not crazy, my mother had me tested.',
            description: 'Believes he\'s intellectually superior and has expertise on everything'
          },
          {
            name: 'Artemis Fowl',
            source: 'Artemis Fowl',
            quote: 'I am a genius.',
            description: 'Young mastermind who believes his intelligence makes him expert on all matters'
          }
        ],
        '25-34': [
          {
            name: 'Sherlock Holmes',
            source: 'Sherlock (BBC)',
            quote: 'I\'m not a psychopath, I\'m a high-functioning sociopath.',
            description: 'Brilliant detective who believes his deductive abilities make him expert on everything'
          },
          {
            name: 'House',
            source: 'House MD',
            quote: 'Everybody lies.',
            description: 'Medical genius who applies his expertise to judge everyone and everything'
          },
          {
            name: 'Tony Stark',
            source: 'Iron Man',
            quote: 'Sometimes you gotta run before you can walk.',
            description: 'Genius inventor who believes his intelligence qualifies him as expert on all subjects'
          }
        ],
        '35+': [
          {
            name: 'Dumbledore',
            source: 'Harry Potter',
            quote: 'It is our choices that show what we truly are.',
            description: 'Wise mentor who seems to have knowledge and opinions about everything'
          },
          {
            name: 'Dr. Frasier Crane',
            source: 'Frasier',
            quote: 'I\'m listening.',
            description: 'Psychiatrist who believes his education makes him expert on all aspects of life'
          },
          {
            name: 'Professor Higgins',
            source: 'My Fair Lady',
            quote: 'Why can\'t a woman be more like a man?',
            description: 'Academic who believes his expertise in one area makes him authority on all human behavior'
          }
        ]
      }
    },
    'The Subtle Saboteur': {
      female: {
        '18-24': [
          {
            name: 'Regina George',
            source: 'Mean Girls',
            quote: 'Oh my God, I love your bracelet. Where did you get it? That is the ugliest effing thing I\'ve ever seen.',
            description: 'Master of backhanded compliments and subtle undermining disguised as friendship'
          },
          {
            name: 'Mona Vanderwaal',
            source: 'Pretty Little Liars',
            quote: 'I can\'t go around without a face. People know me.',
            description: 'Uses passive aggression and subtle manipulation to undermine others\' confidence'
          },
          {
            name: 'Chanel Oberlin',
            source: 'Scream Queens',
            quote: 'I\'m sorry, are you having a stroke?',
            description: 'Delivers cutting remarks disguised as concern or innocent observations'
          }
        ],
        '25-34': [
          {
            name: 'Caroline Bingley',
            source: 'Pride and Prejudice',
            quote: 'What a delightful library you have at Pemberley, Mr. Darcy!',
            description: 'Uses false praise and subtle digs to undermine rivals while appearing supportive'
          },
          {
            name: 'Fleabag\'s Stepmother',
            source: 'Fleabag',
            quote: 'I just think you could try a bit harder, that\'s all.',
            description: 'Masters passive-aggressive comments that sound helpful but are actually critical'
          },
          {
            name: 'Patsy Stone',
            source: 'Absolutely Fabulous',
            quote: 'Sweetie, darling!',
            description: 'Uses exaggerated affection to mask cruel observations and undermining behavior'
          }
        ],
        '35+': [
          {
            name: 'Mrs. Elton',
            source: 'Emma',
            quote: 'A little upstart, vulgar being.',
            description: 'Uses social propriety as cover for subtle but persistent undermining of others'
          },
          {
            name: 'Aunt Sally',
            source: 'Gavin & Stacey',
            quote: 'Oh, what\'s occurring?',
            description: 'Appears innocent while making cutting observations that undermine others\' confidence'
          },
          {
            name: 'Hyacinth Bucket',
            source: 'Keeping Up Appearances',
            quote: 'It\'s Bouquet!',
            description: 'Uses false refinement to make subtle digs at others\' social status and choices'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Joffrey Baratheon',
            source: 'Game of Thrones',
            quote: 'Everyone is mine to torment.',
            description: 'Uses position of power to make cruel observations disguised as royal decree'
          },
          {
            name: 'Draco Malfoy',
            source: 'Harry Potter',
            quote: 'Famous Harry Potter. Can\'t even go into a bookshop without making the front page.',
            description: 'Delivers undermining comments disguised as observations or jokes'
          },
          {
            name: 'Sebastian Flyte',
            source: 'Brideshead Revisited',
            quote: 'I should like to bury something precious in every place I\'ve been happy.',
            description: 'Uses charm and poetic language to mask manipulative and undermining behavior'
          }
        ],
        '25-34': [
          {
            name: 'Mr. Wickham',
            source: 'Pride and Prejudice',
            quote: 'His behavior to myself has been scandalous.',
            description: 'Charming on surface but spreads doubt and undermines others through subtle insinuation'
          },
          {
            name: 'Tom Wambsgans',
            source: 'Succession',
            quote: 'I wonder if the sad I\'d be without you would be less than the sad I get from being with you.',
            description: 'Uses self-deprecation to deliver cutting observations that undermine partner\'s confidence'
          },
          {
            name: 'Gareth Keenan',
            source: 'The Office (UK)',
            quote: 'I don\'t think you\'re thinking about this tactically.',
            description: 'Undermines colleagues through seemingly helpful observations and corrections'
          }
        ],
        '35+': [
          {
            name: 'Mr. Collins',
            source: 'Pride and Prejudice',
            quote: 'Allow me to say that your refusal of my addresses is merely words of course.',
            description: 'Uses false humility and religious authority to undermine others\' decisions and confidence'
          },
          {
            name: 'David Brent',
            source: 'The Office (UK)',
            quote: 'I\'m not a comedian, I\'m David Brent.',
            description: 'Uses humor and false friendship to make undermining observations about others'
          },
          {
            name: 'Iago',
            source: 'Othello',
            quote: 'I am your own forever.',
            description: 'Master of appearing loyal while planting seeds of doubt and insecurity'
          }
        ]
      }
    },
    'The Addict': {
      female: {
        '18-24': [
          {
            name: 'Rue Bennett',
            source: 'Euphoria',
            quote: 'I promise you, if I could be a different person, I would.',
            description: 'Drug addiction dominates her relationships and decision-making despite good intentions'
          },
          {
            name: 'Effy Stonem',
            source: 'Skins',
            quote: 'Sometimes I think I was born backwards.',
            description: 'Self-destructive behavior and substance use take priority over genuine connections'
          },
          {
            name: 'Marnie Michaels',
            source: 'Girls',
            quote: 'I just want someone to want to hang out with me.',
            description: 'Addicted to validation and attention, prioritizing ego over authentic relationships'
          }
        ],
        '25-34': [
          {
            name: 'Fleabag',
            source: 'Fleabag',
            quote: 'I have a horrible feeling that I\'m a greedy, perverted, selfish, apathetic, cynical, depraved, morally bankrupt woman.',
            description: 'Addicted to self-sabotage and destructive patterns that damage her relationships'
          },
          {
            name: 'Rebecca Bunch',
            source: 'Crazy Ex-Girlfriend',
            quote: 'I\'m just a girl in love.',
            description: 'Addicted to romantic obsession and fantasy, unable to form healthy attachments'
          },
          {
            name: 'Jackie Peyton',
            source: 'Nurse Jackie',
            quote: 'Make it a strong one.',
            description: 'Prescription drug addiction compromises her ability to maintain honest relationships'
          }
        ],
        '35+': [
          {
            name: 'Patsy Stone',
            source: 'Absolutely Fabulous',
            quote: 'One more drink and I\'ll be under the host.',
            description: 'Alcohol and substance abuse define her lifestyle and damage all relationships'
          },
          {
            name: 'Blanche DuBois',
            source: 'A Streetcar Named Desire',
            quote: 'I have always depended on the kindness of strangers.',
            description: 'Addicted to fantasy and illusion, unable to face reality or form genuine connections'
          },
          {
            name: 'Moira Rose',
            source: 'Schitt\'s Creek',
            quote: 'I\'d kill for a good coma right now.',
            description: 'Addicted to drama, attention, and her former lifestyle at the expense of family relationships'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Cook',
            source: 'Skins',
            quote: 'I\'m Cook, and I\'m fucking mental.',
            description: 'Addicted to chaos, drugs, and reckless behavior that destroys his relationships'
          },
          {
            name: 'Nate Jacobs',
            source: 'Euphoria',
            quote: 'I\'ve never felt this way about anyone before.',
            description: 'Addicted to control and power, using manipulation like a drug in relationships'
          },
          {
            name: 'Lip Gallagher',
            source: 'Shameless (US)',
            quote: 'I don\'t know how to be in a relationship.',
            description: 'Alcohol addiction and self-sabotage prevent him from maintaining healthy relationships'
          }
        ],
        '25-34': [
          {
            name: 'Mark Corrigan',
            source: 'Peep Show',
            quote: 'I\'m not angry, I\'m just disappointed.',
            description: 'Addicted to self-pity and passive-aggressive behavior that poisons relationships'
          },
          {
            name: 'Don Draper',
            source: 'Mad Men',
            quote: 'I keep going to a lot of places and ending up somewhere I\'ve already been.',
            description: 'Addicted to alcohol, secrets, and running away from authentic emotional connection'
          },
          {
            name: 'Tommy Shelby',
            source: 'Peaky Blinders',
            quote: 'I don\'t pay for suits. My suits are on the house.',
            description: 'Addicted to power, violence, and control at the expense of family relationships'
          }
        ],
        '35+': [
          {
            name: 'Tony Soprano',
            source: 'The Sopranos',
            quote: 'I\'m like King Midas in reverse.',
            description: 'Various addictions and criminal lifestyle prevent genuine intimacy with family'
          },
          {
            name: 'House',
            source: 'House MD',
            quote: 'Everybody lies.',
            description: 'Addicted to Vicodin and cynicism, using both to avoid emotional vulnerability'
          },
          {
            name: 'Captain Haddock',
            source: 'The Adventures of Tintin',
            quote: 'Billions of bilious blue blistering barnacles!',
            description: 'Alcohol addiction affects his judgment and ability to be fully present in relationships'
          }
        ]
      }
    },
    'The Freewheeler': {
      female: {
        '18-24': [
          {
            name: 'Cassie Ainsworth',
            source: 'Skins',
            quote: 'I\'m fine, I\'m fine.',
            description: 'Avoids responsibility and commitment, floating through life without solid attachments'
          },
          {
            name: 'Phoebe Buffay',
            source: 'Friends',
            quote: 'I don\'t even have a pla.',
            description: 'Free-spirited to a fault, avoids making concrete plans or commitments'
          },
          {
            name: 'Luna Lovegood',
            source: 'Harry Potter',
            quote: 'Things we lose have a way of coming back to us.',
            description: 'Dreamy and ethereal, avoids grounding herself in reality or serious commitment'
          }
        ],
        '25-34': [
          {
            name: 'Shoshanna Shapiro',
            source: 'Girls',
            quote: 'I\'m like really pretty.',
            description: 'Commitment-phobic party girl who avoids serious responsibility in relationships'
          },
          {
            name: 'Bridget Jones',
            source: 'Bridget Jones\'s Diary',
            quote: 'It is a truth universally acknowledged that when one part of your life starts going okay, another falls spectacularly to pieces.',
            description: 'Well-meaning but chaotic, avoids taking full responsibility for relationship problems'
          },
          {
            name: 'Daisy Buchanan',
            source: 'The Great Gatsby',
            quote: 'Do you always watch for the longest day of the year and then miss it?',
            description: 'Careless and irresponsible, flits between options without committing to anything serious'
          }
        ],
        '35+': [
          {
            name: 'Samantha Jones',
            source: 'Sex and the City',
            quote: 'I\'m looking for love. Real love.',
            description: 'Commitment-phobic despite wanting love, sabotages relationships when they get serious'
          },
          {
            name: 'Edina Monsoon',
            source: 'Absolutely Fabulous',
            quote: 'Sweetie darling!',
            description: 'Perpetually irresponsible adult who avoids commitment and mature relationships'
          },
          {
            name: 'Blanche Devereaux',
            source: 'The Golden Girls',
            quote: 'I am a lady!',
            description: 'Avoids serious commitment by constantly seeking new romantic adventures'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Jay Cartwright',
            source: 'The Inbetweeners',
            quote: 'Completed it mate.',
            description: 'Immature and irresponsible, avoids commitment through constant bragging and deflection'
          },
          {
            name: 'Klaus Hargreeves',
            source: 'The Umbrella Academy',
            quote: 'I can talk to the dead.',
            description: 'Uses supernatural abilities and humor to avoid taking responsibility for relationships'
          },
          {
            name: 'Finn Hudson',
            source: 'Glee',
            quote: 'I don\'t want to be defined by one thing.',
            description: 'Well-meaning but indecisive, struggles to commit to relationships or life direction'
          }
        ],
        '25-34': [
          {
            name: 'Jeremy Usborne',
            source: 'Peep Show',
            quote: 'That\'s not very Christmas.',
            description: 'Perpetually immature, avoids adult responsibilities and serious relationship commitment'
          },
          {
            name: 'Andy Bernard',
            source: 'The Office (US)',
            quote: 'I wish there was a way to know you\'re in the good old days before you\'ve actually left them.',
            description: 'Nostalgic and commitment-phobic, always looking backward instead of committing forward'
          },
          {
            name: 'Robin Scherbatsky',
            source: 'How I Met Your Mother',
            quote: 'I\'m not great at the advice.',
            description: 'Career-focused and commitment-phobic, avoids traditional relationship expectations'
          }
        ],
        '35+': [
          {
            name: 'Peter Pan',
            source: 'Peter Pan',
            quote: 'All children, except one, grow up.',
            description: 'The ultimate commitment-phobe who refuses to grow up or take on adult responsibilities'
          },
          {
            name: 'Bertie Wooster',
            source: 'Jeeves and Wooster',
            quote: 'What ho!',
            description: 'Wealthy bachelor who avoids commitment and responsibility through perpetual immaturity'
          },
          {
            name: 'Captain Jack Sparrow',
            source: 'Pirates of the Caribbean',
            quote: 'The problem is not the problem. The problem is your attitude about the problem.',
            description: 'Charming rogue who avoids commitment by always seeking the next adventure'
          }
        ]
      }
    },
    'The Thinker': {
      female: {
        '18-24': [
          {
            name: 'Beth Harmon',
            source: 'The Queen\'s Gambit',
            quote: 'I prefer to be alone.',
            description: 'Brilliant strategist who intellectualizes emotions rather than feeling them'
          },
          {
            name: 'Amy Santiago',
            source: 'Brooklyn Nine-Nine',
            quote: 'I need to make a binder.',
            description: 'Over-analyzes every situation and relationship detail instead of experiencing emotions'
          },
          {
            name: 'Hermione Granger',
            source: 'Harry Potter',
            quote: 'Books! And cleverness! There are more important things.',
            description: 'Relies on logic and research to solve problems rather than trusting feelings'
          }
        ],
        '25-34': [
          {
            name: 'Liz Lemon',
            source: '30 Rock',
            quote: 'I believe that all anyone really wants in this life is to sit in peace and eat a sandwich.',
            description: 'Uses humor and intellectualization to avoid dealing with deeper emotional issues'
          },
          {
            name: 'Eleanor Shellstrop',
            source: 'The Good Place',
            quote: 'I need to learn about ethics.',
            description: 'Over-thinks moral and emotional situations rather than trusting her instincts'
          },
          {
            name: 'Temperance Brennan',
            source: 'Bones',
            quote: 'I don\'t know what that means.',
            description: 'Highly analytical forensic anthropologist who struggles with emotional intelligence'
          }
        ],
        '35+': [
          {
            name: 'Diane Chambers',
            source: 'Cheers',
            quote: 'I have a degree in psychology.',
            description: 'Over-educated intellectual who analyzes relationships rather than experiencing them'
          },
          {
            name: 'Martha Jones',
            source: 'Doctor Who',
            quote: 'I spent a lot of time with you thinking I was second best.',
            description: 'Medical professional who intellectualizes romantic feelings rather than expressing them'
          },
          {
            name: 'Professor McGonagall',
            source: 'Harry Potter',
            quote: 'Transfiguration is some of the most complex and dangerous magic you will learn.',
            description: 'Academic who approaches all problems, including emotional ones, through intellectual analysis'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Spencer Reid',
            source: 'Criminal Minds',
            quote: 'Statistics show that...',
            description: 'Genius profiler who uses facts and analysis to avoid dealing with emotional vulnerability'
          },
          {
            name: 'Data',
            source: 'Star Trek: The Next Generation',
            quote: 'I do not understand.',
            description: 'Android who approaches human emotions through analysis rather than experience'
          },
          {
            name: 'Sheldon Cooper',
            source: 'The Big Bang Theory',
            quote: 'I\'m not crazy, my mother had me tested.',
            description: 'Brilliant physicist who intellectualizes all social and emotional interactions'
          }
        ],
        '25-34': [
          {
            name: 'Sherlock Holmes',
            source: 'Sherlock (BBC)',
            quote: 'The game is on.',
            description: 'Master detective who treats relationships like puzzles to be solved rather than experienced'
          },
          {
            name: 'Spock',
            source: 'Star Trek',
            quote: 'Logic is the beginning of wisdom, not the end.',
            description: 'Half-Vulcan who suppresses emotions in favor of logical analysis'
          },
          {
            name: 'Dr. House',
            source: 'House MD',
            quote: 'Everybody lies.',
            description: 'Medical genius who uses diagnosis and analysis to avoid emotional intimacy'
          }
        ],
        '35+': [
          {
            name: 'Hannibal Lecter',
            source: 'Hannibal',
            quote: 'I\'ve always found the idea of death comforting.',
            description: 'Brilliant psychiatrist who intellectualizes all emotions, including the darkest impulses'
          },
          {
            name: 'Dr. Frasier Crane',
            source: 'Frasier',
            quote: 'I\'m listening.',
            description: 'Psychiatrist who over-analyzes every relationship and emotional situation'
          },
          {
            name: 'Professor Dumbledore',
            source: 'Harry Potter',
            quote: 'It is our choices that show what we truly are.',
            description: 'Wise mentor who approaches emotional problems through philosophical analysis'
          }
        ]
      }
    },
    'Emotional Invalidator': {
      female: {
        '18-24': [
          {
            name: 'Marnie Michaels',
            source: 'Girls',
            quote: 'You\'re being crazy.',
            description: 'Dismisses others\' emotions as overreactions or signs of instability'
          },
          {
            name: 'Caroline Forbes (early seasons)',
            source: 'The Vampire Diaries',
            quote: 'You\'re being dramatic.',
            description: 'Initially dismissive of others\' emotional pain, calling it attention-seeking'
          },
          {
            name: 'Cordelia Chase',
            source: 'Buffy the Vampire Slayer',
            quote: 'That\'s nice. Can we focus on me now?',
            description: 'Self-centered character who minimizes others\' feelings in favor of her own'
          }
        ],
        '25-34': [
          {
            name: 'Rebecca Sharp',
            source: 'Vanity Fair',
            quote: 'I think I could be a good woman if I had five thousand a year.',
            description: 'Manipulative woman who dismisses others\' genuine emotions as weakness or foolishness'
          },
          {
            name: 'Caroline Bingley',
            source: 'Pride and Prejudice',
            quote: 'I am perfectly convinced that Mr. Darcy has no defect.',
            description: 'Dismisses Elizabeth\'s legitimate concerns and feelings as jealousy or ignorance'
          },
          {
            name: 'Fleabag\'s Stepmother',
            source: 'Fleabag',
            quote: 'I just want everyone to be happy.',
            description: 'Uses false concern to dismiss and invalidate others\' genuine emotional experiences'
          }
        ],
        '35+': [
          {
            name: 'Aunt Reed',
            source: 'Jane Eyre',
            quote: 'You ought not to think yourself on an equality with the Misses Reed and Master Reed.',
            description: 'Cruel guardian who consistently invalidates Jane\'s feelings and experiences'
          },
          {
            name: 'Mrs. Bennet',
            source: 'Pride and Prejudice',
            quote: 'Oh! My dear Mr. Bennet, how can you be so tiresome!',
            description: 'Dismisses her daughters\' real concerns while dramatizing trivial matters'
          },
          {
            name: 'Hyacinth Bucket',
            source: 'Keeping Up Appearances',
            quote: 'People will think what they think.',
            description: 'Invalidates family members\' feelings in favor of maintaining social appearances'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Draco Malfoy',
            source: 'Harry Potter',
            quote: 'You\'re going to pay for this, Potter.',
            description: 'Dismisses others\' legitimate concerns and feelings as weakness or inferiority'
          },
          {
            name: 'Chuck Bass (early seasons)',
            source: 'Gossip Girl',
            quote: 'You\'re being emotional.',
            description: 'Uses dismissive language to invalidate partners\' feelings and concerns'
          },
          {
            name: 'Dudley Dursley',
            source: 'Harry Potter',
            quote: 'He\'s just making it up.',
            description: 'Consistently dismisses Harry\'s traumatic experiences as lies or attention-seeking'
          }
        ],
        '25-34': [
          {
            name: 'Mr. Darcy (early)',
            source: 'Pride and Prejudice',
            quote: 'She is tolerable, but not handsome enough to tempt me.',
            description: 'Initially dismissive of others\' feelings and social worth based on class prejudice'
          },
          {
            name: 'Logan Huntzberger',
            source: 'Gilmore Girls',
            quote: 'You\'re being ridiculous.',
            description: 'Wealthy playboy who dismisses girlfriend\'s career ambitions and emotional needs'
          },
          {
            name: 'Tom Wambsgans',
            source: 'Succession',
            quote: 'You\'re being hysterical.',
            description: 'Uses gaslighting language to invalidate his wife\'s legitimate emotional responses'
          }
        ],
        '35+': [
          {
            name: 'Mr. Rochester',
            source: 'Jane Eyre',
            quote: 'You think too much of the love of human beings.',
            description: 'Dismisses Jane\'s need for equality and emotional validation in their relationship'
          },
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'You\'re weak.',
            description: 'Consistently dismisses his children\'s emotional needs and legitimate concerns'
          },
          {
            name: 'Vernon Dursley',
            source: 'Harry Potter',
            quote: 'There\'s no such thing as magic.',
            description: 'Aggressively invalidates Harry\'s reality and traumatic experiences'
          }
        ]
      }
    },
    'The Emotionally Distant': {
      female: {
        '18-24': [
          {
            name: 'Arya Stark',
            source: 'Game of Thrones',
            quote: 'A girl has no name.',
            description: 'Trauma has caused her to disconnect from emotions and close relationships'
          },
          {
            name: 'Eleven',
            source: 'Stranger Things',
            quote: 'I don\'t understand.',
            description: 'Struggles with emotional expression and intimacy due to isolated upbringing'
          },
          {
            name: 'Wednesday Addams',
            source: 'Wednesday',
            quote: 'I find social media to be a soul-sucking void of meaningless affirmation.',
            description: 'Maintains emotional distance through sarcasm and cynicism'
          }
        ],
        '25-34': [
          {
            name: 'Fleabag',
            source: 'Fleabag',
            quote: 'I don\'t know how to do this.',
            description: 'Uses humor and breaking the fourth wall to avoid genuine emotional intimacy'
          },
          {
            name: 'Villanelle',
            source: 'Killing Eve',
            quote: 'I don\'t feel things the way you do.',
            description: 'Psychopathic tendencies create barrier to genuine emotional connection'
          },
          {
            name: 'Olivia Pope',
            source: 'Scandal',
            quote: 'I handle things.',
            description: 'Uses professional competence to maintain emotional walls and avoid vulnerability'
          }
        ],
        '35+': [
          {
            name: 'Lady Mary Crawley',
            source: 'Downton Abbey',
            quote: 'I\'m not good at being happy.',
            description: 'Upper-class upbringing created emotional barriers and difficulty with intimacy'
          },
          {
            name: 'Margaret Thatcher',
            source: 'The Crown',
            quote: 'I don\'t think there will be a woman prime minister in my lifetime.',
            description: 'Professional armor prevents genuine emotional vulnerability in personal relationships'
          },
          {
            name: 'Helen Graham',
            source: 'The Tenant of Wildfell Hall',
            quote: 'I am not afraid of solitude.',
            description: 'Past trauma causes withdrawal from emotional intimacy as self-protection'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Jon Snow',
            source: 'Game of Thrones',
            quote: 'I know nothing.',
            description: 'Brooding and emotionally guarded, struggles to express feelings or vulnerability'
          },
          {
            name: 'Edward Cullen',
            source: 'Twilight',
            quote: 'I don\'t want to be a monster.',
            description: 'Uses supernatural nature as excuse to maintain emotional distance from loved ones'
          },
          {
            name: 'Jughead Jones',
            source: 'Riverdale',
            quote: 'I\'m weird. I\'m a weirdo.',
            description: 'Uses cynicism and detachment to avoid emotional vulnerability'
          }
        ],
        '25-34': [
          {
            name: 'Mr. Darcy',
            source: 'Pride and Prejudice',
            quote: 'I do not have the talent of conversing easily with people I have never met before.',
            description: 'Pride and social awkwardness create barriers to emotional intimacy'
          },
          {
            name: 'Sherlock Holmes',
            source: 'Sherlock (BBC)',
            quote: 'Sentiment is a chemical defect found in the losing side.',
            description: 'Uses intellectual superiority to avoid emotional connection and vulnerability'
          },
          {
            name: 'Don Draper',
            source: 'Mad Men',
            quote: 'I don\'t think about you at all.',
            description: 'Compartmentalizes emotions and maintains distance even from family'
          }
        ],
        '35+': [
          {
            name: 'Severus Snape',
            source: 'Harry Potter',
            quote: 'Always.',
            description: 'Past trauma and unrequited love create permanent emotional walls'
          },
          {
            name: 'Mr. Rochester',
            source: 'Jane Eyre',
            quote: 'I have a strange feeling with regard to you.',
            description: 'Dark secrets and past mistakes create barriers to emotional honesty'
          },
          {
            name: 'Captain von Trapp',
            source: 'The Sound of Music',
            quote: 'I don\'t know how to love them.',
            description: 'Grief and military discipline create emotional distance from children and romantic interests'
          }
        ]
      }
    },
    'The Perpetual Victim': {
      female: {
        '18-24': [
          {
            name: 'Bella Swan',
            source: 'Twilight',
            quote: 'I\'m not good at anything.',
            description: 'Constantly portrays herself as helpless and in need of rescue from others'
          },
          {
            name: 'Hannah Baker',
            source: '13 Reasons Why',
            quote: 'Everything affects everything.',
            description: 'Blames external circumstances for her problems without taking personal responsibility'
          },
          {
            name: 'Marnie Michaels',
            source: 'Girls',
            quote: 'Why does everything bad happen to me?',
            description: 'Self-centered victim who believes the world conspires against her specifically'
          }
        ],
        '25-34': [
          {
            name: 'Rebecca Bunch',
            source: 'Crazy Ex-Girlfriend',
            quote: 'I\'m just a girl in love.',
            description: 'Uses mental health and romantic obsession to avoid taking responsibility for her actions'
          },
          {
            name: 'Carrie Bradshaw',
            source: 'Sex and the City',
            quote: 'I couldn\'t help but wonder...',
            description: 'Presents relationship problems as things happening TO her rather than examining her role'
          },
          {
            name: 'Bridget Jones',
            source: 'Bridget Jones\'s Diary',
            quote: 'It is a truth universally acknowledged that when one part of your life starts going okay, another falls spectacularly to pieces.',
            description: 'Views herself as perpetually unlucky rather than taking control of her circumstances'
          }
        ],
        '35+': [
          {
            name: 'Blanche DuBois',
            source: 'A Streetcar Named Desire',
            quote: 'I have always depended on the kindness of strangers.',
            description: 'Refuses to take responsibility for her circumstances, always positioning herself as victim'
          },
          {
            name: 'Mrs. Bennet',
            source: 'Pride and Prejudice',
            quote: 'Nobody can tell what I suffer!',
            description: 'Dramatizes minor inconveniences while failing to address real family problems'
          },
          {
            name: 'Hyacinth Bucket',
            source: 'Keeping Up Appearances',
            quote: 'I do suffer so.',
            description: 'Presents herself as victim of family embarrassment rather than addressing her own behavior'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Kylo Ren',
            source: 'Star Wars',
            quote: 'I feel it again... the call to the light.',
            description: 'Blames family and mentors for his choices rather than taking responsibility for actions'
          },
          {
            name: 'Holden Caulfield',
            source: 'The Catcher in the Rye',
            quote: 'People never notice anything.',
            description: 'Sees himself as victim of society\'s phoniness rather than examining his own behavior'
          },
          {
            name: 'Will McKenzie',
            source: 'The Inbetweeners',
            quote: 'This always happens to me.',
            description: 'Presents social awkwardness as things happening TO him rather than working on social skills'
          }
        ],
        '25-34': [
          {
            name: 'Mark Corrigan',
            source: 'Peep Show',
            quote: 'This is just typical.',
            description: 'Views himself as perpetually unlucky in love and life rather than addressing his issues'
          },
          {
            name: 'Ross Geller',
            source: 'Friends',
            quote: 'Why does this always happen to me?',
            description: 'Presents relationship failures as bad luck rather than examining his own patterns'
          },
          {
            name: 'Charlie Harper',
            source: 'Two and a Half Men',
            quote: 'Women are crazy.',
            description: 'Blames all relationship problems on women rather than examining his own behavior'
          }
        ],
        '35+': [
          {
            name: 'Willy Loman',
            source: 'Death of a Salesman',
            quote: 'I don\'t know the reason for it, but they just pass me by.',
            description: 'Blames external circumstances for his failures rather than taking responsibility'
          },
          {
            name: 'Uncle Vernon',
            source: 'Harry Potter',
            quote: 'Look what you\'ve done now!',
            description: 'Blames Harry and magical world for problems rather than addressing his own prejudice'
          },
          {
            name: 'David Brent',
            source: 'The Office (UK)',
            quote: 'I\'m not being funny, but...',
            description: 'Presents workplace problems as others not understanding his brilliance'
          }
        ]
      }
    },
    'The Parental Seeker': {
      female: {
        '18-24': [
          {
            name: 'Bella Swan',
            source: 'Twilight',
            quote: 'I need you to take care of me.',
            description: 'Seeks partners who will make all decisions and take complete care of her'
          },
          {
            name: 'Annie Edison',
            source: 'Community',
            quote: 'I need someone to tell me what to do.',
            description: 'High-achieving but seeks authority figures to guide her personal decisions'
          },
          {
            name: 'Daphne Blake',
            source: 'Scooby-Doo',
            quote: 'Someone help me!',
            description: 'Constantly needs rescue and guidance from stronger, more capable partners'
          }
        ],
        '25-34': [
          {
            name: 'Bridget Jones',
            source: 'Bridget Jones\'s Diary',
            quote: 'I don\'t know what I\'m doing.',
            description: 'Seeks partners who will provide structure and guidance for her chaotic life'
          },
          {
            name: 'Carrie Bradshaw',
            source: 'Sex and the City',
            quote: 'I\'m looking for love. Real love.',
            description: 'Seeks relationships where partner provides financial and emotional stability'
          },
          {
            name: 'Penny',
            source: 'The Big Bang Theory',
            quote: 'I don\'t understand any of this.',
            description: 'Relies on partners to explain the world and make important decisions'
          }
        ],
        '35+': [
          {
            name: 'Blanche DuBois',
            source: 'A Streetcar Named Desire',
            quote: 'I have always depended on the kindness of strangers.',
            description: 'Seeks men who will take care of her financially and emotionally like a father'
          },
          {
            name: 'Daisy Buchanan',
            source: 'The Great Gatsby',
            quote: 'I hope she\'ll be a fool—that\'s the best thing a girl can be in this world.',
            description: 'Wealthy woman who seeks men to make decisions and provide for her'
          },
          {
            name: 'Lady Bertram',
            source: 'Mansfield Park',
            quote: 'I can do nothing without my husband.',
            description: 'Completely dependent on others for all practical and emotional needs'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Dudley Dursley',
            source: 'Harry Potter',
            quote: 'I want more!',
            description: 'Spoiled young man who expects to be taken care of like a child'
          },
          {
            name: 'AJ Soprano',
            source: 'The Sopranos',
            quote: 'I don\'t want to work.',
            description: 'Adult son who expects parents to provide for all his needs indefinitely'
          },
          {
            name: 'Buster Bluth',
            source: 'Arrested Development',
            quote: 'I need mother.',
            description: 'Adult man with extreme dependence on mother figure for all decisions'
          }
        ],
        '25-34': [
          {
            name: 'Raj Koothrappali',
            source: 'The Big Bang Theory',
            quote: 'My parents still support me.',
            description: 'Adult professional who still relies on parents for financial and emotional support'
          },
          {
            name: 'Jeremy Usborne',
            source: 'Peep Show',
            quote: 'Can you sort this out for me?',
            description: 'Immature adult who expects others to handle his responsibilities'
          },
          {
            name: 'Kenneth Parcell',
            source: '30 Rock',
            quote: 'Can you help me?',
            description: 'Adult who seeks parental figures to guide him through basic life decisions'
          }
        ],
        '35+': [
          {
            name: 'George Costanza',
            source: 'Seinfeld',
            quote: 'I\'m living with my parents!',
            description: 'Middle-aged man who still depends on parents and seeks mothering from partners'
          },
          {
            name: 'Alan Harper',
            source: 'Two and a Half Men',
            quote: 'Can I stay here?',
            description: 'Divorced father who seeks others to provide housing and financial support'
          },
          {
            name: 'Bertie Wooster',
            source: 'Jeeves and Wooster',
            quote: 'Jeeves will know what to do.',
            description: 'Wealthy bachelor who depends entirely on his valet to manage his life'
          }
        ]
      }
    },
    'The Rake': {
      female: {
        '18-24': [
          {
            name: 'Blair Waldorf',
            source: 'Gossip Girl',
            quote: 'I\'m not a stop along the way. I\'m a destination.',
            description: 'Uses charm and seduction to maintain power and control in relationships'
          },
          {
            name: 'Margaery Tyrell',
            source: 'Game of Thrones',
            quote: 'I want to be THE queen.',
            description: 'Strategic seductress who uses romantic relationships to gain political power'
          },
          {
            name: 'Cheryl Blossom',
            source: 'Riverdale',
            quote: 'I\'m in the mood for chaos.',
            description: 'Uses sexuality and manipulation to control and conquer romantic interests'
          }
        ],
        '25-34': [
          {
            name: 'Samantha Jones',
            source: 'Sex and the City',
            quote: 'I don\'t have relationships, I have sex.',
            description: 'Treats romantic conquests as trophies rather than seeking genuine connection'
          },
          {
            name: 'Rebecca Sharp',
            source: 'Vanity Fair',
            quote: 'I think I could be a good woman if I had five thousand a year.',
            description: 'Uses charm and seduction to manipulate men for social and financial gain'
          },
          {
            name: 'Villanelle',
            source: 'Killing Eve',
            quote: 'I just really, really like you.',
            description: 'Psychopathic seductress who views romantic targets as exciting conquests'
          }
        ],
        '35+': [
          {
            name: 'Lady Catherine de Bourgh',
            source: 'Pride and Prejudice',
            quote: 'I am not used to submit to any person\'s whims.',
            description: 'Uses social position and manipulation to control romantic outcomes for others'
          },
          {
            name: 'Cleopatra',
            source: 'Antony and Cleopatra',
            quote: 'I will not be triumphed over.',
            description: 'Historical seductress who used romantic relationships to maintain political power'
          },
          {
            name: 'Mrs. Robinson',
            source: 'The Graduate',
            quote: 'Are you trying to seduce me?',
            description: 'Older woman who pursues younger men for conquest rather than genuine connection'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Chuck Bass',
            source: 'Gossip Girl',
            quote: 'I\'m Chuck Bass.',
            description: 'Wealthy playboy who treats romantic relationships as conquests and power games'
          },
          {
            name: 'Damon Salvatore',
            source: 'The Vampire Diaries',
            quote: 'I do believe in killing the messenger.',
            description: 'Vampire who uses supernatural charm to seduce and manipulate romantic interests'
          },
          {
            name: 'Christian Grey',
            source: 'Fifty Shades of Grey',
            quote: 'I don\'t make love. I fuck.',
            description: 'Wealthy dominant who treats relationships as conquest and control rather than love'
          }
        ],
        '25-34': [
          {
            name: 'Don Draper',
            source: 'Mad Men',
            quote: 'I don\'t think about you at all.',
            description: 'Serial seducer who compartmentalizes relationships and avoids genuine intimacy'
          },
          {
            name: 'James Bond',
            source: 'James Bond films',
            quote: 'Bond. James Bond.',
            description: 'Iconic spy who treats romantic encounters as temporary conquests'
          },
          {
            name: 'Barney Stinson',
            source: 'How I Met Your Mother',
            quote: 'It\'s going to be legen— wait for it —dary!',
            description: 'Serial seducer who treats dating as a game with elaborate strategies and conquests'
          }
        ],
        '35+': [
          {
            name: 'Mr. Wickham',
            source: 'Pride and Prejudice',
            quote: 'His behavior to myself has been scandalous.',
            description: 'Charming soldier who seduces women for financial gain and personal pleasure'
          },
          {
            name: 'Captain Jack Sparrow',
            source: 'Pirates of the Caribbean',
            quote: 'Not all treasure is silver and gold, mate.',
            description: 'Charming rogue who treats romantic relationships as adventures to be conquered'
          },
          {
            name: 'Jay Gatsby',
            source: 'The Great Gatsby',
            quote: 'I like large parties. They\'re so intimate.',
            description: 'Wealthy man who uses charm and grand gestures to win back lost love as ultimate conquest'
          }
        ]
      }
    },
    'The Future Faker': {
      female: {
        '18-24': [
          {
            name: 'Marnie Michaels',
            source: 'Girls',
            quote: 'We\'re going to have the most amazing life together.',
            description: 'Makes grand promises about future relationships that never materialize'
          },
          {
            name: 'Alison DiLaurentis',
            source: 'Pretty Little Liars',
            quote: 'Everything\'s going to be perfect.',
            description: 'Creates elaborate fantasies about the future to manipulate and control others'
          },
          {
            name: 'Quinn Fabray',
            source: 'Glee',
            quote: 'We\'re going to be so happy.',
            description: 'Makes promises about future happiness while unable to commit to present reality'
          }
        ],
        '25-34': [
          {
            name: 'Rebecca Bunch',
            source: 'Crazy Ex-Girlfriend',
            quote: 'When we\'re together, everything will be perfect.',
            description: 'Creates elaborate romantic fantasies about future life with obsession targets'
          },
          {
            name: 'Carrie Bradshaw',
            source: 'Sex and the City',
            quote: 'Maybe this is the one.',
            description: 'Constantly fantasizes about perfect future relationships while avoiding present reality'
          },
          {
            name: 'Emma Bovary',
            source: 'Madame Bovary',
            quote: 'She wanted to die, but she also wanted to live in Paris.',
            description: 'Lives in romantic fantasies about future perfect life rather than accepting reality'
          }
        ],
        '35+': [
          {
            name: 'Blanche DuBois',
            source: 'A Streetcar Named Desire',
            quote: 'I don\'t want realism. I want magic!',
            description: 'Creates false narratives about future rescue and perfect life'
          },
          {
            name: 'Mrs. Bennet',
            source: 'Pride and Prejudice',
            quote: 'What a fine thing for our girls!',
            description: 'Constantly makes plans and promises about daughters\' perfect future marriages'
          },
          {
            name: 'Norma Desmond',
            source: 'Sunset Boulevard',
            quote: 'I\'m ready for my close-up.',
            description: 'Lives in fantasy about returning to past glory and future comeback'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Tom Riddle',
            source: 'Harry Potter',
            quote: 'We\'re going to change the wizarding world.',
            description: 'Makes grand promises about future power and glory to recruit followers'
          },
          {
            name: 'Gatsby (young version)',
            source: 'The Great Gatsby',
            quote: 'We\'re going to live forever.',
            description: 'Makes romantic promises about perfect future that he has no realistic plan to achieve'
          },
          {
            name: 'Peter Kavinsky',
            source: 'To All the Boys I\'ve Loved Before',
            quote: 'We\'ll figure it out together.',
            description: 'Makes sweet promises about future without concrete plans to make them reality'
          }
        ],
        '25-34': [
          {
            name: 'Ted Mosby',
            source: 'How I Met Your Mother',
            quote: 'When I meet the right person, everything will fall into place.',
            description: 'Constantly fantasizes about perfect future relationship without working on present issues'
          },
          {
            name: 'Mr. Wickham',
            source: 'Pride and Prejudice',
            quote: 'We could be so happy together.',
            description: 'Makes romantic promises about future happiness while having no means to provide it'
          },
          {
            name: 'Don Draper',
            source: 'Mad Men',
            quote: 'We\'ll start fresh somewhere new.',
            description: 'Repeatedly promises new beginnings and perfect futures while unable to change'
          }
        ],
        '35+': [
          {
            name: 'Jay Gatsby',
            source: 'The Great Gatsby',
            quote: 'Of course you can repeat the past.',
            description: 'Creates elaborate fantasy about recreating perfect past and future with lost love'
          },
          {
            name: 'Willy Loman',
            source: 'Death of a Salesman',
            quote: 'We\'re going to get rich.',
            description: 'Makes grand promises about future success while ignoring present failures'
          },
          {
            name: 'Frank Wheeler',
            source: 'Revolutionary Road',
            quote: 'We\'ll move to Paris and start over.',
            description: 'Makes dramatic promises about escaping to perfect future life'
          }
        ]
      }
    },
    'The Self-Obsessed': {
      female: {
        '18-24': [
          {
            name: 'Blair Waldorf',
            source: 'Gossip Girl',
            quote: 'I\'m not a stop along the way. I\'m a destination.',
            description: 'Everything revolves around her image, status, and needs above all others'
          },
          {
            name: 'Regina George',
            source: 'Mean Girls',
            quote: 'I\'m not like other girls.',
            description: 'Narcissistic queen bee who believes she\'s superior to everyone around her'
          },
          {
            name: 'Emma Woodhouse',
            source: 'Emma',
            quote: 'I always deserve the best treatment.',
            description: 'Self-centered young woman who believes her needs and opinions matter most'
          }
        ],
        '25-34': [
          {
            name: 'Marnie Michaels',
            source: 'Girls',
            quote: 'Can we focus on me for a second?',
            description: 'Consistently redirects conversations and situations to be about her needs and problems'
          },
          {
            name: 'Samantha Jones',
            source: 'Sex and the City',
            quote: 'I\'m fabulous.',
            description: 'While confident, often prioritizes her own pleasure and needs above partners'
          },
          {
            name: 'Rebecca Sharp',
            source: 'Vanity Fair',
            quote: 'I must have my own way.',
            description: 'Manipulative social climber who uses others to advance her own interests'
          }
        ],
        '35+': [
          {
            name: 'Norma Desmond',
            source: 'Sunset Boulevard',
            quote: 'I am big. It\'s the pictures that got small.',
            description: 'Aging actress completely absorbed in her own faded glory and needs'
          },
          {
            name: 'Lady Catherine de Bourgh',
            source: 'Pride and Prejudice',
            quote: 'I am not used to submit to any person\'s whims.',
            description: 'Aristocratic woman who believes her opinions and desires should dominate others'
          },
          {
            name: 'Hyacinth Bucket',
            source: 'Keeping Up Appearances',
            quote: 'It\'s Bouquet!',
            description: 'Obsessed with her own social status and image at the expense of family relationships'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Draco Malfoy',
            source: 'Harry Potter',
            quote: 'My father will hear about this!',
            description: 'Entitled young man who believes his family name makes him superior to others'
          },
          {
            name: 'Chuck Bass',
            source: 'Gossip Girl',
            quote: 'I\'m Chuck Bass.',
            description: 'Wealthy teenager who believes his money and status put him above moral rules'
          },
          {
            name: 'Joffrey Baratheon',
            source: 'Game of Thrones',
            quote: 'Everyone is mine to torment.',
            description: 'Sadistic prince who believes the world exists solely for his pleasure and power'
          }
        ],
        '25-34': [
          {
            name: 'Don Draper',
            source: 'Mad Men',
            quote: 'I don\'t think about you at all.',
            description: 'Advertising executive whose entire world revolves around his image and success'
          },
          {
            name: 'Tom Wambsgans',
            source: 'Succession',
            quote: 'I\'m really important.',
            description: 'Social climber who prioritizes his own advancement over genuine relationships'
          },
          {
            name: 'Patrick Bateman',
            source: 'American Psycho',
            quote: 'I simply am not there.',
            description: 'Narcissistic psychopath completely absorbed in his own image and desires'
          }
        ],
        '35+': [
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'A lion doesn\'t concern himself with the opinion of sheep.',
            description: 'Powerful patriarch who believes his legacy and desires matter more than anyone else\'s'
          },
          {
            name: 'Mr. Collins',
            source: 'Pride and Prejudice',
            quote: 'I am particularly conscious of my good fortune.',
            description: 'Self-important clergyman who believes his position makes him superior to others'
          },
          {
            name: 'Captain Ahab',
            source: 'Moby Dick',
            quote: 'I\'d strike the sun if it insulted me.',
            description: 'Obsessed ship captain whose personal vendetta matters more than his crew\'s lives'
          }
        ]
      }
    },
    'The Puppet Master': {
      female: {
        '18-24': [
          {
            name: 'Regina George',
            source: 'Mean Girls',
            quote: 'I gave him everything. Beautiful hair, perfect teeth, and he cheated on me.',
            description: 'Manipulates social situations and people through guilt, fear, and strategic information'
          },
          {
            name: 'Alison DiLaurentis',
            source: 'Pretty Little Liars',
            quote: 'I know things about people.',
            description: 'Uses secrets and manipulation to control friends and maintain power over them'
          },
          {
            name: 'Cheryl Blossom',
            source: 'Riverdale',
            quote: 'I\'m in the mood for chaos.',
            description: 'Creates drama and manipulates situations to maintain control over social dynamics'
          }
        ],
        '25-34': [
          {
            name: 'Amy Dunne',
            source: 'Gone Girl',
            quote: 'I was told love should feel like home.',
            description: 'Master manipulator who orchestrates elaborate schemes to control her husband'
          },
          {
            name: 'Villanelle',
            source: 'Killing Eve',
            quote: 'I have a very specific skill set.',
            description: 'Psychopathic assassin who uses charm and violence to manipulate and control others'
          },
          {
            name: 'Rebecca Sharp',
            source: 'Vanity Fair',
            quote: 'I think I could be a good woman if I had five thousand a year.',
            description: 'Social climber who manipulates men and situations through deception and charm'
          }
        ],
        '35+': [
          {
            name: 'Lady Macbeth',
            source: 'Macbeth',
            quote: 'Look like the innocent flower, but be the serpent under it.',
            description: 'Manipulates her husband into murder through guilt, ambition, and psychological pressure'
          },
          {
            name: 'Cersei Lannister',
            source: 'Game of Thrones',
            quote: 'When you play the game of thrones, you win or you die.',
            description: 'Uses children, lovers, and political connections as pawns in her game for power'
          },
          {
            name: 'Mrs. Coulter',
            source: 'His Dark Materials',
            quote: 'We\'re going to change everything.',
            description: 'Uses maternal manipulation and religious authority to control and harm children'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Tom Riddle',
            source: 'Harry Potter',
            quote: 'I can make bad things happen to people who are mean to me.',
            description: 'Young sociopath who manipulates through charm, fear, and strategic violence'
          },
          {
            name: 'Joe Goldberg',
            source: 'You',
            quote: 'I will figure out a way to make you love me.',
            description: 'Uses stalking, manipulation, and violence to control romantic interests'
          },
          {
            name: 'Nate Jacobs',
            source: 'Euphoria',
            quote: 'I\'m not a violent person.',
            description: 'Manipulates through gaslighting, blackmail, and psychological abuse'
          }
        ],
        '25-34': [
          {
            name: 'Iago',
            source: 'Othello',
            quote: 'I am not what I am.',
            description: 'Master manipulator who destroys lives through careful psychological manipulation'
          },
          {
            name: 'Petyr Baelish',
            source: 'Game of Thrones',
            quote: 'Chaos is a ladder.',
            description: 'Political manipulator who uses information, debt, and loyalty to control others'
          },
          {
            name: 'Moriarty',
            source: 'Sherlock (BBC)',
            quote: 'Every fairy tale needs a good old-fashioned villain.',
            description: 'Criminal mastermind who manipulates people and situations for intellectual pleasure'
          }
        ],
        '35+': [
          {
            name: 'Frank Underwood',
            source: 'House of Cards',
            quote: 'There are two kinds of pain.',
            description: 'Political manipulator who uses murder, blackmail, and charm to gain power'
          },
          {
            name: 'Hannibal Lecter',
            source: 'Hannibal',
            quote: 'I\'ve always found the idea of death comforting.',
            description: 'Manipulates through psychological insight, creating dependency and fear'
          },
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'The lion does not concern himself with the opinion of sheep.',
            description: 'Uses family loyalty, fear, and strategic cruelty to maintain absolute control'
          }
        ]
      }
    },
    'The Intimidator': {
      female: {
        '18-24': [
          {
            name: 'Tori Vega\'s sister Trina',
            source: 'Victorious',
            quote: 'Do what I say or you\'ll regret it.',
            description: 'Uses aggressive behavior and threats to get her way in relationships'
          },
          {
            name: 'Cheryl Blossom',
            source: 'Riverdale',
            quote: 'I will destroy you.',
            description: 'Uses threats, anger, and fear tactics to maintain control over others'
          },
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'Fear is the only reliable way.',
            description: 'Fire princess who rules through intimidation, threats, and displays of power'
          }
        ],
        '25-34': [
          {
            name: 'Miranda Priestly',
            source: 'The Devil Wears Prada',
            quote: 'By all means move at a glacial pace.',
            description: 'Uses position of power and cutting remarks to intimidate and control subordinates'
          },
          {
            name: 'Nurse Ratched',
            source: 'One Flew Over the Cuckoo\'s Nest',
            quote: 'I run a tight ship here.',
            description: 'Uses institutional power and psychological intimidation to control patients'
          },
          {
            name: 'Villanelle',
            source: 'Killing Eve',
            quote: 'I could kill you right now.',
            description: 'Uses threat of violence and unpredictable behavior to intimidate others'
          }
        ],
        '35+': [
          {
            name: 'Aunt Trunchbull',
            source: 'Matilda',
            quote: 'I have never been able to understand why small children are so disgusting.',
            description: 'Uses physical intimidation and cruel punishments to control children'
          },
          {
            name: 'Dolores Umbridge',
            source: 'Harry Potter',
            quote: 'I will have order!',
            description: 'Uses institutional authority and sadistic punishments to intimidate students'
          },
          {
            name: 'Cersei Lannister',
            source: 'Game of Thrones',
            quote: 'I choose violence.',
            description: 'Uses threats, actual violence, and displays of power to intimidate enemies'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Joffrey Baratheon',
            source: 'Game of Thrones',
            quote: 'I am the king!',
            description: 'Uses royal power, threats, and actual violence to intimidate and control others'
          },
          {
            name: 'Dudley Dursley',
            source: 'Harry Potter',
            quote: 'You\'re gonna get it now, Potter.',
            description: 'School bully who uses physical intimidation and threats to control weaker students'
          },
          {
            name: 'Billy Hargrove',
            source: 'Stranger Things',
            quote: 'I run this town.',
            description: 'Aggressive teenager who uses anger, threats, and violence to intimidate others'
          }
        ],
        '25-34': [
          {
            name: 'Ramsay Bolton',
            source: 'Game of Thrones',
            quote: 'If you think this has a happy ending, you haven\'t been paying attention.',
            description: 'Sadistic lord who uses torture, threats, and psychological terror to control others'
          },
          {
            name: 'Tommy Shelby',
            source: 'Peaky Blinders',
            quote: 'By order of the Peaky Blinders.',
            description: 'Gang leader who uses reputation for violence and actual threats to intimidate rivals'
          },
          {
            name: 'Negan',
            source: 'The Walking Dead',
            quote: 'I hope you got your shitting pants on.',
            description: 'Post-apocalyptic leader who uses brutal displays of violence to maintain control'
          }
        ],
        '35+': [
          {
            name: 'Tywin Lannister',
            source: 'Game of Thrones',
            quote: 'A lion doesn\'t concern himself with the opinion of sheep.',
            description: 'Powerful patriarch who uses reputation for ruthlessness to intimidate enemies'
          },
          {
            name: 'Vernon Dursley',
            source: 'Harry Potter',
            quote: 'There will be no magic in this house!',
            description: 'Uses anger, shouting, and threats to control his household through fear'
          },
          {
            name: 'Tony Soprano',
            source: 'The Sopranos',
            quote: 'You know what? Forget about it.',
            description: 'Mob boss who uses implied and actual violence to intimidate family and associates'
          }
        ]
      }
    },
    'The Clinger': {
      female: {
        '18-24': [
          {
            name: 'Bella Swan',
            source: 'Twilight',
            quote: 'I can\'t live without you.',
            description: 'Obsessively attached to boyfriend, unable to accept boundaries or independence'
          },
          {
            name: 'Amy March',
            source: 'Little Women',
            quote: 'I want to be where you are.',
            description: 'Youngest sister who clings desperately to family and romantic interests'
          },
          {
            name: 'Ginny Weasley (early)',
            source: 'Harry Potter',
            quote: 'I\'ve been waiting for you.',
            description: 'Young girl with obsessive crush who struggles with boundaries and rejection'
          }
        ],
        '25-34': [
          {
            name: 'Rebecca Bunch',
            source: 'Crazy Ex-Girlfriend',
            quote: 'I just want to be where you are.',
            description: 'Moves across country for ex-boyfriend, unable to accept rejection or boundaries'
          },
          {
            name: 'Carrie Bradshaw',
            source: 'Sex and the City',
            quote: 'I had to see you.',
            description: 'Pursues unavailable men obsessively, unable to accept when relationships end'
          },
          {
            name: 'Annie Wilkes',
            source: 'Misery',
            quote: 'I\'m your number one fan.',
            description: 'Obsessed fan who holds her favorite author captive, unable to accept boundaries'
          }
        ],
        '35+': [
          {
            name: 'Mrs. Danvers',
            source: 'Rebecca',
            quote: 'She\'s still here. She\'s everywhere.',
            description: 'Housekeeper obsessively devoted to dead mistress, unable to accept her absence'
          },
          {
            name: 'Glenn Close\'s character',
            source: 'Fatal Attraction',
            quote: 'I will not be ignored.',
            description: 'Woman who becomes dangerously obsessed after brief affair, stalking and threatening'
          },
          {
            name: 'Blanche DuBois',
            source: 'A Streetcar Named Desire',
            quote: 'I have always depended on the kindness of strangers.',
            description: 'Desperately clings to any man who shows interest, unable to be alone'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Edward Cullen',
            source: 'Twilight',
            quote: 'I watch you sleep.',
            description: 'Vampire boyfriend with obsessive, stalking behavior disguised as romantic devotion'
          },
          {
            name: 'Kylo Ren',
            source: 'Star Wars',
            quote: 'You\'re nothing, but not to me.',
            description: 'Obsessed with Rey, unable to accept her rejection and resistance to his control'
          },
          {
            name: 'Tom Riddle',
            source: 'Harry Potter',
            quote: 'I preserved my sixteen-year-old self in a diary.',
            description: 'Even as teenager, shows obsessive need to possess and control others completely'
          }
        ],
        '25-34': [
          {
            name: 'Joe Goldberg',
            source: 'You',
            quote: 'I will figure out a way to make you love me.',
            description: 'Stalker who becomes obsessively attached to women, unable to accept rejection'
          },
          {
            name: 'Ross Geller',
            source: 'Friends',
            quote: 'We were on a break!',
            description: 'Possessive ex-husband who struggles to accept boundaries from his ex-wife'
          },
          {
            name: 'Gatsby',
            source: 'The Great Gatsby',
            quote: 'I\'ve been waiting five years.',
            description: 'Obsessively devoted to married woman from his past, unable to accept reality'
          }
        ],
        '35+': [
          {
            name: 'Heathcliff',
            source: 'Wuthering Heights',
            quote: 'I cannot live without my soul!',
            description: 'Obsessively devoted to Catherine, destructive when unable to possess her completely'
          },
          {
            name: 'Captain Ahab',
            source: 'Moby Dick',
            quote: 'I\'ll chase him round Good Hope.',
            description: 'Obsessively pursuing white whale, unable to accept defeat or move on'
          },
          {
            name: 'Phantom of the Opera',
            source: 'The Phantom of the Opera',
            quote: 'Sing for me!',
            description: 'Obsessed with opera singer, stalks and manipulates her, unable to accept rejection'
          }
        ]
      }
    }
  },
  'asia': {
    'The Drill Sergeant': {
      female: {
        '18-24': [
          {
            name: 'Mikasa Ackerman',
            source: 'Attack on Titan',
            quote: 'If you lose, you die. If you win, you live.',
            description: 'Perfectionist soldier who demands absolute excellence and has impossibly high standards'
          },
          {
            name: 'Yuki Sohma',
            source: 'Fruits Basket',
            quote: 'You must always do your best.',
            description: 'Student council president with perfectionist tendencies who criticizes others\' efforts'
          },
          {
            name: 'Chun-Li',
            source: 'Street Fighter',
            quote: 'Justice will prevail!',
            description: 'Martial artist with rigid discipline who expects perfect execution from herself and others'
          }
        ],
        '25-34': [
          {
            name: 'O-Ren Ishii',
            source: 'Kill Bill',
            quote: 'You didn\'t think it was gonna be that easy, did you?',
            description: 'Yakuza boss who demands perfection and punishes any sign of weakness or failure'
          },
          {
            name: 'Lady Eboshi',
            source: 'Princess Mononoke',
            quote: 'I\'ll cut through anything that stands in my way.',
            description: 'Iron Town leader who maintains impossibly high standards for her community'
          },
          {
            name: 'Motoko Kusanagi',
            source: 'Ghost in the Shell',
            quote: 'If we all reacted the same way, we\'d be predictable.',
            description: 'Cybernetic commander who demands tactical perfection from her team'
          }
        ],
        '35+': [
          {
            name: 'Kaikeyi',
            source: 'Ramayana',
            quote: 'I will have what was promised to me.',
            description: 'Queen who demands absolute adherence to promises and agreements'
          },
          {
            name: 'Empress Wu Zetian',
            source: 'Historical/Chinese dramas',
            quote: 'Perfection is the only acceptable standard.',
            description: 'Historical empress known for demanding absolute excellence and harsh punishments'
          },
          {
            name: 'Mulan\'s Matchmaker',
            source: 'Mulan',
            quote: 'You will never bring honor to your family.',
            description: 'Traditional figure who judges others by impossible cultural standards'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Sasuke Uchiha',
            source: 'Naruto',
            quote: 'I have long since closed my eyes. My only goal is in the darkness.',
            description: 'Perfectionist ninja who demands absolute strength and criticizes any sign of weakness'
          },
          {
            name: 'Katsuki Bakugo',
            source: 'My Hero Academia',
            quote: 'I\'ll kill you!',
            description: 'Explosive hero student who demands perfection and aggressively criticizes others\' failures'
          },
          {
            name: 'Vegeta (early)',
            source: 'Dragon Ball Z',
            quote: 'I am the prince of all Saiyans!',
            description: 'Proud warrior who demands absolute strength and perfection in battle'
          }
        ],
        '25-34': [
          {
            name: 'Byakuya Kuchiki',
            source: 'Bleach',
            quote: 'I cannot afford to lose.',
            description: 'Noble captain who maintains impossibly high standards and shows no mercy for failure'
          },
          {
            name: 'Scar',
            source: 'Fullmetal Alchemist',
            quote: 'Perfection is the enemy of good.',
            description: 'Alchemist warrior who demands absolute adherence to his moral standards'
          },
          {
            name: 'Gin Ichimaru',
            source: 'Bleach',
            quote: 'Disappointment requires adequate preparation.',
            description: 'Captain who maintains perfect facade while demanding excellence from subordinates'
          }
        ],
        '35+': [
          {
            name: 'Genghis Khan',
            source: 'Historical/Mongolian epics',
            quote: 'I am the punishment of God.',
            description: 'Historical conqueror who demanded absolute perfection and obedience from his army'
          },
          {
            name: 'Cao Cao',
            source: 'Romance of the Three Kingdoms',
            quote: 'I would rather betray the world than let the world betray me.',
            description: 'Warlord who demanded absolute loyalty and punished any imperfection'
          },
          {
            name: 'Admiral Yi Sun-sin',
            source: 'Historical Korean dramas',
            quote: 'Victory at all costs.',
            description: 'Naval commander who demanded perfect discipline and execution from his fleet'
          }
        ]
      }
    },
    'The Suspicious Strategist': {
      female: {
        '18-24': [
          {
            name: 'Yuno Gasai',
            source: 'Future Diary',
            quote: 'I\'ll protect you no matter what.',
            description: 'Paranoid stalker who creates dangerous situations to position herself as protector'
          },
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'I\'m a people person.',
            description: 'Fire princess who orchestrates crises to demonstrate her indispensability'
          },
          {
            name: 'Ai Enma',
            source: 'Hell Girl',
            quote: 'This is what you wanted.',
            description: 'Creates supernatural problems then offers herself as the solution'
          }
        ],
        '25-34': [
          {
            name: 'Makima',
            source: 'Chainsaw Man',
            quote: 'I\'m here to help you.',
            description: 'Manipulative devil who creates chaos to position herself as necessary savior'
          },
          {
            name: 'Medusa',
            source: 'Soul Eater',
            quote: 'Everything is going according to plan.',
            description: 'Witch who orchestrates elaborate schemes to create problems only she can solve'
          },
          {
            name: 'Beatrice',
            source: 'Umineko',
            quote: 'I\'ll give you a hint.',
            description: 'Golden witch who creates mysteries and problems to showcase her power'
          }
        ],
        '35+': [
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'All chakra belongs to me.',
            description: 'Ancient goddess who created ninja conflicts to maintain control over humanity'
          },
          {
            name: 'Lady Kaede',
            source: 'Inuyasha',
            quote: 'I will have my revenge.',
            description: 'Priestess who manipulates situations to create conflict between former lovers'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'Everything is according to my design.',
            description: 'Fashion mogul who orchestrates global crisis to position herself as ultimate authority'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I am justice.',
            description: 'Creates crime problems then positions himself as the solution through supernatural means'
          },
          {
            name: 'Lelouch vi Britannia',
            source: 'Code Geass',
            quote: 'I will create a gentle world.',
            description: 'Prince who orchestrates rebellions and conflicts to position himself as savior'
          },
          {
            name: 'Makoto Tachibana',
            source: 'School Days',
            quote: 'I can fix this.',
            description: 'Creates relationship drama then tries to position himself as the solution'
          }
        ],
        '25-34': [
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'All according to plan.',
            description: 'Captain who orchestrates century-long schemes, creating crises to demonstrate superiority'
          },
          {
            name: 'Madara Uchiha',
            source: 'Naruto',
            quote: 'Wake up to reality.',
            description: 'Legendary ninja who creates wars and conflict to prove his vision is necessary'
          },
          {
            name: 'Dio Brando',
            source: 'JoJo\'s Bizarre Adventure',
            quote: 'It was me, Dio!',
            description: 'Vampire who manipulates situations over decades to position himself as ultimate victor'
          }
        ],
        '35+': [
          {
            name: 'Emperor Palpatine',
            source: 'Star Wars (beloved in Asia)',
            quote: 'Everything is proceeding as I have foreseen.',
            description: 'Sith Lord who orchestrates galactic war to position himself as necessary dictator'
          },
          {
            name: 'Cao Cao',
            source: 'Romance of the Three Kingdoms',
            quote: 'I create order from chaos.',
            description: 'Warlord who creates instability to position himself as the only solution'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I am eternal.',
            description: 'Legendary ninja who orchestrates conflicts across generations to achieve immortality'
          }
        ]
      }
    },
    'Master of Everything': {
      female: {
        '18-24': [
          {
            name: 'Haruhi Suzumiya',
            source: 'The Melancholy of Haruhi Suzumiya',
            quote: 'I know everything.',
            description: 'Student who believes she has expertise on all subjects and supernatural phenomena'
          },
          {
            name: 'Sakura Haruno (early)',
            source: 'Naruto',
            quote: 'I know more than you think.',
            description: 'Medical ninja student who claims expertise in areas beyond her actual knowledge'
          },
          {
            name: 'Chitoge Kirisaki',
            source: 'Nisekoi',
            quote: 'Of course I know that!',
            description: 'Transfer student who claims to know everything about Japanese culture and relationships'
          }
        ],
        '25-34': [
          {
            name: 'Bulma',
            source: 'Dragon Ball',
            quote: 'I\'m a genius, you know.',
            description: 'Brilliant scientist who believes her intelligence makes her expert on all matters'
          },
          {
            name: 'Winry Rockbell',
            source: 'Fullmetal Alchemist',
            quote: 'I understand machines better than people.',
            description: 'Automail engineer who applies mechanical thinking to all life situations'
          },
          {
            name: 'Riza Hawkeye',
            source: 'Fullmetal Alchemist',
            quote: 'I\'ve seen it all.',
            description: 'Military sharpshooter who believes her experience qualifies her as expert on everything'
          }
        ],
        '35+': [
          {
            name: 'Tsunade',
            source: 'Naruto',
            quote: 'I am the Hokage.',
            description: 'Medical ninja and village leader who believes her position makes her authority on all subjects'
          },
          {
            name: 'Izumi Curtis',
            source: 'Fullmetal Alchemist',
            quote: 'I\'ve taught you everything you need to know.',
            description: 'Alchemy teacher who claims comprehensive knowledge across all disciplines'
          },
          {
            name: 'Genkai',
            source: 'Yu Yu Hakusho',
            quote: 'I know what\'s best.',
            description: 'Martial arts master who believes her spiritual training gives her wisdom about everything'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I am justice. I am the law.',
            description: 'Genius student who believes his intelligence qualifies him as expert on morality and justice'
          },
          {
            name: 'Senku Ishigami',
            source: 'Dr. Stone',
            quote: 'This is exhilarating!',
            description: 'Scientific genius who believes science gives him expertise on all human problems'
          },
          {
            name: 'Seto Kaiba',
            source: 'Yu-Gi-Oh!',
            quote: 'I\'m the best at everything.',
            description: 'Wealthy duelist who believes his success makes him expert in all fields'
          }
        ],
        '25-34': [
          {
            name: 'Shikamaru Nara',
            source: 'Naruto',
            quote: 'How troublesome.',
            description: 'Strategic genius who believes his intelligence gives him authority on all decisions'
          },
          {
            name: 'L',
            source: 'Death Note',
            quote: 'I am the world\'s greatest detective.',
            description: 'Detective who applies deductive reasoning to claim expertise on all human behavior'
          },
          {
            name: 'Roy Mustang',
            source: 'Fullmetal Alchemist',
            quote: 'I\'ll become the Fuhrer.',
            description: 'Flame alchemist who believes his military and alchemical knowledge qualify him for everything'
          }
        ],
        '35+': [
          {
            name: 'Jiraiya',
            source: 'Naruto',
            quote: 'I\'ve seen the world.',
            description: 'Legendary ninja who believes his travels and experience make him expert on all subjects'
          },
          {
            name: 'Master Roshi',
            source: 'Dragon Ball',
            quote: 'I am the Turtle Hermit.',
            description: 'Martial arts master who claims expertise extending far beyond fighting techniques'
          },
          {
            name: 'Yusuke\'s Teacher',
            source: 'Yu Yu Hakusho',
            quote: 'I\'ll teach you everything.',
            description: 'Spirit world instructor who claims comprehensive knowledge of supernatural and human affairs'
          }
        ]
      }
    },
    'The Subtle Saboteur': {
      female: {
        '18-24': [
          {
            name: 'Ami Kawashima',
            source: 'Toradora!',
            quote: 'I\'m just trying to help.',
            description: 'Model student who uses false concern to undermine others\' relationships and confidence'
          },
          {
            name: 'Misa Amane',
            source: 'Death Note',
            quote: 'Light is so amazing!',
            description: 'Uses excessive praise and devotion to make other women feel inadequate'
          },
          {
            name: 'Rachel',
            source: 'Tower of God',
            quote: 'I just want what\'s best for you.',
            description: 'Childhood friend who sabotages protagonist while appearing supportive'
          }
        ],
        '25-34': [
          {
            name: 'Malty S Melromarc',
            source: 'The Rising of the Shield Hero',
            quote: 'I was just trying to protect everyone.',
            description: 'Princess who uses false accusations and manipulation while maintaining innocent facade'
          },
          {
            name: 'Akane Shinjo',
            source: 'SSSS.Gridman',
            quote: 'I didn\'t mean for this to happen.',
            description: 'Creates kaiju attacks while appearing as concerned citizen trying to help'
          },
          {
            name: 'Yukiko Kudo',
            source: 'Detective Conan',
            quote: 'I\'m worried about you.',
            description: 'Uses concern and care to gather information for manipulation'
          }
        ],
        '35+': [
          {
            name: 'Lady Eboshi',
            source: 'Princess Mononoke',
            quote: 'I\'m protecting my people.',
            description: 'Uses environmental destruction while claiming to help her community'
          },
          {
            name: 'Kikyou',
            source: 'Inuyasha',
            quote: 'I only want peace.',
            description: 'Priestess who undermines relationships while claiming pure motives'
          },
          {
            name: 'Medusa Gorgon',
            source: 'Soul Eater',
            quote: 'I\'m a nurse. I help people.',
            description: 'Uses medical profession as cover for psychological and physical sabotage'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Shinji Matou',
            source: 'Fate/Stay Night',
            quote: 'I\'m just trying to win.',
            description: 'Uses underhanded tactics while claiming to play fair in magical competition'
          },
          {
            name: 'Zenitsu Agatsuma',
            source: 'Demon Slayer',
            quote: 'I\'m scared, but I\'ll help.',
            description: 'Uses self-deprecation and fear to make others lower their guard'
          },
          {
            name: 'Nobuyuki Sugou',
            source: 'Sword Art Online',
            quote: 'I care about her safety.',
            description: 'Uses concern for girlfriend\'s wellbeing to justify controlling behavior'
          }
        ],
        '25-34': [
          {
            name: 'Makoto Tachibana',
            source: 'School Days',
            quote: 'I just want everyone to be happy.',
            description: 'Creates relationship chaos while claiming to want harmony for everyone'
          },
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'I will have my own kingdom.',
            description: 'Uses charm and false friendship to manipulate while planning betrayal'
          },
          {
            name: 'Shou Tucker',
            source: 'Fullmetal Alchemist',
            quote: 'This is for the advancement of science.',
            description: 'Uses noble scientific goals to justify horrific experimental abuse'
          }
        ],
        '35+': [
          {
            name: 'Gendo Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'Everything is for humanity\'s future.',
            description: 'Uses grand humanitarian goals to justify psychological abuse of his son'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I\'m advancing human potential.',
            description: 'Uses scientific advancement as excuse for human experimentation and manipulation'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'I was disappointed in you.',
            description: 'Uses expressions of disappointment and concern to undermine others\' confidence'
          }
        ]
      }
    },
    'The Addict': {
      female: {
        '18-24': [
          {
            name: 'Junko Enoshima',
            source: 'Danganronpa',
            quote: 'Despair is so much more exciting than hope!',
            description: 'Addicted to causing despair and chaos, prioritizing destruction over genuine relationships'
          },
          {
            name: 'Yuno Gasai',
            source: 'Future Diary',
            quote: 'I live for Yukiteru.',
            description: 'Addicted to obsessive love and violence, unable to form healthy attachments'
          },
          {
            name: 'Himiko Toga',
            source: 'My Hero Academia',
            quote: 'I want to become the person I love!',
            description: 'Addicted to violence and blood, using twisted love as justification for harmful behavior'
          }
        ],
        '25-34': [
          {
            name: 'Faye Valentine',
            source: 'Cowboy Bebop',
            quote: 'The past is the past and the future is the future.',
            description: 'Gambling addict whose compulsions damage her ability to maintain stable relationships'
          },
          {
            name: 'Misato Katsuragi',
            source: 'Neon Genesis Evangelion',
            quote: 'I\'m an adult, so I\'ll keep my word.',
            description: 'Alcohol addiction and workaholic tendencies prevent genuine emotional intimacy'
          },
          {
            name: 'Revy',
            source: 'Black Lagoon',
            quote: 'I love the smell of gunpowder.',
            description: 'Addicted to violence and adrenaline, using aggression to avoid emotional vulnerability'
          }
        ],
        '35+': [
          {
            name: 'Tsunade',
            source: 'Naruto',
            quote: 'Sake makes everything better.',
            description: 'Gambling and alcohol addiction stem from trauma, affecting her leadership and relationships'
          },
          {
            name: 'Olivier Armstrong',
            source: 'Fullmetal Alchemist',
            quote: 'Might makes right.',
            description: 'Addicted to military control and power, struggles with civilian relationships'
          },
          {
            name: 'Rangiku Matsumoto',
            source: 'Bleach',
            quote: 'Let\'s drink until we forget!',
            description: 'Uses alcohol and partying to avoid dealing with deeper emotional issues'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Subaru Natsuki',
            source: 'Re:Zero',
            quote: 'I\'ll save everyone!',
            description: 'Addicted to being the hero and savior, unable to accept help or form equal partnerships'
          },
          {
            name: 'Kazuma Satou',
            source: 'KonoSuba',
            quote: 'I\'m a shut-in NEET.',
            description: 'Gaming addiction and social withdrawal prevent him from forming genuine relationships'
          },
          {
            name: 'Shinji Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'I mustn\'t run away.',
            description: 'Addicted to seeking approval and avoiding responsibility, self-sabotages relationships'
          }
        ],
        '25-34': [
          {
            name: 'Spike Spiegel',
            source: 'Cowboy Bebop',
            quote: 'Whatever happens, happens.',
            description: 'Addicted to his past and unable to move forward, sabotages present relationships'
          },
          {
            name: 'Guts',
            source: 'Berserk',
            quote: 'I\'ll keep fighting.',
            description: 'Addicted to revenge and violence, struggles to maintain peaceful relationships'
          },
          {
            name: 'Senku Ishigami',
            source: 'Dr. Stone',
            quote: 'This is exhilarating!',
            description: 'Addicted to scientific discovery, often prioritizes experiments over human connections'
          }
        ],
        '35+': [
          {
            name: 'Jiraiya',
            source: 'Naruto',
            quote: 'Research is very important.',
            description: 'Addicted to his perverted research and sake, avoids commitment to serious relationships'
          },
          {
            name: 'Gintoki Sakata',
            source: 'Gintama',
            quote: 'Sweet things are separate.',
            description: 'Sugar addiction and lazy lifestyle prevent him from taking relationships seriously'
          },
          {
            name: 'Shigure Sohma',
            source: 'Fruits Basket',
            quote: 'I\'m a very sexual person.',
            description: 'Addicted to casual relationships and avoiding emotional commitment'
          }
        ]
      }
    },
    'The Freewheeler': {
      female: {
        '18-24': [
          {
            name: 'Usagi Tsukino',
            source: 'Sailor Moon',
            quote: 'I don\'t want to study!',
            description: 'Avoids responsibility and commitment, prefers fun and games over serious relationships'
          },
          {
            name: 'Aqua',
            source: 'KonoSuba',
            quote: 'I\'ll figure it out later!',
            description: 'Goddess who avoids planning and responsibility, living entirely in the moment'
          },
          {
            name: 'Chitoge Kirisaki',
            source: 'Nisekoi',
            quote: 'I don\'t want to be tied down.',
            description: 'Transfer student who avoids commitment and serious relationship planning'
          }
        ],
        '25-34': [
          {
            name: 'Yoruichi Shihouin',
            source: 'Bleach',
            quote: 'I prefer my freedom.',
            description: 'Former captain who abandoned responsibility for a carefree lifestyle'
          },
          {
            name: 'Mirko',
            source: 'My Hero Academia',
            quote: 'I work alone.',
            description: 'Hero who avoids team commitments and long-term partnership responsibilities'
          },
          {
            name: 'Yoko Littner',
            source: 'Gurren Lagann',
            quote: 'I\'ll go where the wind takes me.',
            description: 'Sniper who avoids settling down or making long-term commitments'
          }
        ],
        '35+': [
          {
            name: 'Tsunade',
            source: 'Naruto',
            quote: 'I don\'t want to be Hokage.',
            description: 'Legendary ninja who fled responsibility and commitment after personal losses'
          },
          {
            name: 'Misato Katsuragi',
            source: 'Neon Genesis Evangelion',
            quote: 'Let\'s not think about tomorrow.',
            description: 'Adult who avoids serious commitment and planning for the future'
          },
          {
            name: 'Fujiko Mine',
            source: 'Lupin III',
            quote: 'I\'m nobody\'s woman.',
            description: 'Thief who avoids commitment while maintaining multiple casual relationships'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Monkey D. Luffy',
            source: 'One Piece',
            quote: 'I don\'t want to be responsible for anyone.',
            description: 'Pirate captain who avoids traditional relationship responsibilities and planning'
          },
          {
            name: 'Natsu Dragneel',
            source: 'Fairy Tail',
            quote: 'I\'ll figure it out as I go.',
            description: 'Dragon slayer who lives entirely in the moment without planning for relationships'
          },
          {
            name: 'Yusuke Urameshi',
            source: 'Yu Yu Hakusho',
            quote: 'I don\'t like being tied down.',
            description: 'Spirit detective who avoids commitment and serious relationship planning'
          }
        ],
        '25-34': [
          {
            name: 'Gintoki Sakata',
            source: 'Gintama',
            quote: 'Tomorrow\'s problems are tomorrow\'s problems.',
            description: 'Samurai who avoids responsibility and commitment through humor and laziness'
          },
          {
            name: 'Kakashi Hatake',
            source: 'Naruto',
            quote: 'I\'m always late because I got lost on the path of life.',
            description: 'Ninja who uses humor and aloofness to avoid serious commitment'
          },
          {
            name: 'Kenpachi Zaraki',
            source: 'Bleach',
            quote: 'I just want to fight.',
            description: 'Captain who avoids all responsibilities except combat, commitment-phobic'
          }
        ],
        '35+': [
          {
            name: 'Master Roshi',
            source: 'Dragon Ball',
            quote: 'I\'m too old for commitment.',
            description: 'Martial arts master who uses age as excuse to avoid serious relationships'
          },
          {
            name: 'Jiraiya',
            source: 'Naruto',
            quote: 'I\'m a free spirit.',
            description: 'Legendary ninja who travels constantly to avoid settling down'
          },
          {
            name: 'Isaac Netero',
            source: 'Hunter x Hunter',
            quote: 'I do what I want.',
            description: 'Hunter Association chairman who avoids personal commitments for adventure'
          }
        ]
      }
    },
    'The Thinker': {
      female: {
        '18-24': [
          {
            name: 'Kurisu Makise',
            source: 'Steins;Gate',
            quote: 'There\'s a scientific explanation for everything.',
            description: 'Brilliant scientist who analyzes emotions rather than experiencing them naturally'
          },
          {
            name: 'Shiro',
            source: 'No Game No Life',
            quote: 'Everything is a calculation.',
            description: 'Gaming prodigy who treats relationships like strategic puzzles to be solved'
          },
          {
            name: 'Senku\'s Assistant',
            source: 'Dr. Stone',
            quote: 'Let me analyze this logically.',
            description: 'Scientific thinker who approaches emotional situations through data and analysis'
          }
        ],
        '25-34': [
          {
            name: 'Makise Kurisu',
            source: 'Steins;Gate',
            quote: 'Emotions are just chemical reactions.',
            description: 'Neuroscientist who intellectualizes all feelings rather than experiencing them'
          },
          {
            name: 'Riza Hawkeye',
            source: 'Fullmetal Alchemist',
            quote: 'I need to think this through.',
            description: 'Military sharpshooter who over-analyzes emotional situations instead of feeling them'
          },
          {
            name: 'Erza Scarlet',
            source: 'Fairy Tail',
            quote: 'There must be a logical solution.',
            description: 'Knight who approaches relationship problems through strategic thinking'
          }
        ],
        '35+': [
          {
            name: 'Tsunade',
            source: 'Naruto',
            quote: 'I\'ve seen too much to believe in feelings.',
            description: 'Medical ninja who intellectualizes trauma rather than processing emotions'
          },
          {
            name: 'Olivier Armstrong',
            source: 'Fullmetal Alchemist',
            quote: 'Emotions are weakness.',
            description: 'Military commander who treats all personal situations as tactical problems'
          },
          {
            name: 'Unohana Retsu',
            source: 'Bleach',
            quote: 'I must remain logical.',
            description: 'Captain who uses medical knowledge to intellectualize rather than feel'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I need to calculate every possibility.',
            description: 'Genius student who treats relationships as strategic calculations rather than emotions'
          },
          {
            name: 'Senku Ishigami',
            source: 'Dr. Stone',
            quote: 'Love is just dopamine and oxytocin.',
            description: 'Scientific genius who reduces all emotions to chemical formulas'
          },
          {
            name: 'Shikamaru Nara',
            source: 'Naruto',
            quote: 'I need to think 200 moves ahead.',
            description: 'Strategic ninja who over-analyzes relationships instead of experiencing them'
          }
        ],
        '25-34': [
          {
            name: 'L Lawliet',
            source: 'Death Note',
            quote: 'Everything must be logical.',
            description: 'Detective who analyzes human behavior like data rather than understanding emotions'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'I understand everything.',
            description: 'Captain who intellectualizes all interactions rather than forming genuine connections'
          },
          {
            name: 'Roy Mustang',
            source: 'Fullmetal Alchemist',
            quote: 'I must consider all angles.',
            description: 'Colonel who treats relationships like military strategy rather than emotional connection'
          }
        ],
        '35+': [
          {
            name: 'Kakashi Hatake',
            source: 'Naruto',
            quote: 'I need to analyze the situation.',
            description: 'Elite ninja who intellectualizes trauma and relationships rather than processing emotions'
          },
          {
            name: 'Kurotsuchi Mayuri',
            source: 'Bleach',
            quote: 'Everything is an experiment.',
            description: 'Scientist who treats human emotions and relationships as research subjects'
          },
          {
            name: 'Gendo Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'All according to the scenario.',
            description: 'Commander who intellectualizes all personal relationships as part of larger plans'
          }
        ]
      }
    },
    'Emotional Invalidator': {
      female: {
        '18-24': [
          {
            name: 'Asuka Langley',
            source: 'Neon Genesis Evangelion',
            quote: 'Stop being such a baby!',
            description: 'Pilot who dismisses others\' emotional pain as weakness or attention-seeking'
          },
          {
            name: 'Erina Nakiri',
            source: 'Food Wars',
            quote: 'Your feelings don\'t matter.',
            description: 'Culinary prodigy who dismisses others\' emotions as inferior or irrelevant'
          },
          {
            name: 'Taiga Aisaka',
            source: 'Toradora!',
            quote: 'You\'re being ridiculous.',
            description: 'Tsundere who uses aggression to invalidate others\' legitimate emotional responses'
          }
        ],
        '25-34': [
          {
            name: 'Makima',
            source: 'Chainsaw Man',
            quote: 'You\'re overreacting.',
            description: 'Devil who dismisses human emotions as trivial and manipulable weaknesses'
          },
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'Weakness disgusts me.',
            description: 'General who views emotional vulnerability as pathetic and unworthy of consideration'
          },
          {
            name: 'Medusa Gorgon',
            source: 'Soul Eater',
            quote: 'Your pain amuses me.',
            description: 'Witch who actively dismisses and mocks others\' emotional suffering'
          }
        ],
        '35+': [
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'Emotions are for the weak.',
            description: 'Fashion mogul who dismisses all human emotions as inferior and manipulable'
          },
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'Stop your crying!',
            description: 'Emperor who invalidates family members\' emotions through threats and aggression'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'Human emotions are meaningless.',
            description: 'Ancient goddess who views all human emotions as beneath her consideration'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Bakugo Katsuki',
            source: 'My Hero Academia',
            quote: 'Stop being weak!',
            description: 'Hero student who dismisses others\' emotional struggles as signs of weakness'
          },
          {
            name: 'Sasuke Uchiha',
            source: 'Naruto',
            quote: 'Your feelings make you weak.',
            description: 'Ninja who invalidates others\' emotions while pursuing power and revenge'
          },
          {
            name: 'Accelerator',
            source: 'A Certain Magical Index',
            quote: 'I don\'t care about your feelings.',
            description: 'Esper who dismisses others\' emotional pain as irrelevant to his goals'
          }
        ],
        '25-34': [
          {
            name: 'Scar',
            source: 'Fullmetal Alchemist',
            quote: 'Your tears won\'t bring them back.',
            description: 'Vigilante who dismisses others\' grief and emotional processing as useless'
          },
          {
            name: 'Dio Brando',
            source: 'JoJo\'s Bizarre Adventure',
            quote: 'Humanity is weak.',
            description: 'Vampire who views all human emotions as pathetic and exploitable weaknesses'
          },
          {
            name: 'Frieza',
            source: 'Dragon Ball Z',
            quote: 'Your emotions bore me.',
            description: 'Emperor who dismisses others\' feelings as beneath his consideration'
          }
        ],
        '35+': [
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'Emotions are obstacles to power.',
            description: 'Legendary ninja who views emotional attachments as weaknesses to be eliminated'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'You never stood on the same level as me.',
            description: 'Captain who dismisses others\' emotions as signs of their inferiority'
          },
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'Your hope is meaningless.',
            description: 'Villain who systematically invalidates others\' positive emotions and dreams'
          }
        ]
      }
    },
    'The Emotionally Distant': {
      female: {
        '18-24': [
          {
            name: 'Rei Ayanami',
            source: 'Neon Genesis Evangelion',
            quote: 'I don\'t understand.',
            description: 'Pilot who maintains emotional walls and struggles with intimacy and connection'
          },
          {
            name: 'Homura Akemi',
            source: 'Puella Magi Madoka Magica',
            quote: 'I don\'t need anyone.',
            description: 'Magical girl who uses time travel as excuse to avoid emotional vulnerability'
          },
          {
            name: 'Yuki Nagato',
            source: 'The Melancholy of Haruhi Suzumiya',
            quote: 'I am an interface.',
            description: 'Alien who uses her non-human nature to justify emotional distance'
          }
        ],
        '25-34': [
          {
            name: 'Mikasa Ackerman',
            source: 'Attack on Titan',
            quote: 'I don\'t have time for feelings.',
            description: 'Soldier who uses military duty and trauma to maintain emotional barriers'
          },
          {
            name: 'Erza Scarlet',
            source: 'Fairy Tail',
            quote: 'I must remain strong.',
            description: 'Knight who uses strength and responsibility as armor against emotional intimacy'
          },
          {
            name: 'Saber',
            source: 'Fate/Stay Night',
            quote: 'I am a king first.',
            description: 'Servant who uses royal duty and honor to avoid personal emotional connection'
          }
        ],
        '35+': [
          {
            name: 'Integra Hellsing',
            source: 'Hellsing',
            quote: 'I don\'t have time for weakness.',
            description: 'Organization leader who uses professional duties to maintain emotional distance'
          },
          {
            name: 'Olivier Armstrong',
            source: 'Fullmetal Alchemist',
            quote: 'Emotions are a luxury I can\'t afford.',
            description: 'Military commander who uses duty and strength to avoid vulnerability'
          },
          {
            name: 'Genkai',
            source: 'Yu Yu Hakusho',
            quote: 'Attachments make you weak.',
            description: 'Martial arts master who maintains distance to avoid the pain of loss'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Sasuke Uchiha',
            source: 'Naruto',
            quote: 'I have severed all bonds.',
            description: 'Ninja who uses revenge and trauma to justify cutting off emotional connections'
          },
          {
            name: 'Levi Ackerman',
            source: 'Attack on Titan',
            quote: 'I don\'t get attached.',
            description: 'Captain who uses military professionalism to maintain emotional walls'
          },
          {
            name: 'Todoroki Shoto',
            source: 'My Hero Academia',
            quote: 'I don\'t need anyone.',
            description: 'Hero student who uses family trauma to justify emotional isolation'
          }
        ],
        '25-34': [
          {
            name: 'Kakashi Hatake',
            source: 'Naruto',
            quote: 'Those who break the rules are trash.',
            description: 'Elite ninja who uses duty and past trauma to maintain emotional distance'
          },
          {
            name: 'Byakuya Kuchiki',
            source: 'Bleach',
            quote: 'I follow the law above all.',
            description: 'Noble captain who uses duty and tradition to avoid emotional vulnerability'
          },
          {
            name: 'Kiritsugu Emiya',
            source: 'Fate/Zero',
            quote: 'I am a machine.',
            description: 'Assassin who suppresses emotions to accomplish his utilitarian goals'
          }
        ],
        '35+': [
          {
            name: 'Gendo Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'Personal feelings are irrelevant.',
            description: 'Commander who uses work and grand plans to avoid emotional intimacy with family'
          },
          {
            name: 'Jiraiya',
            source: 'Naruto',
            quote: 'I\'m better alone.',
            description: 'Legendary ninja who uses humor and travel to avoid deep emotional connections'
          },
          {
            name: 'Kenshin Himura',
            source: 'Rurouni Kenshin',
            quote: 'I cannot allow myself to feel.',
            description: 'Former assassin who uses past violence to justify emotional detachment'
          }
        ]
      }
    },
    'The Perpetual Victim': {
      female: {
        '18-24': [
          {
            name: 'Sakura Haruno (early)',
            source: 'Naruto',
            quote: 'Why does this always happen to me?',
            description: 'Ninja who blames circumstances rather than taking responsibility for her training'
          },
          {
            name: 'Orihime Inoue',
            source: 'Bleach',
            quote: 'I\'m always in the way.',
            description: 'Student who presents herself as burden rather than working to improve her situation'
          },
          {
            name: 'Yui Hirasawa',
            source: 'K-On!',
            quote: 'I can\'t help it!',
            description: 'Student who uses helplessness and cuteness to avoid taking responsibility'
          }
        ],
        '25-34': [
          {
            name: 'Misa Amane',
            source: 'Death Note',
            quote: 'Light, save me!',
            description: 'Model who presents herself as helpless victim needing constant rescue'
          },
          {
            name: 'Ochaco Uraraka',
            source: 'My Hero Academia',
            quote: 'I\'m not strong enough.',
            description: 'Hero who focuses on her limitations rather than taking action to improve'
          },
          {
            name: 'Hinata Hyuga',
            source: 'Naruto',
            quote: 'I\'m a failure.',
            description: 'Ninja who sees herself as perpetual victim of family expectations and personal weakness'
          }
        ],
        '35+': [
          {
            name: 'Kushina Uzumaki',
            source: 'Naruto',
            quote: 'Everyone always leaves me.',
            description: 'Mother who frames her life story as series of abandonment and victimization'
          },
          {
            name: 'Chi-Chi',
            source: 'Dragon Ball',
            quote: 'Nobody listens to me!',
            description: 'Wife who presents family problems as things happening TO her rather than examining her role'
          },
          {
            name: 'Bulma\'s mother',
            source: 'Dragon Ball',
            quote: 'Poor me!',
            description: 'Housewife who dramatizes minor inconveniences as major victimization'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Shinji Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'Nobody understands me.',
            description: 'Pilot who sees himself as victim of circumstances rather than taking control of his life'
          },
          {
            name: 'Zenitsu Agatsuma',
            source: 'Demon Slayer',
            quote: 'I\'m going to die!',
            description: 'Demon slayer who presents himself as perpetual victim despite his actual strength'
          },
          {
            name: 'Mineta Minoru',
            source: 'My Hero Academia',
            quote: 'Girls always reject me.',
            description: 'Student who blames others for his social problems rather than examining his behavior'
          }
        ],
        '25-34': [
          {
            name: 'Subaru Natsuki',
            source: 'Re:Zero',
            quote: 'Why does everyone hate me?',
            description: 'Protagonist who sees himself as victim of circumstances rather than learning from mistakes'
          },
          {
            name: 'Kazuma Satou',
            source: 'KonoSuba',
            quote: 'This is so unfair!',
            description: 'Adventurer who blames bad luck and others rather than taking responsibility'
          },
          {
            name: 'Issei Hyoudou',
            source: 'High School DxD',
            quote: 'I\'m so unlucky with girls.',
            description: 'Student who blames fate for romantic failures rather than improving himself'
          }
        ],
        '35+': [
          {
            name: 'Gendo Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'I had no choice.',
            description: 'Commander who blames circumstances for his emotional neglect and harmful decisions'
          },
          {
            name: 'King Bradley',
            source: 'Fullmetal Alchemist',
            quote: 'I am what I was made to be.',
            description: 'Homunculus who uses his creation as excuse for evil actions rather than taking responsibility'
          },
          {
            name: 'Danzo Shimura',
            source: 'Naruto',
            quote: 'I did what I had to do.',
            description: 'Elder who presents his harmful actions as necessary victimization by circumstances'
          }
        ]
      }
    },
    'The Parental Seeker': {
      female: {
        '18-24': [
          {
            name: 'Hinata Hyuga',
            source: 'Naruto',
            quote: 'Please take care of me.',
            description: 'Ninja who seeks partners to provide the protection and guidance her father never gave'
          },
          {
            name: 'Orihime Inoue',
            source: 'Bleach',
            quote: 'I need someone to protect me.',
            description: 'Student who seeks father figures and protectors rather than equal partnerships'
          },
          {
            name: 'Tohru Honda',
            source: 'Fruits Basket',
            quote: 'I don\'t want to be alone.',
            description: 'Orphan who seeks family figures to take care of her emotional and practical needs'
          }
        ],
        '25-34': [
          {
            name: 'Misa Amane',
            source: 'Death Note',
            quote: 'Light, tell me what to do.',
            description: 'Model who seeks dominant partner to make all decisions and provide structure'
          },
          {
            name: 'Winry Rockbell',
            source: 'Fullmetal Alchemist',
            quote: 'I need someone to take care of.',
            description: 'Mechanic who seeks to be taken care of while also mothering her partners'
          },
          {
            name: 'Nami',
            source: 'One Piece',
            quote: 'I want to belong somewhere.',
            description: 'Navigator who seeks crew family to provide security and belonging she never had'
          }
        ],
        '35+': [
          {
            name: 'Chi-Chi',
            source: 'Dragon Ball',
            quote: 'Goku, you need to provide for us.',
            description: 'Wife who expects husband to take complete financial and practical responsibility'
          },
          {
            name: 'Kushina Uzumaki',
            source: 'Naruto',
            quote: 'I need someone strong to protect me.',
            description: 'Mother who sought powerful partner to provide security and protection'
          },
          {
            name: 'Bulma',
            source: 'Dragon Ball',
            quote: 'Someone else can handle that.',
            description: 'Scientist who despite her intelligence seeks others to handle emotional labor'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Shinji Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'Please tell me what to do.',
            description: 'Pilot who seeks authority figures to make decisions and provide emotional support'
          },
          {
            name: 'Zenitsu Agatsuma',
            source: 'Demon Slayer',
            quote: 'Someone help me!',
            description: 'Demon slayer who constantly seeks others to rescue and care for him'
          },
          {
            name: 'Izuku Midoriya',
            source: 'My Hero Academia',
            quote: 'All Might, guide me.',
            description: 'Hero student who seeks father figure mentors to provide direction and validation'
          }
        ],
        '25-34': [
          {
            name: 'Kazuma Satou',
            source: 'KonoSuba',
            quote: 'Someone else should handle this.',
            description: 'Adventurer who expects party members to take care of him like a child'
          },
          {
            name: 'Natsu Dragneel',
            source: 'Fairy Tail',
            quote: 'The guild will take care of it.',
            description: 'Dragon slayer who relies on guild family to handle adult responsibilities'
          },
          {
            name: 'Monkey D. Luffy',
            source: 'One Piece',
            quote: 'Nami, handle the money.',
            description: 'Pirate captain who expects crew to manage all practical adult responsibilities'
          }
        ],
        '35+': [
          {
            name: 'Master Roshi',
            source: 'Dragon Ball',
            quote: 'Someone else can cook.',
            description: 'Martial arts master who expects students to take care of his daily needs'
          },
          {
            name: 'Jiraiya',
            source: 'Naruto',
            quote: 'I\'m too old to settle down.',
            description: 'Legendary ninja who seeks temporary maternal figures while avoiding adult commitment'
          },
          {
            name: 'Ging Freecss',
            source: 'Hunter x Hunter',
            quote: 'Someone else can raise him.',
            description: 'Hunter who abandons parental responsibilities while seeking others to care for him'
          }
        ]
      }
    },
    'The Rake': {
      female: {
        '18-24': [
          {
            name: 'Yumeko Jabami',
            source: 'Kakegurui',
            quote: 'I live for the thrill.',
            description: 'Gambler who treats romantic interests as exciting conquests and power games'
          },
          {
            name: 'Rias Gremory',
            source: 'High School DxD',
            quote: 'You belong to me now.',
            description: 'Devil who collects romantic conquests and uses seduction for power'
          },
          {
            name: 'Albedo',
            source: 'Overlord',
            quote: 'I will make you mine.',
            description: 'Demon who pursues romantic target as ultimate conquest rather than genuine love'
          }
        ],
        '25-34': [
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'I want to dominate you.',
            description: 'General who treats romantic relationships as conquests to be won through power'
          },
          {
            name: 'Ryuko Matoi',
            source: 'Kill la Kill',
            quote: 'I take what I want.',
            description: 'Fighter who approaches relationships with conquest mentality rather than partnership'
          },
          {
            name: 'Revy',
            source: 'Black Lagoon',
            quote: 'I don\'t do relationships.',
            description: 'Gunslinger who treats romantic encounters as conquests rather than connections'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'You will marry who I choose.',
            description: 'Emperor who treats marriage and romance as political conquests and power moves'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'All shall bow to me.',
            description: 'Ancient goddess who views romantic relationships as submission and conquest'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'Everything exists for my pleasure.',
            description: 'Fashion mogul who treats all relationships as conquests for personal gratification'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Dio Brando',
            source: 'JoJo\'s Bizarre Adventure',
            quote: 'I reject my humanity!',
            description: 'Vampire who treats romantic conquests as trophies and power demonstrations'
          },
          {
            name: 'Gilgamesh',
            source: 'Fate series',
            quote: 'All treasures belong to me.',
            description: 'Ancient king who views romantic interests as treasures to be collected'
          },
          {
            name: 'Meliodas',
            source: 'Seven Deadly Sins',
            quote: 'I am the Dragon Sin of Wrath.',
            description: 'Demon who has history of romantic conquest and power over others'
          }
        ],
        '25-34': [
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'I will have my own kingdom.',
            description: 'Mercenary leader who uses charm and seduction to gain followers and power'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'I stand above all.',
            description: 'Captain who treats relationships as chess pieces in his game for ultimate power'
          },
          {
            name: 'Hisoka',
            source: 'Hunter x Hunter',
            quote: 'I live for the thrill of the hunt.',
            description: 'Magician who treats romantic and combat encounters as exciting conquests'
          }
        ],
        '35+': [
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I desire immortality.',
            description: 'Legendary ninja who treats people as conquests and experiments for personal gain'
          },
          {
            name: 'Donquixote Doflamingo',
            source: 'One Piece',
            quote: 'I am a god.',
            description: 'Former world noble who treats relationships as conquests befitting his divine status'
          },
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'All power belongs to me.',
            description: 'Villain who treats people as conquests and sources of power to be taken'
          }
        ]
      }
    },
    'The Future Faker': {
      female: {
        '18-24': [
          {
            name: 'Malty S Melromarc',
            source: 'The Rising of the Shield Hero',
            quote: 'We\'ll be so happy together.',
            description: 'Princess who makes grand romantic promises while planning betrayal and manipulation'
          },
          {
            name: 'Yuno Gasai',
            source: 'Future Diary',
            quote: 'We\'ll live happily ever after.',
            description: 'Creates elaborate fantasies about perfect future with obsession target'
          },
          {
            name: 'Aqua',
            source: 'KonoSuba',
            quote: 'Once I return to heaven, everything will be perfect.',
            description: 'Goddess who makes grand promises about future rewards that never materialize'
          }
        ],
        '25-34': [
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'Together we\'ll conquer the world.',
            description: 'General who makes grand promises about shared future conquest and power'
          },
          {
            name: 'Makima',
            source: 'Chainsaw Man',
            quote: 'I can give you everything you want.',
            description: 'Devil who promises perfect future happiness while manipulating for control'
          },
          {
            name: 'Beatrice',
            source: 'Re:Zero',
            quote: 'Someday my person will come.',
            description: 'Spirit who clings to promises about perfect future that may never come'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'We\'ll create a perfect family.',
            description: 'Emperor who promises utopian family future while creating dysfunction and fear'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'I will create a perfect world.',
            description: 'Ancient goddess who promises perfect future while planning to eliminate free will'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'Together we\'ll achieve perfection.',
            description: 'Fashion mogul who promises perfect future while planning humanity\'s destruction'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Kazuma Satou',
            source: 'KonoSuba',
            quote: 'Once I defeat the Demon King, we\'ll live like royalty.',
            description: 'Adventurer who makes grand promises about future luxury without realistic plans'
          },
          {
            name: 'Zenitsu Agatsuma',
            source: 'Demon Slayer',
            quote: 'We\'ll get married and be happy forever!',
            description: 'Demon slayer who makes romantic promises about perfect future after brief meetings'
          },
          {
            name: 'Subaru Natsuki',
            source: 'Re:Zero',
            quote: 'I\'ll make everything perfect for you.',
            description: 'Protagonist who promises perfect future happiness without understanding what others want'
          }
        ],
        '25-34': [
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'We\'ll build our own kingdom.',
            description: 'Mercenary leader who makes grand promises about shared future glory and power'
          },
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I\'ll create a perfect world for us.',
            description: 'Genius who promises utopian future while pursuing genocidal plans'
          },
          {
            name: 'Lelouch vi Britannia',
            source: 'Code Geass',
            quote: 'I will destroy the world and recreate it.',
            description: 'Prince who promises perfect future world while planning destructive revolution'
          }
        ],
        '35+': [
          {
            name: 'Madara Uchiha',
            source: 'Naruto',
            quote: 'I will create a world without pain.',
            description: 'Legendary ninja who promises perfect future through infinite illusion'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'I will become god and perfect existence.',
            description: 'Captain who promises transcendent future while manipulating everyone around him'
          },
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'I will give you the power to change everything.',
            description: 'Villain who promises incredible future power while planning to steal everything'
          }
        ]
      }
    },
    'The Self-Obsessed': {
      female: {
        '18-24': [
          {
            name: 'Erina Nakiri',
            source: 'Food Wars',
            quote: 'I am perfection itself.',
            description: 'Culinary prodigy who believes everything should revolve around her superior palate and status'
          },
          {
            name: 'Asuka Langley',
            source: 'Neon Genesis Evangelion',
            quote: 'I\'m the best pilot!',
            description: 'Eva pilot whose entire world revolves around proving her superiority and getting attention'
          },
          {
            name: 'Haruhi Suzumiya',
            source: 'The Melancholy of Haruhi Suzumiya',
            quote: 'The world revolves around me.',
            description: 'Student who literally believes reality should conform to her desires and interests'
          }
        ],
        '25-34': [
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'I am the strongest.',
            description: 'General whose entire worldview centers on her own power and desires'
          },
          {
            name: 'Makima',
            source: 'Chainsaw Man',
            quote: 'Everything exists for my benefit.',
            description: 'Devil who treats all humans and relationships as tools for her personal goals'
          },
          {
            name: 'Albedo',
            source: 'Overlord',
            quote: 'I am the most beautiful.',
            description: 'Demon who believes her beauty and position make her the center of importance'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'Everything must please me.',
            description: 'Emperor whose tantrums and demands show she believes everything should serve her happiness'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'All chakra belongs to me.',
            description: 'Ancient goddess who believes all power and attention rightfully belong to her'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'I am evolution itself.',
            description: 'Fashion mogul who sees herself as the pinnacle of existence, above all others'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Gilgamesh',
            source: 'Fate series',
            quote: 'I am the king of heroes.',
            description: 'Ancient king who believes all treasures and people exist solely for his pleasure'
          },
          {
            name: 'Dio Brando',
            source: 'JoJo\'s Bizarre Adventure',
            quote: 'The world exists for DIO!',
            description: 'Vampire who believes reality should conform to his desires and ambitions'
          },
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I am the god of the new world.',
            description: 'Genius student who believes his intelligence gives him the right to reshape humanity'
          }
        ],
        '25-34': [
          {
            name: 'Vegeta (early)',
            source: 'Dragon Ball Z',
            quote: 'I am the prince of all Saiyans!',
            description: 'Warrior prince who believes his royal blood makes him superior to all others'
          },
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'I will stand above the heavens.',
            description: 'Captain who believes his intelligence and power make him destined to rule over all'
          },
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'I will have my own kingdom.',
            description: 'Mercenary leader who sacrifices everything and everyone for his personal dream'
          }
        ],
        '35+': [
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'All power should belong to one person: me.',
            description: 'Villain who believes he deserves to possess all quirks and rule over humanity'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I will learn all jutsu.',
            description: 'Legendary ninja whose pursuit of knowledge and immortality shows complete self-obsession'
          },
          {
            name: 'Frieza',
            source: 'Dragon Ball Z',
            quote: 'I am the emperor of the universe!',
            description: 'Galactic emperor who believes all life exists to serve his whims and desires'
          }
        ]
      }
    },
    'The Puppet Master': {
      female: {
        '18-24': [
          {
            name: 'Junko Enoshima',
            source: 'Danganronpa',
            quote: 'I\'ll make you all despair!',
            description: 'Mastermind who orchestrates elaborate psychological games to control and manipulate others'
          },
          {
            name: 'Yuno Gasai',
            source: 'Future Diary',
            quote: 'I\'ll protect you from everyone.',
            description: 'Stalker who uses violence and manipulation to isolate and control her obsession target'
          },
          {
            name: 'Malty S Melromarc',
            source: 'The Rising of the Shield Hero',
            quote: 'Everyone will believe me.',
            description: 'Princess who uses false accusations and social manipulation to destroy her targets'
          }
        ],
        '25-34': [
          {
            name: 'Makima',
            source: 'Chainsaw Man',
            quote: 'I control devils and humans alike.',
            description: 'Control Devil who manipulates through contracts, fear, and psychological dominance'
          },
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'I will break you and remake you.',
            description: 'General who uses torture, conditioning, and power to control her romantic interests'
          },
          {
            name: 'Medusa Gorgon',
            source: 'Soul Eater',
            quote: 'You\'re all my experiments.',
            description: 'Witch who manipulates through magic, lies, and psychological experimentation'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'You live or die by my word.',
            description: 'Emperor who controls family through fear, debt, and manipulation of their life spans'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'I created the ninja world.',
            description: 'Ancient goddess who manipulated human civilization for centuries'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'I control the very fabric of life.',
            description: 'Fashion mogul who manipulates through alien life fibers and psychological abuse'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Light Yagami',
            source: 'Death Note',
            quote: 'I am justice.',
            description: 'Genius who uses supernatural power and psychological manipulation to control society'
          },
          {
            name: 'Lelouch vi Britannia',
            source: 'Code Geass',
            quote: 'I command you!',
            description: 'Prince who uses supernatural power and strategic manipulation to control people and nations'
          },
          {
            name: 'Shinji Matou',
            source: 'Fate/Stay Night',
            quote: 'You belong to me.',
            description: 'Magus who uses magic, abuse, and manipulation to control others through fear'
          }
        ],
        '25-34': [
          {
            name: 'Sosuke Aizen',
            source: 'Bleach',
            quote: 'All according to plan.',
            description: 'Captain who manipulated allies and enemies for over a century through illusion and deception'
          },
          {
            name: 'Johan Liebert',
            source: 'Monster',
            quote: 'I can make anyone into a monster.',
            description: 'Psychopath who manipulates through psychological insight and systematic psychological destruction'
          },
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'You all belong to me.',
            description: 'Mercenary leader who manipulates through charisma, then betrays everyone for power'
          }
        ],
        '35+': [
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'I shaped this entire society.',
            description: 'Villain who manipulated hero society for generations through fear and strategic control'
          },
          {
            name: 'Madara Uchiha',
            source: 'Naruto',
            quote: 'I will control reality itself.',
            description: 'Legendary ninja who manipulated ninja history and reality through elaborate schemes'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'Everyone is my potential vessel.',
            description: 'Legendary ninja who manipulates through fear, experiments, and promises of power'
          }
        ]
      }
    },
    'The Intimidator': {
      female: {
        '18-24': [
          {
            name: 'Asuka Langley',
            source: 'Neon Genesis Evangelion',
            quote: 'I\'ll destroy you!',
            description: 'Eva pilot who uses anger, threats, and aggressive behavior to intimidate others'
          },
          {
            name: 'Taiga Aisaka',
            source: 'Toradora!',
            quote: 'I\'ll kill you!',
            description: 'Student known as "Palmtop Tiger" who uses violence and threats to control situations'
          },
          {
            name: 'Ryuko Matoi',
            source: 'Kill la Kill',
            quote: 'I\'ll cut you down!',
            description: 'Fighter who uses aggressive combat style and threats to intimidate opponents'
          }
        ],
        '25-34': [
          {
            name: 'Esdeath',
            source: 'Akame ga Kill!',
            quote: 'I\'ll freeze your blood.',
            description: 'General who uses sadistic torture and displays of power to intimidate subordinates'
          },
          {
            name: 'Revy',
            source: 'Black Lagoon',
            quote: 'I\'ll put a bullet in your head.',
            description: 'Gunslinger who uses weapon expertise and violent threats to intimidate others'
          },
          {
            name: 'Erza Scarlet',
            source: 'Fairy Tail',
            quote: 'You don\'t want to anger me.',
            description: 'Knight who uses reputation for strength and discipline to intimidate guild members'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'I\'ll take your lifespan!',
            description: 'Emperor who uses supernatural power and terrifying rages to intimidate family and enemies'
          },
          {
            name: 'Olivier Armstrong',
            source: 'Fullmetal Alchemist',
            quote: 'I\'ll have you executed.',
            description: 'General who uses military authority and threats of violence to maintain control'
          },
          {
            name: 'Integra Hellsing',
            source: 'Hellsing',
            quote: 'I command monsters.',
            description: 'Organization leader who uses supernatural subordinates and authority to intimidate enemies'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Bakugo Katsuki',
            source: 'My Hero Academia',
            quote: 'I\'ll kill you!',
            description: 'Hero student who uses explosive quirk and aggressive threats to intimidate classmates'
          },
          {
            name: 'Vegeta (early)',
            source: 'Dragon Ball Z',
            quote: 'I\'ll destroy this entire planet!',
            description: 'Saiyan prince who uses overwhelming power and threats to intimidate opponents'
          },
          {
            name: 'Sasuke Uchiha (corrupted)',
            source: 'Naruto',
            quote: 'I\'ll kill everyone you care about.',
            description: 'Ninja who uses dark power and threats against loved ones to intimidate enemies'
          }
        ],
        '25-34': [
          {
            name: 'Aizen Sosuke',
            source: 'Bleach',
            quote: 'I\'ll crush your spirit.',
            description: 'Captain who uses psychological intimidation and displays of overwhelming power'
          },
          {
            name: 'Dio Brando',
            source: 'JoJo\'s Bizarre Adventure',
            quote: 'I\'ll make you suffer.',
            description: 'Vampire who uses supernatural powers and sadistic threats to intimidate victims'
          },
          {
            name: 'Hisoka',
            source: 'Hunter x Hunter',
            quote: 'I\'ll enjoy breaking you.',
            description: 'Magician who uses unpredictable violence and sexual menace to intimidate others'
          }
        ],
        '35+': [
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'I am your worst nightmare.',
            description: 'Villain who uses centuries of reputation and overwhelming power to intimidate heroes'
          },
          {
            name: 'Frieza',
            source: 'Dragon Ball Z',
            quote: 'I\'ll destroy everything you love.',
            description: 'Emperor who uses casual genocide and torture to intimidate entire civilizations'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I\'ll make you my vessel.',
            description: 'Legendary ninja who uses body horror and immortal power to intimidate victims'
          }
        ]
      }
    },
    'The Clinger': {
      female: {
        '18-24': [
          {
            name: 'Yuno Gasai',
            source: 'Future Diary',
            quote: 'I\'ll never let you go.',
            description: 'Obsessive stalker who cannot accept boundaries and becomes violent when rejected'
          },
          {
            name: 'Misa Amane',
            source: 'Death Note',
            quote: 'Light, I\'ll do anything for you!',
            description: 'Model obsessively devoted to Light, unable to accept his lack of reciprocal feelings'
          },
          {
            name: 'Hinata Hyuga (early)',
            source: 'Naruto',
            quote: 'Naruto-kun...',
            description: 'Ninja with years-long obsessive crush, unable to move on or accept disinterest'
          }
        ],
        '25-34': [
          {
            name: 'Albedo',
            source: 'Overlord',
            quote: 'I live only for you, Ainz-sama.',
            description: 'Demon obsessively devoted to her creator, unable to accept boundaries or rejection'
          },
          {
            name: 'Akane Shinjo',
            source: 'SSSS.Gridman',
            quote: 'You can\'t leave me!',
            description: 'Creator who becomes dangerously obsessed when her creation gains independence'
          },
          {
            name: 'Beatrice (before)',
            source: 'Re:Zero',
            quote: 'I\'ll wait forever.',
            description: 'Spirit who waited centuries for someone, unable to accept abandonment or move on'
          }
        ],
        '35+': [
          {
            name: 'Big Mom',
            source: 'One Piece',
            quote: 'You can never leave my family.',
            description: 'Emperor who cannot accept family members leaving, using violence to prevent abandonment'
          },
          {
            name: 'Kaguya Otsutsuki',
            source: 'Naruto',
            quote: 'All chakra must return to me.',
            description: 'Ancient goddess obsessed with reclaiming all power, unable to accept independence'
          },
          {
            name: 'Ragyo Kiryuin',
            source: 'Kill la Kill',
            quote: 'You are my perfect daughter.',
            description: 'Mother with obsessive, inappropriate attachment to daughter, unable to accept boundaries'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Zenitsu Agatsuma',
            source: 'Demon Slayer',
            quote: 'Please marry me!',
            description: 'Demon slayer who obsessively pursues women after brief meetings, unable to accept rejection'
          },
          {
            name: 'Subaru Natsuki',
            source: 'Re:Zero',
            quote: 'I\'ll save you no matter what.',
            description: 'Protagonist obsessively devoted to Emilia, unable to accept her independence or choices'
          },
          {
            name: 'Issei Hyoudou',
            source: 'High School DxD',
            quote: 'I\'ll never give up on you.',
            description: 'Student who becomes obsessively attached to female characters, unable to accept boundaries'
          }
        ],
        '25-34': [
          {
            name: 'Griffith',
            source: 'Berserk',
            quote: 'You belong to me, Guts.',
            description: 'Mercenary leader obsessed with his closest friend, unable to accept his departure'
          },
          {
            name: 'Shinji Matou',
            source: 'Fate/Stay Night',
            quote: 'Sakura is mine.',
            description: 'Magus with obsessive, abusive attachment to adopted sister, unable to accept her autonomy'
          },
          {
            name: 'Guts (towards Casca)',
            source: 'Berserk',
            quote: 'I\'ll never leave you.',
            description: 'Swordsman whose protective obsession with traumatized lover borders on unhealthy possession'
          }
        ],
        '35+': [
          {
            name: 'Gendo Ikari',
            source: 'Neon Genesis Evangelion',
            quote: 'I will bring her back.',
            description: 'Commander obsessed with deceased wife, unable to accept her death or move forward'
          },
          {
            name: 'All For One',
            source: 'My Hero Academia',
            quote: 'You are my successor.',
            description: 'Villain with obsessive attachment to his protégé, unable to accept independence or betrayal'
          },
          {
            name: 'Orochimaru',
            source: 'Naruto',
            quote: 'I will possess your body.',
            description: 'Legendary ninja obsessed with achieving immortality through possessing others'
          }
        ]
      }
    }
  },
  'other': {
    'The Drill Sergeant': {
      female: {
        '18-24': [
          {
            name: 'Mulan\'s Commander',
            source: 'Mulan',
            quote: 'A girl worth fighting for must be strong.',
            description: 'Military perfectionist who demands absolute excellence from all recruits'
          },
          {
            name: 'Elsa (early)',
            source: 'Frozen',
            quote: 'Conceal, don\'t feel.',
            description: 'Perfectionist princess who demands absolute control over herself and others'
          },
          {
            name: 'Wonder Woman',
            source: 'DC Comics',
            quote: 'I was taught to be perfect.',
            description: 'Amazon warrior trained to impossibly high standards who expects the same from others'
          }
        ],
        '25-34': [
          {
            name: 'Captain Marvel',
            source: 'Marvel Comics',
            quote: 'I don\'t stop when I fall down.',
            description: 'Perfectionist superhero who demands absolute commitment and flawless execution'
          },
          {
            name: 'Catwoman',
            source: 'DC Comics',
            quote: 'I don\'t know about you, but I\'m feeling much better.',
            description: 'Cat burglar who demands perfection in planning and execution of every scheme'
          },
          {
            name: 'Black Widow',
            source: 'Marvel Comics',
            quote: 'I\'ve got red in my ledger.',
            description: 'Assassin trained to perfectionist standards who judges others by same impossible metrics'
          }
        ],
        '35+': [
          {
            name: 'Evil Queen',
            source: 'Snow White',
            quote: 'Mirror, mirror on the wall.',
            description: 'Perfectionist queen who cannot tolerate anyone being more beautiful or accomplished'
          },
          {
            name: 'Cruella de Vil',
            source: '101 Dalmatians',
            quote: 'I live for furs. I worship furs!',
            description: 'Fashion perfectionist who demands absolute aesthetic perfection at any cost'
          },
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'I call upon the powers of darkness.',
            description: 'Perfectionist sorceress who punishes others for not meeting her impossible standards'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'I\'ve been preparing for this my whole life.',
            description: 'Perfectionist prince who demands flawless execution of his political schemes'
          },
          {
            name: 'Flash',
            source: 'DC Comics',
            quote: 'I have to be faster.',
            description: 'Speedster hero who demands perfection in speed and timing from himself and others'
          },
          {
            name: 'Spider-Man',
            source: 'Marvel Comics',
            quote: 'With great power comes great responsibility.',
            description: 'Hero who places impossibly high moral standards on himself and others'
          }
        ],
        '25-34': [
          {
            name: 'Batman',
            source: 'DC Comics',
            quote: 'I am vengeance.',
            description: 'Perfectionist vigilante who demands absolute precision in crime fighting'
          },
          {
            name: 'Tony Stark',
            source: 'Marvel Comics',
            quote: 'I am Iron Man.',
            description: 'Genius inventor who demands technological perfection and judges others by his standards'
          },
          {
            name: 'Doctor Strange',
            source: 'Marvel Comics',
            quote: 'We\'re in the endgame now.',
            description: 'Sorcerer who demands perfect magical execution and strategic planning'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'I will not be denied!',
            description: 'Perfectionist sorcerer who demands absolute power and flawless execution of plans'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I\'m surrounded by idiots.',
            description: 'Perfectionist lion who constantly criticizes others for failing to meet his standards'
          },
          {
            name: 'Thanos',
            source: 'Marvel Comics',
            quote: 'Perfectly balanced, as all things should be.',
            description: 'Titan obsessed with perfect universal balance who judges all by his impossible standards'
          }
        ]
      }
    },
    'The Suspicious Strategist': {
      female: {
        '18-24': [
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'Trust is for fools.',
            description: 'Fire princess who creates crises to demonstrate her indispensability to father'
          },
          {
            name: 'Scarlet Witch',
            source: 'Marvel Comics',
            quote: 'No more mutants.',
            description: 'Mutant who alters reality to create problems only she can solve'
          },
          {
            name: 'Harley Quinn',
            source: 'DC Comics',
            quote: 'I\'m here to help, puddin\'!',
            description: 'Former psychiatrist who creates chaos then positions herself as necessary companion'
          }
        ],
        '25-34': [
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'Trust no one.',
            description: 'Shape-shifter who infiltrates organizations to create internal conflicts she can exploit'
          },
          {
            name: 'Poison Ivy',
            source: 'DC Comics',
            quote: 'I\'m here to save the environment.',
            description: 'Eco-terrorist who creates environmental crises to position herself as nature\'s savior'
          },
          {
            name: 'Catwoman',
            source: 'DC Comics',
            quote: 'I walk the line between hero and villain.',
            description: 'Thief who creates situations where Batman needs her help'
          }
        ],
        '35+': [
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Off with their heads!',
            description: 'Tyrannical queen who creates arbitrary crises to maintain absolute control'
          },
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'You shall not go to the ball.',
            description: 'Stepmother who creates obstacles for Cinderella to position her own daughters as superior'
          },
          {
            name: 'Mother Gothel',
            source: 'Tangled',
            quote: 'Mother knows best.',
            description: 'Kidnapper who creates external threats to keep Rapunzel dependent on her protection'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I am burdened with glorious purpose.',
            description: 'God of mischief who creates chaos to position himself as ruler and problem-solver'
          },
          {
            name: 'Joker',
            source: 'DC Comics',
            quote: 'Why so serious?',
            description: 'Criminal mastermind who creates elaborate schemes to prove his twisted worldview'
          },
          {
            name: 'Green Goblin',
            source: 'Marvel Comics',
            quote: 'We\'re not so different, you and I.',
            description: 'Villain who creates dangers for Spider-Man then offers twisted partnership'
          }
        ],
        '25-34': [
          {
            name: 'Lex Luthor',
            source: 'DC Comics',
            quote: 'I\'m trying to save humanity.',
            description: 'Billionaire who creates Superman-level threats to position himself as humanity\'s true savior'
          },
          {
            name: 'Magneto',
            source: 'Marvel Comics',
            quote: 'I will protect mutant-kind.',
            description: 'Mutant supremacist who creates anti-mutant sentiment to justify his extreme methods'
          },
          {
            name: 'Doctor Doom',
            source: 'Marvel Comics',
            quote: 'Doom toots as he pleases.',
            description: 'Dictator who creates global crises to demonstrate why the world needs his rule'
          }
        ],
        '35+': [
          {
            name: 'Emperor Palpatine',
            source: 'Star Wars',
            quote: 'Everything is proceeding as I have foreseen.',
            description: 'Sith Lord who orchestrates galactic war to position himself as necessary dictator'
          },
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'Things aren\'t always what they seem.',
            description: 'Vizier who creates problems in Agrabah to position himself as indispensable to the Sultan'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I\'m surrounded by idiots.',
            description: 'Lion who orchestrates his brother\'s death to create the crisis that makes him king'
          }
        ]
      }
    },
    'Master of Everything': {
      female: {
        '18-24': [
          {
            name: 'Belle',
            source: 'Beauty and the Beast',
            quote: 'I want adventure in the great wide somewhere.',
            description: 'Bookworm who believes her extensive reading makes her expert on all subjects'
          },
          {
            name: 'Hermione Granger',
            source: 'Harry Potter',
            quote: 'It\'s all in Hogwarts: A History.',
            description: 'Brilliant student who has read about everything and believes knowledge equals expertise'
          },
          {
            name: 'Elsa',
            source: 'Frozen',
            quote: 'I know what I\'m doing.',
            description: 'Queen who believes her magical powers qualify her as expert on all royal and personal matters'
          }
        ],
        '25-34': [
          {
            name: 'Wonder Woman',
            source: 'DC Comics',
            quote: 'I know the ways of war and peace.',
            description: 'Amazon princess who believes her divine training makes her expert on all human affairs'
          },
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'I can read minds, so I understand everything.',
            description: 'Psychic mutant who believes telepathic abilities give her expertise on all human behavior'
          },
          {
            name: 'Captain Marvel',
            source: 'Marvel Comics',
            quote: 'I\'ve seen the universe.',
            description: 'Cosmic hero who believes her space experience qualifies her as expert on all matters'
          }
        ],
        '35+': [
          {
            name: 'Fairy Godmother',
            source: 'Cinderella',
            quote: 'I know exactly what you need.',
            description: 'Magical being who believes her powers and experience make her expert on everyone\'s problems'
          },
          {
            name: 'Mary Poppins',
            source: 'Mary Poppins',
            quote: 'Practically perfect in every way.',
            description: 'Magical nanny who claims expertise in childcare, household management, and life in general'
          },
          {
            name: 'Professor McGonagall',
            source: 'Harry Potter',
            quote: 'I\'ve been teaching longer than you\'ve been alive.',
            description: 'Experienced teacher who believes her academic expertise extends to all areas of life'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Tony Stark (young)',
            source: 'Marvel Comics',
            quote: 'I know more than you think.',
            description: 'Genius inventor who believes his intelligence qualifies him as expert on all subjects'
          },
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'I\'ve read every book in this library.',
            description: 'Cursed prince whose extensive reading makes him believe he knows everything'
          },
          {
            name: 'Peter Parker',
            source: 'Marvel Comics',
            quote: 'Actually, the science shows...',
            description: 'Brilliant student who applies scientific knowledge to claim expertise on all problems'
          }
        ],
        '25-34': [
          {
            name: 'Doctor Strange',
            source: 'Marvel Comics',
            quote: 'I\'ve mastered the mystic arts.',
            description: 'Sorcerer Supreme who believes magical knowledge qualifies him as expert on everything'
          },
          {
            name: 'Batman',
            source: 'DC Comics',
            quote: 'I\'ve studied every criminal mind.',
            description: 'Vigilante who believes his detective training makes him expert on all human psychology'
          },
          {
            name: 'Reed Richards',
            source: 'Marvel Comics',
            quote: 'I\'ve calculated every possibility.',
            description: 'Genius scientist who believes his intellect qualifies him as expert on all matters'
          }
        ],
        '35+': [
          {
            name: 'Dumbledore',
            source: 'Harry Potter',
            quote: 'I know more than I let on.',
            description: 'Wise wizard who seems to have knowledge and opinions about everything'
          },
          {
            name: 'Odin',
            source: 'Marvel Comics',
            quote: 'I have seen all the Nine Realms.',
            description: 'All-Father who believes his cosmic experience makes him authority on all subjects'
          },
          {
            name: 'Genie',
            source: 'Aladdin',
            quote: 'Ten thousand years gives you such a crick in the neck!',
            description: 'Magical being who claims expertise based on millennia of experience'
          }
        ]
      }
    },
    'The Subtle Saboteur': {
      female: {
        '18-24': [
          {
            name: 'Drizzella',
            source: 'Cinderella',
            quote: 'Oh, that old thing?',
            description: 'Stepsister who uses backhanded compliments to undermine Cinderella\'s confidence'
          },
          {
            name: 'Ursula\'s eels',
            source: 'The Little Mermaid',
            quote: 'The boss is going to love this.',
            description: 'Minions who whisper doubts and false information to undermine their targets'
          },
          {
            name: 'Shego',
            source: 'Kim Possible',
            quote: 'That\'s so cute.',
            description: 'Villain who uses sarcasm and false praise to undermine heroes\' confidence'
          }
        ],
        '25-34': [
          {
            name: 'Poison Ivy',
            source: 'DC Comics',
            quote: 'I\'m just trying to help the environment.',
            description: 'Eco-terrorist who uses environmental concern to mask her undermining of human civilization'
          },
          {
            name: 'Emma Frost',
            source: 'Marvel Comics',
            quote: 'I\'m concerned about your mental state.',
            description: 'Telepath who uses false concern to plant doubts and undermine others\' confidence'
          },
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'I\'m on your side.',
            description: 'Shape-shifter who infiltrates groups while appearing supportive to undermine from within'
          }
        ],
        '35+': [
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'Oh, you must be tired, dear.',
            description: 'Stepmother who uses false concern to make cutting observations about Cinderella\'s worth'
          },
          {
            name: 'Queen Grimhilde',
            source: 'Snow White',
            quote: 'Poor child, she\'s so naive.',
            description: 'Evil queen who uses pity and false concern to undermine Snow White\'s confidence'
          },
          {
            name: 'Mother Gothel',
            source: 'Tangled',
            quote: 'You\'re too weak to survive out there.',
            description: 'Kidnapper who uses false maternal concern to systematically undermine Rapunzel\'s confidence'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'You\'re so desperate for love.',
            description: 'False prince who uses charm and false concern to undermine Anna\'s confidence'
          },
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'It\'s not right for a woman to read.',
            description: 'Hunter who uses social norms and false concern to undermine Belle\'s intellectual confidence'
          },
          {
            name: 'Flash Thompson',
            source: 'Marvel Comics',
            quote: 'Just trying to help you fit in, Parker.',
            description: 'School bully who uses false friendship to make undermining comments'
          }
        ],
        '25-34': [
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I\'m trying to help you see the truth.',
            description: 'God of lies who uses false brotherly concern to undermine Thor\'s confidence and relationships'
          },
          {
            name: 'Two-Face',
            source: 'DC Comics',
            quote: 'I\'m just being honest with you.',
            description: 'Villain who uses brutal "honesty" to undermine others\' confidence and moral certainty'
          },
          {
            name: 'Green Goblin',
            source: 'Marvel Comics',
            quote: 'I\'m just showing you reality.',
            description: 'Villain who uses twisted truth and false concern to undermine Spider-Man\'s heroic confidence'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'I only want what\'s best for Agrabah.',
            description: 'Vizier who uses false loyalty and concern to undermine the Sultan\'s confidence in his decisions'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I\'m only looking out for the pride.',
            description: 'Lion who uses false concern for the kingdom to undermine Mufasa\'s leadership'
          },
          {
            name: 'Emperor Palpatine',
            source: 'Star Wars',
            quote: 'I sense much fear in you.',
            description: 'Sith Lord who uses false mentorship to systematically undermine Anakin\'s confidence'
          }
        ]
      }
    },
    'The Addict': {
      female: {
        '18-24': [
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'I want to be where the people are.',
            description: 'Mermaid addicted to human world fantasy, prioritizes obsession over family relationships'
          },
          {
            name: 'Anna',
            source: 'Frozen',
            quote: 'Love is an open door.',
            description: 'Princess addicted to romantic fantasy, makes impulsive decisions that damage relationships'
          },
          {
            name: 'Harley Quinn',
            source: 'DC Comics',
            quote: 'Puddin\'!',
            description: 'Former psychiatrist addicted to toxic relationship and chaos with the Joker'
          }
        ],
        '25-34': [
          {
            name: 'Scarlet Witch',
            source: 'Marvel Comics',
            quote: 'I just want them back.',
            description: 'Mutant addicted to altering reality to cope with grief, damaging real relationships'
          },
          {
            name: 'Jean Grey (Dark Phoenix)',
            source: 'Marvel Comics',
            quote: 'I am fire! I am life!',
            description: 'Mutant addicted to cosmic power, prioritizes power over human connections'
          },
          {
            name: 'Poison Ivy',
            source: 'DC Comics',
            quote: 'Plants are better than people.',
            description: 'Eco-terrorist addicted to plant-based lifestyle, unable to form genuine human relationships'
          }
        ],
        '35+': [
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Off with their heads!',
            description: 'Tyrannical queen addicted to control and power, destroys relationships through rage addiction'
          },
          {
            name: 'Cruella de Vil',
            source: '101 Dalmatians',
            quote: 'I must have those puppies!',
            description: 'Fashion designer addicted to luxury and fur, prioritizes obsessions over human relationships'
          },
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'I must have my revenge.',
            description: 'Sorceress addicted to revenge and dark magic, unable to form healthy attachments'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Peter Quill',
            source: 'Marvel Comics',
            quote: 'I\'m Star-Lord, man.',
            description: 'Space adventurer addicted to his outlaw lifestyle and 80s nostalgia, avoids commitment'
          },
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'I am a monster.',
            description: 'Cursed prince addicted to self-pity and isolation, struggles with genuine connection'
          },
          {
            name: 'Aladdin',
            source: 'Aladdin',
            quote: 'Gotta eat to live, gotta steal to eat.',
            description: 'Street thief addicted to the excitement of stealing and living dangerously'
          }
        ],
        '25-34': [
          {
            name: 'Tony Stark',
            source: 'Marvel Comics',
            quote: 'I am Iron Man.',
            description: 'Genius inventor with alcohol addiction and workaholic tendencies affecting relationships'
          },
          {
            name: 'Wolverine',
            source: 'Marvel Comics',
            quote: 'I\'m the best at what I do.',
            description: 'Mutant addicted to violence and self-destructive behavior, struggles with intimacy'
          },
          {
            name: 'Deadpool',
            source: 'Marvel Comics',
            quote: 'Maximum effort!',
            description: 'Mercenary addicted to violence and chaos, uses humor to avoid emotional vulnerability'
          }
        ],
        '35+': [
          {
            name: 'Captain Hook',
            source: 'Peter Pan',
            quote: 'I\'ll get you, Pan!',
            description: 'Pirate captain addicted to revenge against Peter Pan, obsession dominates his life'
          },
          {
            name: 'Hades',
            source: 'Hercules',
            quote: 'I\'m about to rearrange the cosmos.',
            description: 'God of underworld addicted to schemes for power, unable to form genuine relationships'
          },
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'Infinite cosmic power!',
            description: 'Sorcerer addicted to magical power, prioritizes power acquisition over human connections'
          }
        ]
      }
    },
    'The Freewheeler': {
      female: {
        '18-24': [
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'I don\'t see how a world that makes such wonderful things could be bad.',
            description: 'Mermaid who avoids royal responsibilities and family commitments for adventure'
          },
          {
            name: 'Rapunzel',
            source: 'Tangled',
            quote: 'I want to see the floating lights.',
            description: 'Princess who avoids planning for the future, living entirely in the moment'
          },
          {
            name: 'Moana',
            source: 'Moana',
            quote: 'The ocean chose me.',
            description: 'Island girl who avoids traditional responsibilities to follow her wanderlust'
          }
        ],
        '25-34': [
          {
            name: 'Captain Marvel',
            source: 'Marvel Comics',
            quote: 'I go where I\'m needed.',
            description: 'Cosmic hero who avoids settling down or making long-term earthly commitments'
          },
          {
            name: 'Storm',
            source: 'Marvel Comics',
            quote: 'I must be free.',
            description: 'Weather mutant who struggles with commitment and being tied down to one place'
          },
          {
            name: 'Black Widow',
            source: 'Marvel Comics',
            quote: 'I\'m always ready to move on.',
            description: 'Spy whose training and lifestyle make her avoid deep personal commitments'
          }
        ],
        '35+': [
          {
            name: 'Merida\'s mother',
            source: 'Brave',
            quote: 'Some say our destiny is tied to the land.',
            description: 'Queen who initially avoids the deeper responsibilities of understanding her daughter'
          },
          {
            name: 'Fairy Godmother',
            source: 'Cinderella',
            quote: 'Even miracles take a little time.',
            description: 'Magical being who appears briefly to help but avoids long-term commitment'
          },
          {
            name: 'Elsa (early)',
            source: 'Frozen',
            quote: 'Let it go.',
            description: 'Queen who initially flees from responsibility rather than facing relationship challenges'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Peter Pan',
            source: 'Peter Pan',
            quote: 'I won\'t grow up.',
            description: 'Eternal boy who refuses to take on adult responsibilities or commitments'
          },
          {
            name: 'Flynn Rider',
            source: 'Tangled',
            quote: 'I prefer Flynn Rider.',
            description: 'Charming thief who avoids his real identity and commitment to anything serious'
          },
          {
            name: 'Kristoff',
            source: 'Frozen',
            quote: 'I prefer the company of reindeer.',
            description: 'Ice harvester who avoids human commitment and responsibility'
          }
        ],
        '25-34': [
          {
            name: 'Star-Lord',
            source: 'Marvel Comics',
            quote: 'We\'re the Guardians of the Galaxy.',
            description: 'Space outlaw who avoids settling down or taking on traditional relationship responsibilities'
          },
          {
            name: 'Deadpool',
            source: 'Marvel Comics',
            quote: 'I\'m a bad guy who gets paid to fuck up worse guys.',
            description: 'Mercenary who uses humor and chaos to avoid serious commitment'
          },
          {
            name: 'Wolverine',
            source: 'Marvel Comics',
            quote: 'I\'m a loner, Dottie. A rebel.',
            description: 'Mutant who avoids long-term commitments and relationships through constant wandering'
          }
        ],
        '35+': [
          {
            name: 'Genie',
            source: 'Aladdin',
            quote: 'Ten thousand years will give you such a crick in the neck!',
            description: 'Magical being who avoids serious commitment through humor and magical distractions'
          },
          {
            name: 'Captain Hook',
            source: 'Peter Pan',
            quote: 'I want my hand back!',
            description: 'Pirate captain who avoids growing up and taking adult responsibility'
          },
          {
            name: 'Hades',
            source: 'Hercules',
            quote: 'I\'ve got 24 hours to get rid of this bozo.',
            description: 'God who avoids long-term planning, preferring quick schemes over commitment'
          }
        ]
      }
    },
    'The Thinker': {
      female: {
        '18-24': [
          {
            name: 'Belle',
            source: 'Beauty and the Beast',
            quote: 'I want much more than this provincial life.',
            description: 'Bookworm who intellectualizes her desires rather than pursuing emotional connections'
          },
          {
            name: 'Elsa',
            source: 'Frozen',
            quote: 'Conceal, don\'t feel.',
            description: 'Queen who suppresses emotions through intellectual control and magical analysis'
          },
          {
            name: 'Hermione Granger',
            source: 'Harry Potter',
            quote: 'When in doubt, go to the library.',
            description: 'Brilliant student who approaches emotional problems through research and logic'
          }
        ],
        '25-34': [
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'I can sense everyone\'s thoughts.',
            description: 'Telepath who analyzes emotions rather than experiencing them naturally'
          },
          {
            name: 'Wonder Woman',
            source: 'DC Comics',
            quote: 'I must understand this world.',
            description: 'Amazon warrior who approaches human emotions through analytical study'
          },
          {
            name: 'Black Widow',
            source: 'Marvel Comics',
            quote: 'I\'ve been trained to analyze every situation.',
            description: 'Spy who uses tactical analysis to avoid emotional vulnerability'
          }
        ],
        '35+': [
          {
            name: 'Professor McGonagall',
            source: 'Harry Potter',
            quote: 'We must use our heads.',
            description: 'Academic who approaches all problems, including emotional ones, through intellectual analysis'
          },
          {
            name: 'Fairy Godmother',
            source: 'Cinderella',
            quote: 'Bibbidi-bobbidi-boo!',
            description: 'Magical being who solves emotional problems through magical formulas rather than feelings'
          },
          {
            name: 'The Blue Fairy',
            source: 'Pinocchio',
            quote: 'Always let your conscience be your guide.',
            description: 'Magical entity who gives logical moral guidance rather than emotional support'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'I\'ve read every book in this library.',
            description: 'Cursed prince who uses books and knowledge to avoid dealing with emotional trauma'
          },
          {
            name: 'Peter Parker',
            source: 'Marvel Comics',
            quote: 'My spider-sense is tingling.',
            description: 'Genius student who analyzes situations scientifically rather than trusting emotions'
          },
          {
            name: 'Simba',
            source: 'The Lion King',
            quote: 'I need to think.',
            description: 'Lion prince who intellectualizes his guilt rather than processing emotional trauma'
          }
        ],
        '25-34': [
          {
            name: 'Tony Stark',
            source: 'Marvel Comics',
            quote: 'I prefer the mechanical to the biological.',
            description: 'Genius inventor who approaches relationships like engineering problems to be solved'
          },
          {
            name: 'Doctor Strange',
            source: 'Marvel Comics',
            quote: 'I\'ve calculated 14,000,605 possibilities.',
            description: 'Sorcerer who uses magical analysis to avoid dealing with emotional pain'
          },
          {
            name: 'Batman',
            source: 'DC Comics',
            quote: 'I\'ve analyzed every possible scenario.',
            description: 'Detective who treats emotional problems like cases to be solved rather than felt'
          }
        ],
        '35+': [
          {
            name: 'Dumbledore',
            source: 'Harry Potter',
            quote: 'It is our choices that show what we truly are.',
            description: 'Wise wizard who approaches emotional problems through philosophical analysis'
          },
          {
            name: 'Odin',
            source: 'Marvel Comics',
            quote: 'Wisdom comes with age.',
            description: 'All-Father who intellectualizes family relationships rather than showing emotional vulnerability'
          },
          {
            name: 'Mufasa',
            source: 'The Lion King',
            quote: 'Remember who you are.',
            description: 'Lion king who gives philosophical guidance rather than direct emotional support'
          }
        ]
      }
    },
    'Emotional Invalidator': {
      female: {
        '18-24': [
          {
            name: 'Drizzella',
            source: 'Cinderella',
            quote: 'You\'re being ridiculous.',
            description: 'Stepsister who dismisses Cinderella\'s dreams and emotions as foolish fantasies'
          },
          {
            name: 'Sharpay Evans',
            source: 'High School Musical',
            quote: 'You\'re overreacting.',
            description: 'Drama queen who dismisses others\' feelings while dramatizing her own'
          },
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'You\'re pathetic.',
            description: 'Fire princess who dismisses others\' emotions as weakness beneath her consideration'
          }
        ],
        '25-34': [
          {
            name: 'Emma Frost',
            source: 'Marvel Comics',
            quote: 'Your emotions are showing.',
            description: 'Telepathic mutant who uses others\' emotional vulnerabilities against them'
          },
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'Feelings are a weakness.',
            description: 'Shape-shifter who dismisses emotional attachments as tactical vulnerabilities'
          },
          {
            name: 'Catwoman',
            source: 'DC Comics',
            quote: 'You\'re too soft.',
            description: 'Cat burglar who dismisses Batman\'s moral emotions as naive weakness'
          }
        ],
        '35+': [
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'You\'re imagining things.',
            description: 'Stepmother who consistently invalidates Cinderella\'s feelings and experiences'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Nonsense!',
            description: 'Tyrannical queen who dismisses others\' logical concerns as meaningless chatter'
          },
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'How quaint.',
            description: 'Dark fairy who dismisses others\' positive emotions as naive and worthless'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'You\'re so desperate for love.',
            description: 'False prince who dismisses Anna\'s emotional needs as pathetic desperation'
          },
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'Belle, you\'re being hysterical.',
            description: 'Hunter who dismisses Belle\'s intelligence and emotions as feminine hysteria'
          },
          {
            name: 'Flash Thompson',
            source: 'Marvel Comics',
            quote: 'Don\'t be such a baby, Parker.',
            description: 'School bully who dismisses Peter\'s emotional responses as weakness'
          }
        ],
        '25-34': [
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'Your sentiment is your weakness.',
            description: 'God of mischief who dismisses others\' emotional bonds as exploitable weaknesses'
          },
          {
            name: 'Magneto',
            source: 'Marvel Comics',
            quote: 'Your emotions cloud your judgment.',
            description: 'Mutant supremacist who dismisses others\' emotional concerns about his methods'
          },
          {
            name: 'Joker',
            source: 'DC Comics',
            quote: 'Why so serious?',
            description: 'Criminal mastermind who dismisses others\' emotional pain as taking life too seriously'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'Your feelings are irrelevant.',
            description: 'Sorcerer who dismisses others\' emotional needs in pursuit of power'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'You\'re being emotional.',
            description: 'Usurper lion who dismisses others\' grief and concern as weakness'
          },
          {
            name: 'Emperor Palpatine',
            source: 'Star Wars',
            quote: 'Your compassion is a weakness.',
            description: 'Sith Lord who systematically invalidates others\' positive emotions as character flaws'
          }
        ]
      }
    },
    'The Emotionally Distant': {
      female: {
        '18-24': [
          {
            name: 'Elsa',
            source: 'Frozen',
            quote: 'Don\'t let them in, don\'t let them see.',
            description: 'Queen who uses magical powers and royal duty to maintain emotional walls'
          },
          {
            name: 'Merida',
            source: 'Brave',
            quote: 'I\'ll be shooting for my own hand.',
            description: 'Scottish princess who uses independence and archery to avoid emotional vulnerability'
          },
          {
            name: 'Mulan',
            source: 'Mulan',
            quote: 'I\'ll bring honor to us all.',
            description: 'Warrior who uses duty and disguise to avoid dealing with personal emotional needs'
          }
        ],
        '25-34': [
          {
            name: 'Storm',
            source: 'Marvel Comics',
            quote: 'I must remain in control.',
            description: 'Weather mutant who uses goddess-like composure to maintain emotional distance'
          },
          {
            name: 'Wonder Woman',
            source: 'DC Comics',
            quote: 'I am an Amazon warrior first.',
            description: 'Princess who uses warrior training and duty to avoid emotional intimacy'
          },
          {
            name: 'Black Widow',
            source: 'Marvel Comics',
            quote: 'Love is for children.',
            description: 'Spy whose training and past trauma create barriers to emotional connection'
          }
        ],
        '35+': [
          {
            name: 'The Blue Fairy',
            source: 'Pinocchio',
            quote: 'I am here to guide, not to feel.',
            description: 'Magical being who maintains divine distance from emotional involvement'
          },
          {
            name: 'Professor McGonagall',
            source: 'Harry Potter',
            quote: 'I am a teacher, not a mother.',
            description: 'Academic who uses professional role to maintain emotional boundaries'
          },
          {
            name: 'Fairy Godmother',
            source: 'Cinderella',
            quote: 'My magic has limits.',
            description: 'Magical helper who appears briefly but avoids deep emotional connection'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'I am a monster.',
            description: 'Cursed prince who uses his appearance and curse as excuse to avoid emotional intimacy'
          },
          {
            name: 'Simba (exile)',
            source: 'The Lion King',
            quote: 'I can\'t go back.',
            description: 'Exiled prince who uses guilt and past trauma to avoid emotional connections'
          },
          {
            name: 'Peter Parker',
            source: 'Marvel Comics',
            quote: 'With great power comes great responsibility.',
            description: 'Hero who uses duty and responsibility to avoid dealing with personal emotional needs'
          }
        ],
        '25-34': [
          {
            name: 'Batman',
            source: 'DC Comics',
            quote: 'I work alone.',
            description: 'Vigilante who uses his mission and trauma to maintain emotional walls'
          },
          {
            name: 'Wolverine',
            source: 'Marvel Comics',
            quote: 'I don\'t do teams.',
            description: 'Mutant who uses his violent past and animal nature to avoid emotional vulnerability'
          },
          {
            name: 'Doctor Strange',
            source: 'Marvel Comics',
            quote: 'I\'ve seen too much.',
            description: 'Sorcerer who uses cosmic knowledge and duty to avoid dealing with personal emotions'
          }
        ],
        '35+': [
          {
            name: 'Dumbledore',
            source: 'Harry Potter',
            quote: 'I prefer not to keep all my secrets in one basket.',
            description: 'Wise wizard who uses secrets and greater good to avoid personal emotional intimacy'
          },
          {
            name: 'Odin',
            source: 'Marvel Comics',
            quote: 'I am the All-Father.',
            description: 'God-king who uses divine responsibility to avoid emotional connection with his sons'
          },
          {
            name: 'Mufasa',
            source: 'The Lion King',
            quote: 'A king\'s time as ruler rises and falls.',
            description: 'Lion king who uses royal wisdom and duty to maintain emotional distance'
          }
        ]
      }
    },
    'The Perpetual Victim': {
      female: {
        '18-24': [
          {
            name: 'Cinderella',
            source: 'Cinderella',
            quote: 'Oh well, what\'s a royal ball?',
            description: 'Stepchild who accepts mistreatment as her fate rather than taking action to change it'
          },
          {
            name: 'Anna (early)',
            source: 'Frozen',
            quote: 'Why do you shut me out?',
            description: 'Princess who sees herself as victim of sister\'s rejection rather than trying to understand'
          },
          {
            name: 'Snow White',
            source: 'Snow White',
            quote: 'I\'m so frightened.',
            description: 'Princess who sees herself as helpless victim rather than taking control of her situation'
          }
        ],
        '25-34': [
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'I can\'t control it.',
            description: 'Mutant who sees herself as victim of her powers rather than learning to master them'
          },
          {
            name: 'Rogue',
            source: 'Marvel Comics',
            quote: 'I can\'t touch anyone.',
            description: 'Mutant who focuses on her limitations rather than finding ways to connect with others'
          },
          {
            name: 'Harley Quinn',
            source: 'DC Comics',
            quote: 'Mistah J doesn\'t love me.',
            description: 'Former psychiatrist who sees herself as victim of Joker\'s abuse rather than leaving'
          }
        ],
        '35+': [
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'Life has been cruel to me.',
            description: 'Stepmother who uses past hardships to justify current cruel behavior'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Everyone is against me!',
            description: 'Tyrannical queen who sees opposition to her rule as personal victimization'
          },
          {
            name: 'Mother Gothel',
            source: 'Tangled',
            quote: 'You want me to be the bad guy?',
            description: 'Kidnapper who presents herself as victim when her control over Rapunzel is challenged'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'I\'m cursed to be alone.',
            description: 'Cursed prince who sees curse as thing happening TO him rather than consequence of his actions'
          },
          {
            name: 'Aladdin',
            source: 'Aladdin',
            quote: 'I\'m just a street rat.',
            description: 'Thief who sees his circumstances as fate rather than taking responsibility for his choices'
          },
          {
            name: 'Peter Parker',
            source: 'Marvel Comics',
            quote: 'Why does this always happen to me?',
            description: 'Hero who sometimes focuses on bad luck rather than examining his own choices'
          }
        ],
        '25-34': [
          {
            name: 'Tony Stark (early)',
            source: 'Marvel Comics',
            quote: 'Everyone wants to use my technology.',
            description: 'Genius who initially saw himself as victim of others\' greed rather than examining his role'
          },
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I was always in Thor\'s shadow.',
            description: 'God who blames family dynamics for his choices rather than taking responsibility'
          },
          {
            name: 'Two-Face',
            source: 'DC Comics',
            quote: 'Look what they did to me.',
            description: 'Former DA who blames his transformation on others rather than his own choices'
          }
        ],
        '35+': [
          {
            name: 'Captain Hook',
            source: 'Peter Pan',
            quote: 'That crocodile took my hand.',
            description: 'Pirate captain who defines himself by past injury rather than moving forward'
          },
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'I was denied my rightful place.',
            description: 'Sorcerer who blames society for not recognizing his worth rather than earning respect'
          },
          {
            name: 'Hades',
            source: 'Hercules',
            quote: 'Zeus gets all the glory.',
            description: 'God who blames family position for his problems rather than making the best of his role'
          }
        ]
      }
    },
    'The Parental Seeker': {
      female: {
        '18-24': [
          {
            name: 'Snow White',
            source: 'Snow White',
            quote: 'Will you take care of me?',
            description: 'Princess who seeks father figures and protectors rather than developing independence'
          },
          {
            name: 'Cinderella',
            source: 'Cinderella',
            quote: 'I need someone to save me.',
            description: 'Stepchild who dreams of being rescued rather than taking control of her life'
          },
          {
            name: 'Aurora',
            source: 'Sleeping Beauty',
            quote: 'I\'ve always lived with my aunts.',
            description: 'Princess who expects others to make all decisions and provide complete care'
          }
        ],
        '25-34': [
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'Professor Xavier, help me.',
            description: 'Mutant who relies on father figure mentor to guide her through all major decisions'
          },
          {
            name: 'Rogue',
            source: 'Marvel Comics',
            quote: 'I need someone to tell me what to do.',
            description: 'Mutant who seeks authority figures to provide guidance and structure'
          },
          {
            name: 'Harley Quinn',
            source: 'DC Comics',
            quote: 'Puddin\', what should I do?',
            description: 'Former psychiatrist who seeks dominant partner to make all decisions for her'
          }
        ],
        '35+': [
          {
            name: 'Aunt May',
            source: 'Marvel Comics',
            quote: 'I need someone to take care of me.',
            description: 'Elderly woman who expects nephew to provide complete emotional and financial support'
          },
          {
            name: 'Fairy Godmother',
            source: 'Shrek',
            quote: 'Someone should handle this for me.',
            description: 'Magical being who expects others to carry out her plans and handle difficulties'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Someone else should deal with this.',
            description: 'Queen who expects subjects to handle all practical matters while she makes demands'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Aladdin',
            source: 'Aladdin',
            quote: 'Genie, you\'re my best friend.',
            description: 'Street thief who relies on magical father figure to solve his problems'
          },
          {
            name: 'Simba (young)',
            source: 'The Lion King',
            quote: 'Dad, you\'ll always be there for me, right?',
            description: 'Lion cub who expects father to always provide guidance and protection'
          },
          {
            name: 'Peter Parker',
            source: 'Marvel Comics',
            quote: 'What would Uncle Ben do?',
            description: 'Hero who constantly seeks parental guidance from deceased father figure'
          }
        ],
        '25-34': [
          {
            name: 'Luke Skywalker',
            source: 'Star Wars',
            quote: 'Ben, I need your guidance.',
            description: 'Jedi who relies on mentor figures to make major life and moral decisions'
          },
          {
            name: 'Scott Lang',
            source: 'Marvel Comics',
            quote: 'Hank, tell me what to do.',
            description: 'Ant-Man who relies on mentor to provide direction and handle complex decisions'
          },
          {
            name: 'Barry Allen',
            source: 'DC Comics',
            quote: 'I need someone to guide me.',
            description: 'Speedster who seeks father figures to help him navigate his powers and responsibilities'
          }
        ],
        '35+': [
          {
            name: 'Happy (dwarf)',
            source: 'Snow White',
            quote: 'Snow White takes care of everything.',
            description: 'Adult dwarf who expects motherly figure to handle domestic responsibilities'
          },
          {
            name: 'Geppetto',
            source: 'Pinocchio',
            quote: 'I wish upon a star.',
            description: 'Woodcarver who relies on magical forces to handle the challenges of parenthood'
          },
          {
            name: 'King Triton',
            source: 'The Little Mermaid',
            quote: 'Sebastian, watch over her.',
            description: 'Sea king who delegates parental responsibilities to others rather than connecting directly'
          }
        ]
      }
    },
    'The Rake': {
      female: {
        '18-24': [
          {
            name: 'Megara',
            source: 'Hercules',
            quote: 'I\'m a damsel, I\'m in distress.',
            description: 'Former lover who uses seduction and manipulation for personal gain and survival'
          },
          {
            name: 'Jasmine',
            source: 'Aladdin',
            quote: 'I am not a prize to be won.',
            description: 'Princess who initially treats suitors as conquests to be rejected rather than partners'
          },
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'I want to be part of your world.',
            description: 'Mermaid who uses charm to get what she wants rather than forming genuine connections'
          }
        ],
        '25-34': [
          {
            name: 'Catwoman',
            source: 'DC Comics',
            quote: 'I\'m nobody\'s conquest.',
            description: 'Cat burglar who treats romantic relationships as games of seduction and power'
          },
          {
            name: 'Emma Frost',
            source: 'Marvel Comics',
            quote: 'I can have any man I want.',
            description: 'Telepathic mutant who uses her powers and beauty to collect romantic conquests'
          },
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'I can be anyone you desire.',
            description: 'Shape-shifter who uses her abilities to seduce and manipulate for personal gain'
          }
        ],
        '35+': [
          {
            name: 'Ursula',
            source: 'The Little Mermaid',
            quote: 'I have so much to offer.',
            description: 'Sea witch who uses seduction and false promises to trap victims for power'
          },
          {
            name: 'Evil Queen',
            source: 'Snow White',
            quote: 'I\'ll be the fairest of them all.',
            description: 'Vain queen who treats beauty as conquest and relationships as competitions to win'
          },
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'I know how to get what I want.',
            description: 'Stepmother who uses manipulation and social positioning to advance her interests'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'I was so close to getting what I wanted.',
            description: 'False prince who uses charm and fake romance to gain political power'
          },
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'No one fights like Gaston.',
            description: 'Hunter who sees Belle as ultimate conquest to prove his superiority'
          },
          {
            name: 'Flynn Rider',
            source: 'Tangled',
            quote: 'I have a reputation to maintain.',
            description: 'Charming thief who initially treats Rapunzel as means to an end'
          }
        ],
        '25-34': [
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I can be quite charming.',
            description: 'God of mischief who uses seduction and charm as tools for manipulation and power'
          },
          {
            name: 'Tony Stark (early)',
            source: 'Marvel Comics',
            quote: 'I prefer the company of beautiful women.',
            description: 'Billionaire playboy who initially treated relationships as conquests and entertainment'
          },
          {
            name: 'Wolverine',
            source: 'Marvel Comics',
            quote: 'I\'m not the settling down type.',
            description: 'Mutant who has history of romantic conquest without commitment'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'The princess will be mine.',
            description: 'Sorcerer who sees Jasmine as conquest to be won for power rather than love'
          },
          {
            name: 'Captain Hook',
            source: 'Peter Pan',
            quote: 'I always get what I want.',
            description: 'Pirate captain who approaches relationships as conquests to be won'
          },
          {
            name: 'Hades',
            source: 'Hercules',
            quote: 'I have plans for you, babe.',
            description: 'God who treats romantic interests as conquests in his larger schemes for power'
          }
        ]
      }
    },
    'The Future Faker': {
      female: {
        '18-24': [
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'We\'ll live happily ever after.',
            description: 'Mermaid who makes grand promises about perfect future life without realistic planning'
          },
          {
            name: 'Anna',
            source: 'Frozen',
            quote: 'We can figure this out together.',
            description: 'Princess who makes romantic promises about shared future after knowing someone briefly'
          },
          {
            name: 'Rapunzel',
            source: 'Tangled',
            quote: 'This will be the best day ever.',
            description: 'Princess who fantasizes about perfect future adventures without considering consequences'
          }
        ],
        '25-34': [
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'We can have a normal life.',
            description: 'Mutant who promises perfect future happiness while unable to control her powers'
          },
          {
            name: 'Scarlet Witch',
            source: 'Marvel Comics',
            quote: 'I can give us the perfect life.',
            description: 'Mutant who creates false reality promising perfect future that cannot be sustained'
          },
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'Together we can change the world.',
            description: 'Shape-shifter who makes grand promises about mutant future while planning betrayal'
          }
        ],
        '35+': [
          {
            name: 'Ursula',
            source: 'The Little Mermaid',
            quote: 'I can make all your dreams come true.',
            description: 'Sea witch who promises perfect future transformation while planning to trap victims'
          },
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'I will have my revenge.',
            description: 'Dark fairy who promises perfect future victory while pursuing destructive plans'
          },
          {
            name: 'Evil Queen',
            source: 'Snow White',
            quote: 'Soon I\'ll be the fairest of them all.',
            description: 'Vain queen who promises herself perfect future beauty through impossible means'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Aladdin',
            source: 'Aladdin',
            quote: 'I can show you the world.',
            description: 'Street thief who makes grand romantic promises about adventures he cannot actually provide'
          },
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'We can be happy together.',
            description: 'Cursed prince who promises perfect future while unable to control his curse'
          },
          {
            name: 'Prince Eric',
            source: 'The Little Mermaid',
            quote: 'We\'ll sail the world together.',
            description: 'Prince who makes romantic promises about shared adventures without practical planning'
          }
        ],
        '25-34': [
          {
            name: 'Tony Stark',
            source: 'Marvel Comics',
            quote: 'I can fix everything.',
            description: 'Genius who promises technological solutions to create perfect future'
          },
          {
            name: 'Scott Summers',
            source: 'Marvel Comics',
            quote: 'We can build a better world for mutants.',
            description: 'Mutant leader who makes grand promises about utopian future for mutant-kind'
          },
          {
            name: 'Bruce Wayne',
            source: 'DC Comics',
            quote: 'I can make Gotham safe.',
            description: 'Vigilante who promises to end crime permanently through his crusade'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'I will rule the world.',
            description: 'Sorcerer who promises perfect future empire while pursuing impossible absolute power'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I will make the pride great again.',
            description: 'Usurper who promises perfect future kingdom while destroying the Pride Lands'
          },
          {
            name: 'Thanos',
            source: 'Marvel Comics',
            quote: 'I will create a perfect universe.',
            description: 'Titan who promises utopian future through genocidal means'
          }
        ]
      }
    },
    'The Self-Obsessed': {
      female: {
        '18-24': [
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'I want to be where the people are.',
            description: 'Mermaid whose entire world revolves around her desires and dreams above family concerns'
          },
          {
            name: 'Jasmine',
            source: 'Aladdin',
            quote: 'I want to see the world.',
            description: 'Princess who prioritizes her personal freedom over royal duties and others\' needs'
          },
          {
            name: 'Merida',
            source: 'Brave',
            quote: 'I\'ll be shooting for my own hand.',
            description: 'Scottish princess who puts her personal desires above family tradition and consequences'
          }
        ],
        '25-34': [
          {
            name: 'Emma Frost',
            source: 'Marvel Comics',
            quote: 'I am perfection.',
            description: 'Telepathic mutant who believes everything should revolve around her beauty and power'
          },
          {
            name: 'Storm',
            source: 'Marvel Comics',
            quote: 'I am a goddess.',
            description: 'Weather mutant who sometimes lets worship and power go to her head'
          },
          {
            name: 'Jean Grey (Dark Phoenix)',
            source: 'Marvel Comics',
            quote: 'I am fire! I am life!',
            description: 'Mutant whose cosmic power makes her believe she\'s above human concerns'
          }
        ],
        '35+': [
          {
            name: 'Evil Queen',
            source: 'Snow White',
            quote: 'I must be the fairest of them all.',
            description: 'Vain queen whose entire existence revolves around being the most beautiful'
          },
          {
            name: 'Cruella de Vil',
            source: '101 Dalmatians',
            quote: 'I must have those puppies!',
            description: 'Fashion designer who prioritizes her desires above the welfare of animals and others'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'All ways are my ways!',
            description: 'Tyrannical queen who believes everything in Wonderland should serve her whims'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'No one\'s slick as Gaston.',
            description: 'Hunter who believes he\'s superior to everyone and deserves whatever he wants'
          },
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'I\'m the hero who\'s going to save Arendelle.',
            description: 'False prince whose schemes revolve entirely around advancing his own status'
          },
          {
            name: 'Flash Thompson',
            source: 'Marvel Comics',
            quote: 'It\'s all about me.',
            description: 'School athlete who believes his popularity makes him the center of importance'
          }
        ],
        '25-34': [
          {
            name: 'Tony Stark (early)',
            source: 'Marvel Comics',
            quote: 'I am Iron Man.',
            description: 'Billionaire genius whose ego initially made everything about his superiority and image'
          },
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I was born to rule.',
            description: 'God of mischief who believes he deserves to rule and have everyone worship him'
          },
          {
            name: 'Green Lantern (Hal Jordan)',
            source: 'DC Comics',
            quote: 'I\'m the greatest Green Lantern.',
            description: 'Space cop whose ego makes him believe he\'s superior to other Lanterns'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'The universe is mine to command!',
            description: 'Sorcerer who believes all power and worship should belong to him'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I\'m the king!',
            description: 'Usurper lion who believes everything should revolve around his desires and status'
          },
          {
            name: 'Thanos',
            source: 'Marvel Comics',
            quote: 'I am inevitable.',
            description: 'Titan who believes his vision is so important that universe should conform to his will'
          }
        ]
      }
    },
    'The Puppet Master': {
      female: {
        '18-24': [
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'Fear is the only reliable way.',
            description: 'Fire princess who manipulates through fear, intimidation, and psychological control'
          },
          {
            name: 'Harley Quinn (manipulative phase)',
            source: 'DC Comics',
            quote: 'I know exactly how to get what I want.',
            description: 'Former psychiatrist who uses psychological knowledge to manipulate others'
          },
          {
            name: 'Shego',
            source: 'Kim Possible',
            quote: 'I have my ways.',
            description: 'Villain who uses her powers and cunning to manipulate situations and people'
          }
        ],
        '25-34': [
          {
            name: 'Mystique',
            source: 'Marvel Comics',
            quote: 'I can be anyone.',
            description: 'Shape-shifter who uses deception and infiltration to control and manipulate others'
          },
          {
            name: 'Emma Frost',
            source: 'Marvel Comics',
            quote: 'Your thoughts are mine to control.',
            description: 'Telepathic mutant who uses mind control and manipulation to get what she wants'
          },
          {
            name: 'Poison Ivy',
            source: 'DC Comics',
            quote: 'I can make you do anything.',
            description: 'Eco-terrorist who uses pheromones and plant toxins to control victims'
          }
        ],
        '35+': [
          {
            name: 'Ursula',
            source: 'The Little Mermaid',
            quote: 'I have so much to offer.',
            description: 'Sea witch who uses contracts and manipulation to trap victims and steal their power'
          },
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'You shall know my power.',
            description: 'Dark fairy who manipulates through curses, fear, and magical control'
          },
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'You will do as I say.',
            description: 'Stepmother who uses emotional manipulation and economic control to dominate household'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'I\'ve been planning this for years.',
            description: 'False prince who orchestrates elaborate deception to manipulate his way to power'
          },
          {
            name: 'Loki (young)',
            source: 'Marvel Comics',
            quote: 'I am the god of mischief.',
            description: 'Young god who uses illusion and manipulation to control situations and people'
          },
          {
            name: 'Green Goblin',
            source: 'Marvel Comics',
            quote: 'I know your every weakness.',
            description: 'Villain who uses psychological manipulation and knowledge of heroes\' identities'
          }
        ],
        '25-34': [
          {
            name: 'Loki',
            source: 'Marvel Comics',
            quote: 'I control the game.',
            description: 'God of lies who orchestrates elaborate schemes to manipulate gods and mortals'
          },
          {
            name: 'Magneto',
            source: 'Marvel Comics',
            quote: 'You will serve my cause.',
            description: 'Mutant supremacist who manipulates through ideology, fear, and magnetic control'
          },
          {
            name: 'Joker',
            source: 'DC Comics',
            quote: 'I made you.',
            description: 'Criminal mastermind who uses psychological warfare to break and control victims'
          }
        ],
        '35+': [
          {
            name: 'Emperor Palpatine',
            source: 'Star Wars',
            quote: 'Everything is proceeding as I have foreseen.',
            description: 'Sith Lord who orchestrates galactic manipulation spanning decades'
          },
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'You will bow to me.',
            description: 'Sorcerer who uses hypnosis, magic, and political manipulation to control the kingdom'
          },
          {
            name: 'Thanos',
            source: 'Marvel Comics',
            quote: 'I will reshape reality itself.',
            description: 'Titan who manipulates entire civilizations and cosmic forces to achieve his vision'
          }
        ]
      }
    },
    'The Intimidator': {
      female: {
        '18-24': [
          {
            name: 'Azula',
            source: 'Avatar: The Last Airbender',
            quote: 'I will hunt you down.',
            description: 'Fire princess who uses superior power and threats of violence to intimidate others'
          },
          {
            name: 'Shego',
            source: 'Kim Possible',
            quote: 'You don\'t want to make me angry.',
            description: 'Villain who uses energy powers and aggressive threats to intimidate heroes'
          },
          {
            name: 'Toph',
            source: 'Avatar: The Last Airbender',
            quote: 'I\'ll bury you.',
            description: 'Earthbender who uses superior fighting skills and harsh attitude to intimidate opponents'
          }
        ],
        '25-34': [
          {
            name: 'Storm',
            source: 'Marvel Comics',
            quote: 'You dare threaten me?',
            description: 'Weather goddess who uses elemental power and divine presence to intimidate enemies'
          },
          {
            name: 'Wonder Woman (when angry)',
            source: 'DC Comics',
            quote: 'I am an Amazon warrior.',
            description: 'Amazon princess who uses superior combat skills and divine strength to intimidate'
          },
          {
            name: 'Phoenix',
            source: 'Marvel Comics',
            quote: 'I am fire and life incarnate!',
            description: 'Cosmic entity who uses overwhelming power to intimidate entire civilizations'
          }
        ],
        '35+': [
          {
            name: 'Maleficent',
            source: 'Sleeping Beauty',
            quote: 'You shall deal with me!',
            description: 'Dark fairy who uses magical power and terrifying transformations to intimidate'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'Off with their heads!',
            description: 'Tyrannical queen who uses threats of execution and displays of power to intimidate'
          },
          {
            name: 'Ursula',
            source: 'The Little Mermaid',
            quote: 'Now I am the ruler of all the ocean!',
            description: 'Sea witch who uses magical transformation and ocean power to intimidate victims'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'No one fights like Gaston!',
            description: 'Hunter who uses physical strength and aggressive behavior to intimidate opponents'
          },
          {
            name: 'Prince Hans',
            source: 'Frozen',
            quote: 'I will destroy everything you love.',
            description: 'False prince who uses political power and threats against loved ones to intimidate'
          },
          {
            name: 'Flash Thompson',
            source: 'Marvel Comics',
            quote: 'You\'re gonna get it, Parker.',
            description: 'School bully who uses physical intimidation and social power to control others'
          }
        ],
        '25-34': [
          {
            name: 'Magneto',
            source: 'Marvel Comics',
            quote: 'I am the master of magnetism.',
            description: 'Mutant supremacist who uses overwhelming power and Holocaust history to intimidate'
          },
          {
            name: 'Doctor Doom',
            source: 'Marvel Comics',
            quote: 'Doom commands it!',
            description: 'Dictator who uses technological power and royal authority to intimidate enemies'
          },
          {
            name: 'Green Goblin',
            source: 'Marvel Comics',
            quote: 'I\'ll destroy everyone you care about.',
            description: 'Villain who uses threats against loved ones and psychological terror to intimidate'
          }
        ],
        '35+': [
          {
            name: 'Thanos',
            source: 'Marvel Comics',
            quote: 'I am inevitable.',
            description: 'Titan who uses cosmic power and genocide to intimidate entire civilizations'
          },
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'You will cower before my might!',
            description: 'Sorcerer who uses magical power and political authority to intimidate the kingdom'
          },
          {
            name: 'Scar',
            source: 'The Lion King',
            quote: 'I am the king!',
            description: 'Usurper who uses hyenas and threats of violence to intimidate the pride'
          }
        ]
      }
    },
    'The Clinger': {
      female: {
        '18-24': [
          {
            name: 'Anna',
            source: 'Frozen',
            quote: 'Don\'t shut me out.',
            description: 'Princess obsessively devoted to reconnecting with sister, unable to accept boundaries'
          },
          {
            name: 'Ariel',
            source: 'The Little Mermaid',
            quote: 'I\'ll do anything to be with him.',
            description: 'Mermaid who gives up everything for a man she barely knows, obsessively devoted'
          },
          {
            name: 'Belle',
            source: 'Beauty and the Beast',
            quote: 'I won\'t leave you.',
            description: 'Young woman who becomes obsessively attached to Beast, unable to maintain boundaries'
          }
        ],
        '25-34': [
          {
            name: 'Jean Grey',
            source: 'Marvel Comics',
            quote: 'Scott, I need you.',
            description: 'Mutant whose telepathic connection creates unhealthy emotional dependence on partner'
          },
          {
            name: 'Rogue',
            source: 'Marvel Comics',
            quote: 'I can\'t let you go.',
            description: 'Mutant whose power isolation makes her cling desperately to any romantic connection'
          },
          {
            name: 'Harley Quinn',
            source: 'DC Comics',
            quote: 'I\'ll never leave you, Mistah J.',
            description: 'Former psychiatrist obsessively devoted to Joker despite abuse and rejection'
          }
        ],
        '35+': [
          {
            name: 'Mother Gothel',
            source: 'Tangled',
            quote: 'You are never leaving this tower!',
            description: 'Kidnapper who cannot accept Rapunzel\'s independence, obsessively controlling'
          },
          {
            name: 'Queen of Hearts',
            source: 'Alice in Wonderland',
            quote: 'No one leaves my kingdom!',
            description: 'Tyrannical queen who cannot accept anyone leaving her domain or rejecting her authority'
          },
          {
            name: 'Lady Tremaine',
            source: 'Cinderella',
            quote: 'You belong to this family.',
            description: 'Stepmother who cannot accept Cinderella\'s independence or departure from household'
          }
        ]
      },
      male: {
        '18-24': [
          {
            name: 'Beast',
            source: 'Beauty and the Beast',
            quote: 'You promised to stay forever.',
            description: 'Cursed prince who becomes possessively attached to Belle, struggling with her freedom'
          },
          {
            name: 'Gaston',
            source: 'Beauty and the Beast',
            quote: 'Belle will be mine.',
            description: 'Hunter obsessed with marrying Belle, unable to accept her rejection'
          },
          {
            name: 'Prince Eric',
            source: 'The Little Mermaid',
            quote: 'I\'ll find that girl with the voice.',
            description: 'Prince obsessively searching for mystery woman, unable to move on'
          }
        ],
        '25-34': [
          {
            name: 'Scott Summers',
            source: 'Marvel Comics',
            quote: 'I can\'t lose you again.',
            description: 'Mutant leader whose fear of loss creates obsessive attachment to Jean Grey'
          },
          {
            name: 'Reed Richards',
            source: 'Marvel Comics',
            quote: 'Sue, you can\'t leave.',
            description: 'Genius scientist whose dedication to work creates clingy behavior when relationship threatened'
          },
          {
            name: 'Bruce Wayne',
            source: 'DC Comics',
            quote: 'I won\'t let you go.',
            description: 'Vigilante whose fear of loss creates obsessive protective behavior toward loved ones'
          }
        ],
        '35+': [
          {
            name: 'Jafar',
            source: 'Aladdin',
            quote: 'You will be mine, Princess.',
            description: 'Sorcerer obsessed with possessing Jasmine, unable to accept her rejection'
          },
          {
            name: 'Hades',
            source: 'Hercules',
            quote: 'You work for me now.',
            description: 'God of underworld who cannot accept subordinates leaving his service'
          },
          {
            name: 'Captain Hook',
            source: 'Peter Pan',
            quote: 'I\'ll have my revenge on Pan.',
            description: 'Pirate captain obsessively devoted to defeating Peter Pan, unable to move on'
          }
        ]
      }
    }
  }
};

// =============================================================================
// Section 6: Scenario Analysis System
// =============================================================================


const SCENARIO_ANALYSIS = {
  'Decision-Making Dynamics': {
    friendlyName: 'How Decisions Get Made',
    icon: '🎭',
    description: 'Who really has the final say in your relationship decisions?',
    levels: {
      high: { 
        label: 'Your voice seems to have gone missing', 
        description: 'Remember when you used to have opinions about things? Yeah, those apparently don\'t matter anymore. Every "discussion" feels like a performance where they\'ve already decided the ending.',
        advice: 'Honey, in healthy relationships, both people get a vote. Not just one person deciding and the other saying "okay, sure." 💭',
        emoji: '😔',
        severity: 'concerning'
      },
      medium: { 
        label: 'Mostly their show, you\'re the audience', 
        description: 'You get consulted sometimes, but final decisions? That\'s their department. You\'re like a advisor who gives input but never gets to vote.',
        advice: 'Babe, being asked for your opinion after they\'ve decided isn\'t the same as making decisions together. 🤗',
        emoji: '😐',
        severity: 'moderate'
      },
      low: { 
        label: 'True partnership vibes', 
        description: 'Decisions get made together, with both voices heard and respected. Sometimes you lead, sometimes they do, but it\'s always collaborative.',
        advice: 'This is what healthy decision-making looks like! Both people matter and both opinions count. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  },

  'Conflict Resolution Patterns': {
    friendlyName: 'How Arguments Go Down',
    icon: '🎪',
    description: 'What happens when you two disagree or have different viewpoints?',
    levels: {
      high: { 
        label: 'You\'re always the villain in their story', 
        description: 'Fights don\'t get resolved, they get... choreographed? You end up apologizing for things that happened TO you. Every argument follows the same script: gaslight, deflect, victimize, repeat.',
        advice: 'Babe, healthy arguments end with understanding, not you questioning your sanity. 🤗',
        emoji: '😞',
        severity: 'toxic'
      },
      medium: { 
        label: 'Drama with occasional resolution', 
        description: 'Arguments are intense and you often feel unheard, but sometimes things get worked out. It\'s exhausting, but not completely hopeless.',
        advice: 'Sweetie, conflict shouldn\'t leave you feeling emotionally drained every time. 💙',
        emoji: '😟',
        severity: 'unhealthy'
      },
      low: { 
        label: 'Healthy conflict resolution', 
        description: 'Disagreements happen, but they\'re handled with respect and care for each other. You both listen, both compromise, and both walk away feeling heard.',
        advice: 'This is beautiful! Conflict handled with love and respect. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  },

  'Social Connection Control': {
    friendlyName: 'What Happened to Your People',
    icon: '👥',
    description: 'How has your relationship affected your friendships and family connections?',
    levels: {
      high: { 
        label: 'Your social circle got mysteriously smaller', 
        description: 'Remember Sarah from college? And your cousin you used to be close with? Funny how they all became "drama" right around the time your partner showed up. Your social life has been "curated" by someone with boundary issues.',
        advice: 'Sweetie, people who love you want you to have OTHER people who love you too. 💕',
        emoji: '😢',
        severity: 'isolating'
      },
      medium: { 
        label: 'Some friends got the cold shoulder', 
        description: 'Your partner has strong opinions about certain people in your life. They don\'t forbid friendships, but they make their disapproval known.',
        advice: 'Honey, it\'s okay to have preferences, but isolating you from support isn\'t love. 🤗',
        emoji: '😕',
        severity: 'concerning'
      },
      low: { 
        label: 'Supportive of your connections', 
        description: 'They encourage your friendships and enjoy spending time with your people. Your social circle has grown, not shrunk, since being together.',
        advice: 'This is lovely! A partner who celebrates your other relationships. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  },

  'Emotional Support Quality': {
    friendlyName: 'Emotional Support Situation',
    icon: '💙',
    description: 'How they respond when you need comfort, understanding, or celebration',
    levels: {
      high: { 
        label: 'Support comes with strings attached', 
        description: 'When you need comfort, somehow it becomes about them. Your problems become their spotlight moments. Support feels transactional - you owe them for their "help."',
        advice: 'Real support doesn\'t come with a bill or conditions attached. 🤗',
        emoji: '😔',
        severity: 'manipulative'
      },
      medium: { 
        label: 'Hit or miss support', 
        description: 'Sometimes they\'re great, sometimes they\'re not really present. It depends on their mood, their schedule, or what\'s happening in their life.',
        advice: 'Consistency in emotional support matters, love. You deserve reliable care. 🤗',
        emoji: '😐',
        severity: 'inconsistent'
      },
      low: { 
        label: 'Genuinely supportive', 
        description: 'They\'re there for you when you need them, no strings attached. They celebrate your wins and comfort your losses without making it about them.',
        advice: 'This is what caring support looks like! Someone who shows up for you. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  },

  'Boundary Respect': {
    friendlyName: 'Boundary Respect',
    icon: '🚧',
    description: 'How well they respect your personal limits, privacy, and autonomy',
    levels: {
      high: { 
        label: 'What boundaries?', 
        description: '"No" seems to be a foreign word they\'re still learning. Your phone, your space, your time - apparently it\'s all community property now? Boundaries are just suggestions they find adorable.',
        advice: 'Darling, "no" is a complete sentence. You shouldn\'t have to explain or justify your boundaries. 💪',
        emoji: '😟',
        severity: 'violating'
      },
      medium: { 
        label: 'Usually respectful', 
        description: 'Most of the time they respect your limits, with occasional testing. They understand boundaries exist, but sometimes push to see what they can get away with.',
        advice: 'Progress! Though boundaries should always be respected, not sometimes. 💭',
        emoji: '😌',
        severity: 'improving'
      },
      low: { 
        label: 'Respects your boundaries', 
        description: 'They understand and honor your limits consistently. When you say no, they listen. When you need space, they give it.',
        advice: 'Beautiful! This is what respect looks like in action. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
      },

  'Emotional Regulation': {
    friendlyName: 'How They Handle Their Feelings',
    icon: '🌪️',
    description: 'Your partner\'s ability to manage their own emotions without making them your problem',
    levels: {
      high: { 
        label: 'You\'re their emotional punching bag', 
        description: 'Bad day at work? You\'re gonna hear about it. Stressed about money? Time to take it out on you. Their emotions are like weather systems, and you\'re always in the path of the storm. You\'ve become their personal emotional support human.',
        advice: 'Love, their feelings are valid, but making them your responsibility isn\'t fair. 💙',
        emoji: '😰',
        severity: 'toxic'
      },
      medium: { 
        label: 'Sometimes stable, sometimes... not so much', 
        description: 'They\'re working on it, but emotional regulation is still a work in progress. Some days they handle stress well, other days you\'re walking on eggshells wondering what mood you\'ll encounter.',
        advice: 'Everyone\'s learning, but your peace shouldn\'t depend on their mood management. 🤗',
        emoji: '😬',
        severity: 'unstable'
      },
      low: { 
        label: 'Emotionally mature and self-aware', 
        description: 'They handle their emotions like the grown-up they are. Bad days happen, but they don\'t become your emergency. They communicate their feelings without making them your fault or your job to fix.',
        advice: 'This is emotional maturity in action! Someone who owns their feelings. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  },

  'Trust and Honesty': {
    friendlyName: 'Truth-Telling Track Record',
    icon: '🔍',
    description: 'How honest they are and whether you can actually trust what they say',
    levels: {
      high: { 
        label: 'Truth is apparently optional', 
        description: 'Little lies, big lies, lies about lies - it\'s like living with a creative writing major who never graduated. You\'ve started fact-checking their stories because "going to the store" somehow takes 4 hours and involves people you\'ve never heard of.',
        advice: 'Sweetie, if you can\'t trust their words, what can you trust? This isn\'t sustainable. 💭',
        emoji: '😞',
        severity: 'deceptive'
      },
      medium: { 
        label: 'Mostly honest with occasional... creative editing', 
        description: 'They\'re not a pathological liar, but they definitely have a flexible relationship with the complete truth. White lies, omissions, or "protecting your feelings" by not telling you things.',
        advice: 'Half-truths are still half-lies, babe. You deserve the whole story. 🤗',
        emoji: '😕',
        severity: 'concerning'
      },
      low: { 
        label: 'Honest and trustworthy', 
        description: 'What they say matches what they do. No need to play detective or second-guess their stories. Even difficult conversations happen with honesty and care.',
        advice: 'This is what trust looks like! Someone whose words you can count on. 💕',
        emoji: '😊',
        severity: 'healthy'
      }
    }
  }
};

// =============================================================================
// Section 7: SESSION MANAGEMENT
// =============================================================================

// Global sessions storage
const sessions = new Map();

// =============================================================================
// AssessmentSession Class
// =============================================================================

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
    this.stage = 'created';
    this.metadata = {
      userAgent: null,
      ipAddress: null,
      startTime: new Date(),
      completionTime: null,
      totalDuration: null
    };
  }

  // Keep existing methods
  setDemographics(demographics) {
    this.demographics = demographics;
    this.lastActivity = new Date();
  }

  addResponse(question, response) {
    this.responses.push({
      questionId: question.id,
      questionText: question.text,
      response: response,
      timestamp: new Date(),
      wordCount: response.trim().split(/\s+/).filter(w => w.length > 0).length
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

  setMetadata(key, value) {
    this.metadata[key] = value;
    this.lastActivity = new Date();
  }
}

// ADD THIS NEW ENHANCED CLASS RIGHT AFTER
class SupabaseAssessmentSession extends AssessmentSession {
  constructor(sessionId) {
    super(sessionId);
    this.dbId = null;
    this.isPersistedToDB = false;
  }

  async persistToDatabase() {
    if (!supabase || this.isPersistedToDB) return;

    try {
      const crypto = require('crypto');
      const userAgentHash = this.metadata?.userAgent ? 
        crypto.createHash('sha256').update(this.metadata.userAgent).digest('hex') : null;

      const { data, error } = await supabase
        .from('assessment_sessions')
        .insert({
          session_id: this.id,
          created_at: this.createdAt.toISOString(),
          status: this.stage,
          user_agent_hash: userAgentHash,
          session_metadata: this.metadata
        })
        .select()
        .single();

      if (error) throw error;

      this.dbId = data.id;
      this.isPersistedToDB = true;
      console.log(`💾 Session ${this.id} persisted to Supabase`);
      
    } catch (error) {
      console.error(`❌ Failed to persist session ${this.id}:`, error);
    }
  }

  async updateSessionStatus() {
    if (!supabase || !this.isPersistedToDB) return;

    try {
      await supabase
        .from('assessment_sessions')
        .update({
          status: this.stage,
          total_duration_ms: new Date() - this.createdAt,
          session_metadata: this.metadata,
          completed_at: this.stage === 'analysis_complete' ? new Date().toISOString() : null
        })
        .eq('id', this.dbId);
    } catch (error) {
      console.error(`❌ Failed to update session status:`, error);
    }
  }

  async setDemographics(demographics) {
    super.setDemographics(demographics);
    
    if (!this.isPersistedToDB) {
      await this.persistToDatabase();
    }

    if (!supabase || !this.isPersistedToDB) return;

    try {
      await supabase
        .from('session_demographics')
        .insert({
          session_uuid: this.dbId,
          age_group: demographics.ageGroup,
          gender: demographics.gender,
          region: demographics.region,
          relationship_status: demographics.relationshipStatus,
          relationship_duration: demographics.relationshipDuration
        });

      await this.updateSessionStatus();
      console.log(`👤 Demographics saved to Supabase for session ${this.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to save demographics:`, error);
    }
  }

  async addResponse(question, response) {
    super.addResponse(question, response);

    if (!this.isPersistedToDB) {
      await this.persistToDatabase();
    }

    if (!supabase || !this.isPersistedToDB) return;

    try {
      const responseData = this.responses[this.responses.length - 1];
      
      await supabase
        .from('session_responses')
        .insert({
          session_uuid: this.dbId,
          question_id: question.id,
          question_text: question.text,
          question_stage: question.stage,
          response_text: response,
          response_length: response.length,
          word_count: responseData.wordCount || response.trim().split(/\s+/).length,
          response_order: this.responses.length
        });

      await this.updateSessionStatus();
      console.log(`💬 Response saved to Supabase for session ${this.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to save response:`, error);
    }
  }

  async setAnalysisResults(results) {
    super.setAnalysisResults(results);

    if (!this.isPersistedToDB) {
      await this.persistToDatabase();
    }

    if (!supabase || !this.isPersistedToDB) return;

    try {
      await supabase
        .from('session_analysis')
        .insert({
          session_uuid: this.dbId,
          persona_name: results.persona?.title || 'Unknown',
          confidence_score: results.confidence || 0,
          risk_level: results.riskAssessment?.level || 'unknown',
          analysis_method: results.analysisMethod || 'unknown',
          trait_scores: results.traitScores || {},
          scenario_scores: results.scenarioScores || {},
          key_indicators: results.keyIndicators || [],
          behavioral_evidence: results.behavioralEvidence || {}
        });

      this.stage = 'analysis_complete';
      this.metadata.completionTime = new Date();
      await this.updateSessionStatus();

      console.log(`📊 Analysis results saved to Supabase for session ${this.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to save analysis results:`, error);
    }
  }

  async saveFeedback(feedbackData) {
    if (!supabase || !this.isPersistedToDB) return;

    try {
      await supabase
        .from('session_feedback')
        .insert({
          session_uuid: this.dbId,
          quick_rating: feedbackData.quickRating,
          most_helpful: feedbackData.mostHelpful,
          additional_comments: feedbackData.additionalComments,
          improvements: feedbackData.improvements
        });

      console.log(`📝 Feedback saved to Supabase for session ${this.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to save feedback:`, error);
    }
  }
}
// =============================================================================
// Session Management Functions
// =============================================================================

/**
 * Create a new assessment session
 * @returns {AssessmentSession} New session instance
 */
function createSession() {
  const sessionId = 'assess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Use Supabase session if available, otherwise regular session
  const session = supabase ? 
    new SupabaseAssessmentSession(sessionId) : 
    new AssessmentSession(sessionId);
  
  sessions.set(sessionId, session);
  console.log(`🆕 New session created: ${sessionId}`);
  return session;
}

/**
 * Get session by ID
 * @param {string} sessionId - Session identifier
 * @returns {AssessmentSession|null} Session instance or null if not found
 */
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.updateActivity();
    return session;
  }
  return null;
}

/**
 * Delete session by ID
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if session was deleted, false if not found
 */
function deleteSession(sessionId) {
  const deleted = sessions.delete(sessionId);
  if (deleted) {
    console.log(`🗑️ Session deleted: ${sessionId}`);
  }
  return deleted;
}

/**
 * Get all active sessions
 * @returns {Array} Array of session info objects
 */
function getActiveSessions() {
  return Array.from(sessions.values()).map(session => session.getSessionInfo());
}

/**
 * Cleanup expired sessions
 * @param {number} timeoutMs - Session timeout in milliseconds
 * @returns {number} Number of sessions cleaned up
 */
function cleanupExpiredSessions(timeoutMs = 24 * 60 * 60 * 1000) {
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (session.isExpired(timeoutMs)) {
      sessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
  }
  
  return cleanedCount;
}

/**
 * Get session statistics
 * @returns {Object} Session statistics
 */
function getSessionStats() {
  const allSessions = Array.from(sessions.values());
  const now = new Date();
  
  return {
    total: allSessions.length,
    byStage: {
      created: allSessions.filter(s => s.stage === 'created').length,
      demographics: allSessions.filter(s => s.stage === 'demographics_complete').length,
      assessment: allSessions.filter(s => s.stage === 'assessment_complete').length,
      analysis: allSessions.filter(s => s.stage === 'analysis_complete').length
    },
    activity: {
      last1Hour: allSessions.filter(s => (now - s.lastActivity) < 60 * 60 * 1000).length,
      last24Hours: allSessions.filter(s => (now - s.lastActivity) < 24 * 60 * 60 * 1000).length,
      older: allSessions.filter(s => (now - s.lastActivity) >= 24 * 60 * 60 * 1000).length
    },
    completion: {
      completed: allSessions.filter(s => s.responses.length >= QUESTION_BANK.length).length,
      inProgress: allSessions.filter(s => s.responses.length > 0 && s.responses.length < QUESTION_BANK.length).length,
      notStarted: allSessions.filter(s => s.responses.length === 0).length
    }
  };
} 


// =============================================================================
// Section 8:ANALYSIS ENGINE
// =============================================================================

// =============================================================================
// SIMPLIFIED ENHANCED ANALYSIS ENGINE - Replace in server.js
// =============================================================================

const { LLMAnalysisEngine } = require('./llmAnalysisEngine');

class EnhancedAnalysisEngine {
  constructor() {
    this.llmEngine = new LLMAnalysisEngine();
    
    // Initialize enhanced manual analysis patterns
    this.enhancedPatterns = this.initializeEnhancedPatterns();
  }

  async analyzeResponses(responses, demographics) {
    try {
      console.log('🧠 Starting enhanced analysis...');
      
      // First, try the LLM engine (it handles GPT-4 → GPT-3.5 → Claude → Simple fallback internally)
      const analysis = await this.llmEngine.analyzePartnerBehavior(
        responses, 
        demographics, 
        this.buildConversationHistory(responses)
      );
      
      // Check if LLM analysis was successful (not just simple fallback)
      if (analysis.analysisMethod === 'llm') {
        console.log('✅ LLM analysis successful');
        return analysis;
      }
      
      // If LLM engine fell back to its simple analysis, try our enhanced manual analysis
      if (analysis.analysisMethod === 'simple' || analysis.confidence < 0.6) {
        console.log('🛡️ LLM fell back to simple analysis, trying enhanced manual analysis...');
        
        const enhancedAnalysis = this.performEnhancedManualAnalysis(responses, demographics);
        
        // Compare confidence levels and use the better one
        if (enhancedAnalysis.confidence > analysis.confidence) {
          console.log('🎯 Enhanced manual analysis has higher confidence, using that');
          return enhancedAnalysis;
        }
      }
      
      console.log(`✅ Analysis completed using: ${analysis.analysisMethod || 'llm'}`);
      return analysis;
      
    } catch (error) {
      console.error('❌ Enhanced analysis failed completely:', error);
      
      // Last resort: try enhanced manual analysis directly
      try {
        console.log('🚨 Attempting enhanced manual analysis as emergency fallback...');
        return this.performEnhancedManualAnalysis(responses, demographics);
      } catch (manualError) {
        console.error('❌ Enhanced manual analysis also failed:', manualError);
        
        // Return minimal emergency fallback result
        return this.getEmergencyFallback();
      }
    }
  }

  performEnhancedManualAnalysis(responses, demographics) {
    const responseText = responses.map(r => r.response.toLowerCase()).join(' ');
    const traitScores = this.getDefaultTraitScores();
    
    console.log('🔧 Performing enhanced pattern analysis...');
    
    // Sophisticated behavioral pattern analysis
    this.analyzeControlPatterns(responseText, traitScores);
    this.analyzeEmotionalPatterns(responseText, traitScores);
    this.analyzeSocialPatterns(responseText, traitScores);
    this.analyzeManipulationPatterns(responseText, traitScores);
    this.analyzeBoundaryPatterns(responseText, traitScores);
    this.analyzeAttachmentPatterns(responseText, traitScores);
    this.analyzeCommunicationPatterns(responseText, traitScores);
     this.analyzeParentalSeekingPatterns(responseText, traitScores);
    this.analyzeEmotionalInvalidationPatterns(responseText, traitScores);
    this.analyzeFutureFakingPatterns(responseText, traitScores);
    this.analyzeNarcissisticPatterns(responseText, traitScores);
    
    // Calculate scenario scores
    const scenarioScores = this.calculateScenarioScores(traitScores);
    
    // Determine persona using sophisticated matching
    const persona = this.determinePersona(traitScores);
    
    // Assess risk level
    const riskLevel = this.assessRiskLevel(traitScores, scenarioScores);
    
    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(responseText, traitScores);
    
    return {
      persona: persona,
      traitScores: traitScores,
      scenarioScores: scenarioScores,
      riskLevel: riskLevel,
      analysisMethod: 'enhanced_manual',
      confidence: confidence,
      keyIndicators: this.extractKeyIndicators(responseText, traitScores),
      reasoning: 'Analysis based on enhanced behavioral pattern recognition'
    };
  }

  analyzeControlPatterns(text, scores) {
    const patterns = {
      extreme: ['makes all decisions', 'never asks my opinion', 'dictates everything', 'complete control'],
      high: ['decides for me', 'controls what i', 'tells me what to', 'won\'t let me', 'has to approve'],
      moderate: ['usually decides', 'prefers to choose', 'likes to be in charge', 'takes the lead'],
      low: ['sometimes controlling', 'occasionally bossy', 'can be demanding']
    };

    const extremeScore = this.countPatterns(text, patterns.extreme) * 3;
    const highScore = this.countPatterns(text, patterns.high) * 2;
    const moderateScore = this.countPatterns(text, patterns.moderate) * 1.5;
    const lowScore = this.countPatterns(text, patterns.low) * 1;

    const controlIntensity = Math.min(5, extremeScore + highScore + moderateScore + lowScore);
    
    scores.CTRL = Math.min(10, 5 + controlIntensity);
    scores.DOMN = Math.min(10, 5 + (controlIntensity * 0.8));
  }

  analyzeEmotionalPatterns(text, scores) {
    const empathyLackPatterns = {
      severe: ['doesn\'t care about my feelings', 'laughs at my pain', 'cruel when i cry'],
      high: ['dismisses my emotions', 'tells me i\'m overreacting', 'never comforts me'],
      moderate: ['doesn\'t understand my feelings', 'seems disconnected emotionally'],
      low: ['sometimes insensitive', 'not great with emotions']
    };

    const supportLackPatterns = {
      severe: ['sabotages my goals', 'actively discourages me', 'jealous of my success'],
      high: ['never supports my goals', 'puts down my achievements', 'minimizes my success'],
      moderate: ['lukewarm about my goals', 'doesn\'t celebrate with me'],
      low: ['could be more supportive', 'not very encouraging']
    };

    const empathyDeficit = this.calculatePatternScore(text, empathyLackPatterns);
    const supportDeficit = this.calculatePatternScore(text, supportLackPatterns);

    scores.EMPA = Math.max(0, 10 - empathyDeficit);
    scores.SUPR = Math.max(0, 10 - supportDeficit);
  }

  analyzeSocialPatterns(text, scores) {
    const isolationPatterns = {
      severe: ['forbids me from seeing friends', 'threatens to leave if i see family', 'cuts off my support'],
      high: ['keeps me from friends', 'doesn\'t like my family', 'jealous of my relationships'],
      moderate: ['prefers when it\'s just us', 'makes excuses why i can\'t go out'],
      low: ['sometimes jealous of friends', 'wants more alone time']
    };

    const charmPatterns = {
      manipulative: ['different person in public', 'everyone thinks he\'s perfect', 'charming but fake'],
      high: ['everyone loves him', 'so charming', 'people adore him'],
      moderate: ['pretty charming', 'good with people', 'socially skilled'],
      low: ['can be charming', 'people like him']
    };

    const isolationScore = this.calculatePatternScore(text, isolationPatterns);
    const charmScore = this.calculatePatternScore(text, charmPatterns);

    scores.ISOL = Math.min(10, isolationScore);
    scores.CHAR = Math.min(10, charmScore);
  }

  analyzeManipulationPatterns(text, scores) {
    const deceptionPatterns = {
      severe: ['gaslights me', 'makes me question reality', 'lies about everything'],
      high: ['lies to me', 'hides important things', 'denies what he said'],
      moderate: ['white lies', 'omits information', 'bends the truth'],
      low: ['sometimes dishonest', 'not always truthful']
    };

    const exploitationPatterns = {
      severe: ['uses me completely', 'parasitic relationship', 'takes everything'],
      high: ['uses me', 'takes advantage', 'one-sided relationship'],
      moderate: ['benefits more than me', 'sometimes selfish'],
      low: ['can be self-centered', 'not always fair']
    };

    scores.DECP = Math.min(10, this.calculatePatternScore(text, deceptionPatterns));
    scores.EXPL = Math.min(10, this.calculatePatternScore(text, exploitationPatterns));
  }

  analyzeBoundaryPatterns(text, scores) {
    const violationPatterns = {
      severe: ['violates all boundaries', 'ignores my no completely', 'forces me'],
      high: ['ignores my boundaries', 'doesn\'t respect no', 'pushes past limits'],
      moderate: ['sometimes crosses boundaries', 'doesn\'t always listen'],
      low: ['occasionally pushy', 'needs reminders about boundaries']
    };

    const violationScore = this.calculatePatternScore(text, violationPatterns);
    scores.BNDY = Math.max(0, 10 - violationScore);
  }

  analyzeAttachmentPatterns(text, scores) {
    const needinessPatterns = {
      severe: ['can\'t be alone', 'panics when i\'m away', 'obsessive need for attention'],
      high: ['constantly needs reassurance', 'very clingy', 'can\'t handle separation'],
      moderate: ['needs a lot of attention', 'somewhat clingy', 'insecure'],
      low: ['sometimes needy', 'wants reassurance']
    };

    const inconsistencyPatterns = {
      severe: ['completely unpredictable', 'extreme mood swings', 'jekyll and hyde'],
      high: ['very inconsistent', 'mood swings', 'hot and cold'],
      moderate: ['somewhat unpredictable', 'moody', 'inconsistent'],
      low: ['occasionally moody', 'sometimes inconsistent']
    };

    scores.NEED = Math.min(10, this.calculatePatternScore(text, needinessPatterns));
    scores.INCO = Math.min(10, this.calculatePatternScore(text, inconsistencyPatterns));
  }

  analyzeCommunicationPatterns(text, scores) {
    const conflictPatterns = {
      severe: ['explosive fights', 'screaming matches', 'violent arguments'],
      high: ['frequent fights', 'can\'t resolve conflicts', 'arguments escalate'],
      moderate: ['regular disagreements', 'some conflict', 'tension'],
      low: ['occasional arguments', 'minor disagreements']
    };

    const understandingPatterns = {
      high: ['really gets me', 'understands my perspective', 'sees my point'],
      moderate: ['tries to understand', 'usually gets it', 'makes an effort'],
      low: ['sometimes understands', 'not great at seeing my side'],
      poor: ['never understands', 'doesn\'t get me at all', 'completely clueless']
    };

    scores.CGFL = Math.min(10, this.calculatePatternScore(text, conflictPatterns));
    
    // Understanding is reverse scored (higher understanding = lower UNOX score)
    const understandingScore = this.calculatePatternScore(text, understandingPatterns);
    scores.UNOX = Math.max(0, 10 - understandingScore);
  }

  analyzeParentalSeekingPatterns(text, scores) {
    const parentalSeekingPatterns = {
      severe: [
        'like dating a child', 'feel like his mom', 'more like a parent', 
        'he can\'t function without me', 'I have to do everything', 'dating someone who needs me to be his mom'
      ],
      high: [
        'asks for my advice on everything', 'needs me to make decisions', 
        'can\'t handle basic tasks', 'relies on me completely', 'life coach',
        'constantly asks for my advice', 'exhausted from being the only adult'
      ],
      moderate: [
        'always asking what to do', 'needs guidance', 'depends on me',
        'I have to manage', 'he just waits for me to decide', 'whatever you want is fine'
      ],
      low: [
        'sometimes needs help', 'looks to me for decisions', 'asks for advice'
      ]
    };

    const clingyPatterns = {
      severe: [
        'follows me around', 'can\'t be alone', 'constantly texting',
        'freaks out when I leave', 'needs constant attention'
      ],
      high: [
        'gets weird and clingy', 'what am I supposed to do', 'how long will you be',
        'tries to invite himself', 'needs constant updates', 'gets all weird and clingy'
      ],
      moderate: [
        'wants to come along', 'gets anxious when apart', 'checks in often'
      ]
    };

    const dependencyPatterns = {
      severe: [
        'can\'t make any decisions', 'would fall apart without me', 
        'no sense of boundaries', 'like a little kid'
      ],
      high: [
        'just agrees with everything', 'whatever you want', 'you know best',
        'asks permission for everything', 'needs my approval', 'i don\'t care you pick'
      ]
    };

    const parentalScore = this.calculatePatternScore(text, parentalSeekingPatterns);
    const clingyScore = this.calculatePatternScore(text, clingyPatterns);
    const dependencyScore = this.calculatePatternScore(text, dependencyPatterns);

    // Adjust scores based on detected patterns
    scores.NEED = Math.min(10, 5 + (parentalScore * 1.2)); // High neediness
    scores.ATCH = Math.min(10, 5 + (clingyScore * 1.0));    // Clingy attachment
    scores.VALS = Math.min(10, 5 + (dependencyScore * 1.0)); // Seeks validation
    
    // Lower scores for traits they lack
    scores.ACCO = Math.max(0, 5 - (parentalScore * 1.0));   // Low accountability
    scores.DOMN = Math.max(0, 5 - (dependencyScore * 1.2)); // Low dominance
    scores.IMPL = Math.max(0, 5 - (parentalScore * 0.8));   // Low impulse control

    console.log(`🍼 Parental seeking patterns: ${parentalScore}, Clingy: ${clingyScore}, Dependency: ${dependencyScore}`);
  }

  analyzeEmotionalInvalidationPatterns(text, scores) {
    const invalidationPatterns = {
      severe: [
        'dismisses my feelings', 'tells me i\'m overreacting', 'your feelings don\'t matter',
        'makes me feel crazy', 'gaslights my emotions'
      ],
      high: [
        'never validates my emotions', 'minimizes my feelings', 'acts like i\'m being dramatic',
        'rolls eyes when i\'m upset', 'changes subject when i share feelings'
      ],
      moderate: [
        'doesn\'t seem to understand my emotions', 'uncomfortable with feelings',
        'tries to fix instead of listen'
      ]
    };

    const invalidationScore = this.calculatePatternScore(text, invalidationPatterns);
    
    scores.EMPA = Math.max(0, 10 - (invalidationScore * 1.5)); // Low empathy
    scores.SUPR = Math.max(0, 10 - (invalidationScore * 1.2)); // Low support
    scores.DECP = Math.min(10, 5 + (invalidationScore * 0.8)); // May involve deception
  }

  analyzeFutureFakingPatterns(text, scores) {
    const futureFakingPatterns = {
      severe: [
        'promises things that never happen', 'always says we\'ll do something someday',
        'talks about future but no action', 'empty promises'
      ],
      high: [
        'makes plans that fall through', 'says we\'ll travel but never book',
        'promises to change but doesn\'t', 'all talk no action'
      ]
    };

    const futureFakingScore = this.calculatePatternScore(text, futureFakingPatterns);
    
    scores.CHAR = Math.min(10, 5 + (futureFakingScore * 1.0)); // Uses charm
    scores.SEEK = Math.min(10, 5 + (futureFakingScore * 0.8)); // Attention seeking
    scores.ACCO = Math.max(0, 10 - (futureFakingScore * 1.2)); // Low accountability
  }

  analyzeNarcissisticPatterns(text, scores) {
    const narcissisticPatterns = {
      severe: [
        'everything is about them', 'never asks about my day', 'self-obsessed',
        'thinks they\'re superior', 'entitled behavior'
      ],
      high: [
        'makes everything about themselves', 'interrupts my stories', 'one-ups everything',
        'needs to be center of attention', 'shows off constantly'
      ]
    };

    const narcissisticScore = this.calculatePatternScore(text, narcissisticPatterns);
    
    scores.VALS = Math.min(10, 5 + (narcissisticScore * 1.2)); // Validation seeking
    scores.EMOX = Math.min(10, 5 + (narcissisticScore * 1.0)); // Emotional expression
    scores.EMPA = Math.max(0, 10 - (narcissisticScore * 1.5)); // Low empathy
    scores.GRAN = Math.min(10, 5 + (narcissisticScore * 1.3)); // Grandiosity
  }

  calculatePatternScore(text, patterns) {
    let score = 0;
    if (patterns.severe) score += this.countPatterns(text, patterns.severe) * 4;
    if (patterns.high) score += this.countPatterns(text, patterns.high) * 3;
    if (patterns.moderate) score += this.countPatterns(text, patterns.moderate) * 2;
    if (patterns.low) score += this.countPatterns(text, patterns.low) * 1;
    return Math.min(10, score);
  }

  countPatterns(text, patterns) {
    return patterns.reduce((count, pattern) => {
      return count + (text.includes(pattern) ? 1 : 0);
    }, 0);
  }

  calculateScenarioScores(traitScores) {
    return {
      'Decision-Making Dynamics': Math.min(100, ((traitScores.DOMN * 0.6) + (traitScores.CTRL * 0.4)) * 10),
      'Conflict Resolution Patterns': Math.min(100, ((traitScores.CGFL * 0.4) + ((10 - traitScores.EMPA) * 0.3) + ((10 - traitScores.ACCO) * 0.3)) * 10),
      'Social Connection Control': Math.min(100, ((traitScores.CTRL * 0.5) + (traitScores.ISOL * 0.5)) * 10),
      'Emotional Support Quality': Math.min(100, (((10 - traitScores.EMPA) * 0.6) + (traitScores.EXPL * 0.4)) * 10),
      'Boundary Respect': Math.min(100, (((10 - traitScores.BNDY) * 0.6) + (traitScores.CTRL * 0.4)) * 10)
    };
  }

  determinePersona(traitScores) {
  // Use the corrected persona patterns
  const personaPatterns = {
    'The Puppet Master': { 
      high: ['INTN', 'DECP', 'EMOX'], 
      low: ['SNSE', 'DISP', 'ACCO'] 
    },
    'The Intimidator': { 
      high: ['ATCH', 'BNDY', 'DOMN'], 
      low: ['HYPL', 'EMPA', 'NEED'] 
    },
    'The Self-Obsessed': { 
      high: ['GRAN', 'VALS', 'CHAR'], 
      low: ['ISOL', 'EMPA', 'ACCO'] 
    },
    'The Drill Sergeant': { 
      high: ['CTRL', 'DOMN', 'SNSE'], 
      low: ['NEED', 'EMOX', 'HYPL'] 
    },
    'The Suspicious Strategist': { 
      high: ['ISOL', 'CNFL', 'DYRG'], 
      low: ['TRST', 'CHAR', 'HYPL'] 
    },
    'Master of Everything': { 
      high: ['DOMN', 'CNFL', 'DISP'], 
      low: ['ENSH', 'NEED', 'ACCO'] 
    },
    'The Subtle Saboteur': { 
      high: ['DISP', 'INCO', 'CTRL'], 
      low: ['DYRG', 'CNFL', 'ACCO'] 
    },
    'The Clinger': { 
      high: ['ENSH', 'DYRG', 'ATCH'], 
      low: ['SNSE', 'DISP', 'GRAN'] 
    },
    'The Addict': { 
      high: ['DYRG', 'IMPL', 'INCO'], 
      low: ['SNSE', 'CTRL', 'HYPL'] 
    },
    'The Parental Seeker': { 
      high: ['DYRG', 'CHAR', 'ATCH'], 
      low: ['CTRL', 'PERS', 'EMPA'] // Added EMPA as third low trait
    },
    'The Future Faker': { 
      high: ['DECP', 'INCO', 'CHAR'], 
      low: ['ACCO', 'PERS', 'EMPA'] 
    },
    'The Freewheeler': { 
      high: ['IMPL', 'EMOX', 'SEEK'], 
      low: ['CTRL', 'DOMN', 'HYPL'] 
    },
    'The Thinker': { 
      high: ['HYPL', 'PERS', 'TRST'], 
      low: ['IMPL', 'CHAR', 'SEEK'] 
    },
    'Emotional Invalidator': { 
      high: ['DISP', 'CTRL', 'INCO'], 
      low: ['HYPL', 'SEEK', 'EMPA'] 
    },
    'The Emotionally Distant': { 
      high: ['INCO', 'SUPR', 'DISP'], 
      low: ['ENSH', 'DYRG', 'ATCH'] 
    },
    'The Rake': { 
      high: ['CHAR', 'SEEK', 'INTN'], 
      low: ['ATCH', 'DISP', 'SNSE'] 
    },
    'The Perpetual Victim': { 
      high: ['VALS', 'INCO', 'EMOX'], 
      low: ['ACCO', 'EMPA', 'CTRL'] 
    }
  };

  let bestMatch = 'The Clinger';
  let highestScore = 0;

    Object.entries(personaPatterns).forEach(([name, pattern]) => {
    const score = this.calculatePersonaMatch(traitScores, pattern);
    console.log(`Persona ${name}: score ${score}`); // Debug logging
    if (score > highestScore) {
      highestScore = score;
      bestMatch = name;
    }
  });

  console.log(`Best match: ${bestMatch} with score ${highestScore}`);
  return bestMatch;
}

  calculatePersonaMatch(traitScores, pattern) {
    let score = 0;
    const totalTraits = pattern.high.length + pattern.low.length;

    // Check high traits (should be > 6 for strong match)
    pattern.high.forEach(trait => {
      if (traitScores[trait] > 6) {
        score += (traitScores[trait] - 6) / 4;
      }
    });

    // Check low traits (should be < 4 for strong match)  
    pattern.low.forEach(trait => {
      if (traitScores[trait] < 4) {
        score += (4 - traitScores[trait]) / 4;
      }
    });

    return score / totalTraits;
  }

  assessRiskLevel(traitScores, scenarioScores) {
    const avgScenarioScore = Object.values(scenarioScores).reduce((a, b) => a + b, 0) / Object.values(scenarioScores).length;
    
    // Check for high-risk trait combinations
    const highRiskTraits = ['CTRL', 'DECP', 'EXPL', 'DOMN'];
    const highRiskScore = highRiskTraits.reduce((sum, trait) => sum + traitScores[trait], 0) / highRiskTraits.length;
    
    if (avgScenarioScore > 80 || highRiskScore > 8) return 'high';
    if (avgScenarioScore > 60 || highRiskScore > 6.5) return 'medium';
    return 'low';
  }

  calculateConfidence(responseText, traitScores) {
    // Base confidence on response length and pattern matches
    const responseLength = responseText.length;
    const lengthFactor = Math.min(1, responseLength / 1000); // Longer responses = higher confidence
    
    // Count total pattern matches across all analyses
    const patternMatches = this.countTotalPatternMatches(responseText);
    const patternFactor = Math.min(1, patternMatches / 10); // More matches = higher confidence
    
    // Factor in extreme scores (very high or very low scores indicate clear patterns)
    const extremeScores = Object.values(traitScores).filter(score => score < 3 || score > 7).length;
    const extremeFactor = Math.min(1, extremeScores / 14); // More extreme scores = higher confidence
    
    const confidence = (lengthFactor * 0.3) + (patternFactor * 0.5) + (extremeFactor * 0.2);
    return Math.max(0.4, Math.min(0.9, confidence)); // Keep confidence between 0.4 and 0.9
  }

  countTotalPatternMatches(text) {
    // This is a simplified count - in reality, you'd sum up all the pattern matches
    // from all the analysis methods
    const commonPatterns = [
      'controls', 'decides', 'tells me', 'doesn\'t let', 'forces', 'manipulates',
      'lies', 'hides', 'gaslights', 'isolates', 'jealous', 'possessive',
      'angry', 'violent', 'threatens', 'intimidates', 'dismisses', 'ignores'
    ];
    
    return commonPatterns.reduce((count, pattern) => {
      return count + (text.includes(pattern) ? 1 : 0);
    }, 0);
  }

  extractKeyIndicators(responseText, traitScores) {
    const indicators = [];
    
    // Add indicators based on high trait scores
    if (traitScores.CTRL > 7) indicators.push('High levels of controlling behavior detected');
    if (traitScores.DECP > 7) indicators.push('Significant deception and manipulation patterns');
    if (traitScores.ISOL > 7) indicators.push('Isolation from support systems identified');
    if (traitScores.EMPA < 3) indicators.push('Low empathy and emotional understanding');
    if (traitScores.BNDY < 3) indicators.push('Poor boundary respect and violations');
    
    return indicators.length > 0 ? indicators : ['Relationship patterns analyzed based on responses'];
  }

  buildConversationHistory(responses) {
    return responses.map(r => ({
      question: r.questionText,
      response: r.response,
      timestamp: r.timestamp
    }));
  }

  getDefaultTraitScores() {
    return {
      DOMN: 5, EXPL: 5, EMPA: 5, CTRL: 5, DECP: 5, BNDY: 5, ISOL: 5, ACCO: 5,
      CHAR: 5, GRAN: 5, CNFL: 5, IMPL: 5, NEED: 5, INCO: 5, VALS: 5, DISP: 5,
      SUPR: 5, TRST: 5, INTN: 5, SNSE: 5, SEEK: 5, PERS: 5, CGFL: 5, EMOX: 5,
      UNOX: 5, ATCH: 5, DYRG: 5, ENSH: 5
    };
  }

  getDefaultScenarioScores() {
    return {
      'Decision-Making Dynamics': 50,
      'Conflict Resolution Patterns': 50,
      'Social Connection Control': 50,
      'Emotional Support Quality': 50,
      'Boundary Respect': 50
    };
  }

  getEmergencyFallback() {
    return {
      persona: 'The Clinger',
      traitScores: this.getDefaultTraitScores(),
      scenarioScores: this.getDefaultScenarioScores(),
      riskLevel: 'medium',
      analysisMethod: 'emergency_fallback',
      confidence: 0.3,
      keyIndicators: ['Analysis system unavailable'],
      reasoning: 'System encountered an error during analysis'
    };
  }

  initializeEnhancedPatterns() {
    return {
      initialized: true,
      version: '2.0',
      patternCount: 150 // Approximate number of behavioral patterns
    };
  }

  // Method to test LLM connectivity
  async testLLMConnections() {
    return await this.llmEngine.testConnections();
  }
}
// =============================================================================
// SECTION 9:RESULTS GENERATOR
// =============================================================================


class EnhancedResultsGenerator {
  constructor() {
    this.analysisEngine = new EnhancedAnalysisEngine();
  }

  async generateResults(session) {
    try {
      console.log(`📊 Generating enhanced results for session ${session.id}`);
      
      // Perform comprehensive analysis
      const analysis = await this.analysisEngine.analyzeResponses(
        session.responses, 
        session.demographics
      );
      
      // Generate all result components
      const persona = this.getPersonaData(analysis.persona);
      const characters = this.getCharacterReferences(analysis.persona, session.demographics);
      const scenarioAnalysis = this.generateScenarioAnalysis(analysis.scenarioScores);
      const riskAssessment = this.generateRiskAssessment(analysis);
      const encouragement = this.generateEncouragement(analysis.riskLevel);
      const gentleAdvice = this.generateGentleAdvice(session.demographics, analysis);
      const supportResources = this.getSupportResources(session.demographics.region);
      const disclaimer = this.generateDisclaimer();

      return {
        persona: persona,
        characters: characters,
        scenarioAnalysis: scenarioAnalysis,
        riskAssessment: riskAssessment,
        traitScores: analysis.traitScores,
        confidence: analysis.confidence,
        keyIndicators: analysis.keyIndicators,
        reasoning: analysis.reasoning,
        analysisMethod: analysis.analysisMethod,
        encouragement: encouragement,
        gentleAdvice: gentleAdvice,
        supportResources: supportResources,
        disclaimer: disclaimer,
        behavioralEvidence: analysis.behavioralEvidence || {},
        metadata: {
          sessionId: session.id,
          generatedAt: new Date(),
          analysisVersion: '3.0',
          totalResponses: session.responses.length,
          demographics: session.demographics
        }
      };
      
    } catch (error) {
      console.error('❌ Error generating enhanced results:', error);
      return this.generateFallbackResults(session);
    }
  }

  getPersonaData(personaName) {
    const persona = PERSONAS[personaName] || PERSONAS['The Clinger'];
    
    // Validate persona has required properties
    const requiredProps = ['title', 'greeting', 'empathyOpener', 'mainMessage', 'caring', 'worry', 'riskLevel'];
    const isValid = requiredProps.every(prop => persona[prop]);
    
    if (!isValid) {
      console.warn(`⚠️ Persona ${personaName} missing required properties, using fallback`);
      return PERSONAS['The Clinger'];
    }
    
    return persona;
  }

  getCharacterReferences(personaName, demographics) {
    try {
      const region = demographics.region || 'north-america';
      const gender = demographics.gender || 'female';
      const ageGroup = this.getAgeCategory(demographics.ageGroup);

      console.log(`🎭 Finding character references: ${personaName}, ${region}, ${gender}, ${ageGroup}`);

      // Check if region and persona exist
      if (!CHARACTER_REFERENCES[region]) {
        console.log(`Region ${region} not found, using north-america`);
        return this.findCharactersInRegion('north-america', personaName, gender, ageGroup);
      }

      const regionData = CHARACTER_REFERENCES[region];
      if (!regionData[personaName]) {
        console.log(`Persona ${personaName} not found in ${region}, checking other regions`);
        
        // Try other regions
        for (const [altRegion, altData] of Object.entries(CHARACTER_REFERENCES)) {
          if (altData[personaName]) {
            console.log(`Found ${personaName} in ${altRegion}`);
            return this.extractCharactersFromPersonaData(altData[personaName], gender, ageGroup);
          }
        }
        
        console.log(`Persona ${personaName} not found in any region`);
        return [];
      }

      return this.extractCharactersFromPersonaData(regionData[personaName], gender, ageGroup);
      
    } catch (error) {
      console.error('❌ Error getting character references:', error);
      return [];
    }
  }

  findCharactersInRegion(region, personaName, gender, ageGroup) {
    try {
      const regionData = CHARACTER_REFERENCES[region];
      if (regionData && regionData[personaName]) {
        return this.extractCharactersFromPersonaData(regionData[personaName], gender, ageGroup);
      }
      return [];
    } catch (error) {
      console.error(`Error finding characters in ${region}:`, error);
      return [];
    }
  }

  extractCharactersFromPersonaData(personaData, gender, ageGroup) {
    try {
      if (!personaData || typeof personaData !== 'object') {
        return [];
      }

      // Try preferred gender first, then fallback
      const genderData = personaData[gender] || personaData['female'] || personaData['male'] || {};
      
      if (!genderData || typeof genderData !== 'object') {
        return [];
      }

      // Try preferred age group first, then fallback to available ages
      const characters = genderData[ageGroup] || 
                        genderData['25-34'] || 
                        genderData['18-24'] || 
                        genderData['35+'] || 
                        [];
      
      console.log(`Found ${characters.length} characters for ${gender} ${ageGroup}`);
      return Array.isArray(characters) ? characters.slice(0, 3) : [];
      
    } catch (error) {
      console.error('Error extracting characters from persona data:', error);
      return [];
    }
  }

  getAgeCategory(ageGroup) {
    if (!ageGroup) return '25-34';
    if (ageGroup === '18-24') return '18-24';
    if (['25-34', '35-44'].includes(ageGroup)) return '25-34';
    return '35+';
  }

  generateScenarioAnalysis(scenarioScores) {
    const analysis = {};
    
    Object.entries(scenarioScores).forEach(([scenarioName, score]) => {
      const scenario = SCENARIO_ANALYSIS[scenarioName];
      if (!scenario) {
        console.warn(`⚠️ Scenario ${scenarioName} not found in SCENARIO_ANALYSIS`);
        return;
      }

      const level = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
      const levelData = scenario.levels[level];
      
      if (!levelData) {
        console.warn(`⚠️ Level ${level} not found for scenario ${scenarioName}`);
        return;
      }
      
      analysis[scenarioName] = {
        score: Math.round(score),
        friendlyName: scenario.friendlyName,
        level: levelData.label,
        description: levelData.description,
        advice: levelData.advice,
        emoji: levelData.emoji,
        icon: scenario.icon,
        severity: levelData.severity
      };
    });
    
    return analysis;
  }

  generateRiskAssessment(analysis) {
    const riskLevel = analysis.riskLevel || 'medium';
    const keyIndicators = analysis.keyIndicators || [];
    
    const riskMessages = {
      high: {
        level: 'High Concern',
        message: 'Some patterns suggest potentially harmful dynamics. Please consider reaching out for professional support or trusted friends.',
        emoji: '🚨',
        priority: 'immediate',
        urgency: 'high'
      },
      medium: {
        level: 'Some Concerns', 
        message: 'There are some patterns worth paying attention to. Trust your instincts about your relationship.',
        emoji: '⚠️',
        priority: 'moderate',
        urgency: 'moderate'
      },
      low: {
        level: 'Lower Concern',
        message: 'The patterns seem generally healthy, though every relationship has room for growth.',
        emoji: '💚',
        priority: 'monitoring',
        urgency: 'low'
      }
    };

    const assessment = riskMessages[riskLevel] || riskMessages.medium;

    return {
      ...assessment,
      indicators: keyIndicators,
      confidence: analysis.confidence || 0.5,
      analysisMethod: analysis.analysisMethod || 'enhanced',
      recommendedActions: this.generateRecommendedActions(riskLevel, keyIndicators)
    };
  }

  generateRecommendedActions(riskLevel, indicators) {
    const actions = {
      high: [
        'Consider talking to a trusted friend, family member, or counselor',
        'Document concerning behaviors and patterns',
        'Identify your support network and safe people to talk to',
        'Trust your instincts - they brought you here for a reason'
      ],
      medium: [
        'Pay attention to these patterns and how they make you feel',
        'Consider discussing these concerns with your partner',
        'Maintain connections with friends and family',
        'Set and maintain healthy boundaries'
      ],
      low: [
        'Continue nurturing the positive aspects of your relationship',
        'Keep communication open with your partner',
        'Maintain your individual interests and friendships',
        'Regular relationship check-ins can be helpful'
      ]
    };

    return actions[riskLevel] || actions.medium;
  }

  generateEncouragement(riskLevel) {
    const encouragements = {
      high: {
        main: "You're Not Crazy 🧠",
        message: "Everything you're feeling? Valid. Every weird interaction that made you uncomfortable? Trust that feeling. Your instincts brought you here, and they're trying to protect you.",
        strength: "You're stronger than you know, braver than you feel, and worthy of so much more respect and love. 💕"
      },
      medium: {
        main: "Trust Your Instincts 🎯",
        message: "You took this assessment for a reason. Something inside you is paying attention to these patterns. That awareness is actually a superpower.",
        strength: "You deserve relationships that make you feel safe, heard, and valued. Don't let anyone convince you otherwise. 💪"
      },
      low: {
        main: "You're Being Thoughtful 💭",
        message: "Taking time to reflect on your relationship shows emotional intelligence and care for yourself and your partner.",
        strength: "Keep nurturing that self-awareness - it's the foundation of healthy relationships. 🌱"
      }
    };

    return encouragements[riskLevel] || encouragements.medium;
  }

  generateGentleAdvice(demographics, analysis) {
    const ageGroup = demographics.ageGroup || '25-34';
    const relationshipStatus = demographics.relationshipStatus || 'dating';
    const riskLevel = analysis.riskLevel || 'medium';
    
    // Age and context-appropriate advice
    const adviceTemplates = {
      high: {
        young: "Honey, what you're describing raises some red flags. You're young and have so much life ahead of you - you deserve someone who builds you up, not tears you down.",
        mature: "These patterns can be really draining and aren't healthy for any relationship. You have the wisdom and experience to know something isn't right.",
        general: "Trust that voice in your head that made you take this assessment. Your instincts are trying to tell you something important."
      },
      medium: {
        young: "Some of these patterns are worth keeping an eye on. You're learning what you want in relationships - don't settle for less than mutual respect.",
        mature: "You know what healthy relationships look like, and these patterns don't quite fit that mold. It's okay to have standards and expectations.",
        general: "Consider having an open conversation about these dynamics - see how your partner responds to your concerns."
      },
      low: {
        young: "Your relationship seems to have a pretty solid foundation! Keep nurturing those positive patterns while staying aware of your own needs.",
        mature: "It sounds like you've built something healthy together. Keep communicating and supporting each other's growth.",
        general: "It's great that you're being thoughtful about your relationship dynamics. That awareness is so valuable."
      }
    };

    const ageCategory = ['18-24'].includes(ageGroup) ? 'young' : 
                      ['45-54', '55+'].includes(ageGroup) ? 'mature' : 'general';
    
    const advice = adviceTemplates[riskLevel][ageCategory];
    
    return {
      main: advice,
      followUp: "Remember: you know your situation better than anyone. Trust yourself, and don't hesitate to seek support if you need it. 💕",
      contextual: this.getContextualAdvice(relationshipStatus, riskLevel)
    };
  }

  getContextualAdvice(relationshipStatus, riskLevel) {
    const contextAdvice = {
      'dating': 'Early relationships are when patterns establish themselves. Pay attention to how they treat you now.',
      'living-together': 'Living together reveals a lot about compatibility and respect. Notice how they handle shared spaces and decisions.',
      'engaged': 'Engagement is a time to really evaluate if these patterns work for a lifetime together.',
      'married': 'Marriage is about growing together while maintaining your individual selves.',
      'considering-leaving': 'That you\'re considering leaving suggests your needs aren\'t being met. Trust those feelings.'
    };

    return contextAdvice[relationshipStatus] || 'Every relationship stage brings its own challenges and opportunities for growth.';
  }

  getSupportResources(region = 'north-america') {
    const baseResources = [
      {
        name: "National Domestic Violence Hotline",
        contact: "1-800-799-7233 (24/7)",
        description: "Confidential support from people who understand 💕",
        note: "They have chat and text options too if calling feels scary",
        type: "crisis"
      },
      {
        name: "Crisis Text Line", 
        contact: "Text HOME to 741741",
        description: "24/7 support via text - sometimes typing feels easier than talking 📱",
        note: "Great for when you need immediate support but can't make a phone call",
        type: "crisis"
      },
      {
        name: "Love is Respect",
        contact: "loveisrespect.org or Text LOVEIS to 22522",
        description: "Specifically for people dealing with relationship concerns 🤗",
        note: "They have a chat feature and tons of resources for all ages",
        type: "relationship"
      }
    ];

    // Add region-specific resources
    const regionalResources = {
      'europe': [
        {
          name: "European Women's Helpline",
          contact: "116 006",
          description: "Free support line available in multiple languages",
          type: "crisis"
        }
      ],
      'asia': [
        {
          name: "Asian Mental Health Support",
          contact: "Various by country - search 'domestic violence helpline [your country]'",
          description: "Support services available across Asian countries",
          type: "regional"
        }
      ]
    };

    const resources = [...baseResources];
    if (regionalResources[region]) {
      resources.push(...regionalResources[region]);
    }

    return resources;
  }

  generateDisclaimer() {
    return {
      main: "One last hug, sweetie... 💕",
      message: "Listen, I want you to know something: you reaching out, taking this assessment, asking these questions - that takes courage. You're already being braver than you know.",
      reality: "Maybe this resonates completely, maybe it doesn't. Maybe you're not ready to hear some of this yet, and that's okay too. Healing isn't linear, and neither is recognizing unhealthy patterns.",
      gentle: "Just... please be gentle with yourself. You're doing the best you can with what you know right now. And now you know a little more. 🤗",
      disclaimer: "Remember: this reflection is based on our conversation and what you shared. It might not capture everything about your unique situation, and that's okay. Trust your gut, talk to people you love, and don't be afraid to ask for help.",
      closing: "You've got this, babe. Even when it doesn't feel like it. 💪💕",
      signature: "💕 Sending you love and strength, Your Assessment Friend 🤗",
      ps: "P.S. - Seriously, reach out to someone if you need to talk. You're not alone in this. 📱💕",
      professional: "This assessment is for educational and reflection purposes only and is not a substitute for professional counseling, therapy, or medical advice."
    };
  }

  generateFallbackResults(session) {
    console.log(`⚠️ Generating fallback results for session ${session.id}`);
    
    return {
      persona: PERSONAS['The Clinger'],
      characters: [],
      scenarioAnalysis: this.generateScenarioAnalysis(this.getDefaultScenarioScores()),
      riskAssessment: {
        level: 'Analysis Unavailable',
        message: 'We encountered an issue with the analysis, but your responses are still valuable for reflection.',
        emoji: '💭',
        priority: 'seek_support',
        urgency: 'moderate',
        indicators: ['Analysis system temporarily unavailable'],
        confidence: 0.3
      },
      analysisMethod: 'fallback',
      confidence: 0.3,
      keyIndicators: ['System unavailable - please consider seeking professional guidance'],
      encouragement: this.generateEncouragement('medium'),
      gentleAdvice: {
        main: "Even though our analysis system had a hiccup, the fact that you're here asking these questions shows incredible self-awareness.",
        followUp: "Trust your instincts about your relationship, and consider talking to someone you trust. 💕"
      },
      supportResources: this.getSupportResources(),
      disclaimer: this.generateDisclaimer(),
      metadata: {
        sessionId: session.id,
        generatedAt: new Date(),
        analysisVersion: 'fallback',
        error: 'Analysis system unavailable'
      }
    };
  }

  getDefaultScenarioScores() {
    return {
      'Decision-Making Dynamics': 50,
      'Conflict Resolution Patterns': 50,
      'Social Connection Control': 50,
      'Emotional Support Quality': 50,
      'Boundary Respect': 50,
      'Emotional Regulation': 50,
      'Trust and Honesty': 50
    };
  }

  // Validation methods
  validatePersona(persona) {
    const requiredProps = ['title', 'greeting', 'empathyOpener', 'mainMessage', 'caring', 'worry', 'riskLevel'];
    
    for (const prop of requiredProps) {
      if (!persona[prop]) {
        console.warn(`Missing required property '${prop}' in persona`);
        return false;
      }
    }
    return true;
  }

  validateAnalysis(analysis) {
    const requiredProps = ['persona', 'traitScores', 'riskLevel'];
    
    for (const prop of requiredProps) {
      if (!analysis[prop]) {
        console.warn(`Missing required property '${prop}' in analysis`);
        return false;
      }
    }
    return true;
  }
}



// =============================================================================
// SECTION 11: API ROUTES (Enhanced Version)
// =============================================================================

// =============================================================================
// ENHANCED API ROUTES - ADD ALL OF THESE TO YOUR server.js
// =============================================================================

// First, create the enhanced results generator
// Initialize the enhanced results generator
const enhancedResultsGenerator = new EnhancedResultsGenerator();

// =============================================================================
// HEALTH & STATUS ENDPOINTS
// =============================================================================

// Enhanced health check with comprehensive system status
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test LLM connections
    let llmStatus = { openai: { available: false }, claude: { available: false }, fallback: { available: true } };
    try {
      const engine = new EnhancedAnalysisEngine();
      llmStatus = await engine.testLLMConnections();
    } catch (error) {
      console.warn('⚠️ LLM status check failed:', error.message);
    }
    
    // System metrics
    const sessionStats = getSessionStats();
    const responseTime = Date.now() - startTime;
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      responseTime: responseTime,
      version: '3.0.0',
      sessions: {
        active: sessions.size,
        stats: sessionStats
      },
      capabilities: {
        llm: {
          openai: llmStatus.openai?.available || false,
          claude: llmStatus.claude?.available || false,
          enhanced_manual: true,
          emergency_fallback: true
        },
        analysis: {
          primary: llmStatus.openai?.available ? 'OpenAI GPT-4' : 
                   llmStatus.claude?.available ? 'Claude' : 
                   'Enhanced Manual',
          fallback_available: true,
          confidence_scoring: true,
          comprehensive_traits: true
        }
      },
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        node_version: process.version
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      fallback_available: true
    });
  }
});

// LLM analysis capabilities status
app.get('/api/analysis/status', async (req, res) => {
  try {
    const engine = new EnhancedAnalysisEngine();
    const connectionStatus = await engine.testLLMConnections();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      llm_status: connectionStatus,
      capabilities: {
        openai_available: !!process.env.OPENAI_API_KEY && connectionStatus.openai?.available,
        claude_available: !!process.env.ANTHROPIC_API_KEY && connectionStatus.claude?.available,
        enhanced_manual_available: true,
        emergency_fallback_available: true
      },
      recommended_analysis: connectionStatus.openai?.available ? 'OpenAI GPT-4' : 
                           connectionStatus.claude?.available ? 'Claude 3' : 
                           'Enhanced Manual Analysis',
      analysis_methods: {
        llm: connectionStatus.openai?.available || connectionStatus.claude?.available,
        enhanced_manual: true,
        pattern_recognition: true,
        trait_scoring: true,
        persona_matching: true,
        risk_assessment: true
      }
    });
  } catch (error) {
    console.error('❌ Analysis status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check analysis status',
      fallback_available: true,
      enhanced_manual_available: true
    });
  }
});

// System statistics endpoint
app.get('/api/stats', (req, res) => {
  try {
    const sessionStats = getSessionStats();
    const systemStats = {
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      sessions: sessionStats,
      analysis: {
        total_personas: Object.keys(PERSONAS).length,
        total_traits: 28,
        total_scenarios: Object.keys(SCENARIO_ANALYSIS).length,
        demographic_options: Object.keys(DEMOGRAPHIC_OPTIONS).length,
        questions: QUESTION_BANK.length
      }
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: systemStats
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

// =============================================================================
// ASSESSMENT LIFECYCLE ENDPOINTS
// =============================================================================

// Start new assessment session
app.post('/api/assessment/start', (req, res) => {
  try {
    const sessionId = 'assess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = new AssessmentSession(sessionId);
    
    // Set metadata
    session.setMetadata('userAgent', req.get('User-Agent'));
    session.setMetadata('ipAddress', req.ip);
    session.setMetadata('startTime', new Date());
    
    sessions.set(sessionId, session);
    console.log(`🆕 New assessment started: ${sessionId}`);

    res.json({
      success: true,
      sessionId: sessionId,
      stage: 'demographics',
      message: 'Assessment session created successfully',
      demographicOptions: DEMOGRAPHIC_OPTIONS,
      instructions: {
        step: 1,
        title: 'Tell us about yourself',
        description: 'This helps us provide more relevant insights for your situation'
      }
    });
  } catch (error) {
    console.error('❌ Start session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start assessment session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Submit demographics information
app.post('/api/assessment/demographics', (req, res) => {
  try {
    const { sessionId, demographics } = req.body;

    // Validation
    if (!sessionId || !demographics) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sessionId and demographics are required' 
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found or expired',
        action: 'Please start a new assessment'
      });
    }

    // Validate required demographic fields
    const requiredFields = ['ageGroup', 'gender', 'region', 'relationshipStatus'];
    const missingFields = requiredFields.filter(field => !demographics[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required demographic information',
        missing_fields: missingFields,
        required_fields: requiredFields
      });
    }

    // Validate field values
    const invalidFields = [];
    Object.entries(demographics).forEach(([field, value]) => {
      if (DEMOGRAPHIC_OPTIONS[field] && !DEMOGRAPHIC_OPTIONS[field][value]) {
        invalidFields.push({ field, value, valid_options: Object.keys(DEMOGRAPHIC_OPTIONS[field]) });
      }
    });

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid demographic values',
        invalid_fields: invalidFields
      });
    }

    // Save demographics
    session.setDemographics(demographics);
    console.log(`👤 Demographics saved for ${sessionId}:`, demographics);

    // Get first question
    const firstQuestion = QUESTION_BANK[0];

    res.json({
      success: true,
      stage: 'assessment',
      question: firstQuestion,
      progress: {
        questionsTotal: QUESTION_BANK.length,
        questionsRemaining: QUESTION_BANK.length,
        percentComplete: 0
      },
      instructions: {
        step: 2,
        title: 'Share your experience',
        description: 'Please answer honestly about your relationship. There are no right or wrong answers.'
      },
      introMessage: `Thank you for sharing that information with me. Now I'd like to understand your relationship dynamics better. Please take your time and answer as honestly as you feel comfortable.`
    });
  } catch (error) {
    console.error('❌ Demographics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process demographics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Submit response and get next question
app.post('/api/assessment/respond', (req, res) => {
  try {
    const { sessionId, questionId, response } = req.body;

    // Validation
    if (!sessionId || !response) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sessionId and response are required' 
      });
    }

    if (typeof response !== 'string' || response.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Response must be at least 3 characters long'
      });
    }

    if (response.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Response is too long (maximum 10,000 characters)'
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found or expired',
        action: 'Please start a new assessment'
      });
    }

    // Find the current question
    const currentQuestion = QUESTION_BANK.find(q => q.id === questionId) || 
                           QUESTION_BANK[session.currentQuestionIndex] ||
                           QUESTION_BANK[session.responses.length];

    if (!currentQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID or assessment already complete'
      });
    }

    // Add response
    session.addResponse(currentQuestion, response.trim());
    session.currentQuestionIndex++;

    console.log(`💬 Response saved for ${sessionId}, Question: ${questionId}, Length: ${response.length}`);

    // Check if assessment is complete
    if (session.currentQuestionIndex >= QUESTION_BANK.length) {
      console.log(`✅ Assessment completed for ${sessionId}`);
      return res.json({
        success: true,
        complete: true,
        sessionId: sessionId,
        progress: {
          questionsAnswered: session.responses.length,
          questionsTotal: QUESTION_BANK.length,
          percentComplete: 100
        },
        message: "Thank you for sharing your experiences with me. Let me analyze what you've told me and provide some insights.",
        instructions: {
          step: 3,
          title: 'Analysis complete',
          description: 'Your responses are being analyzed to provide personalized insights'
        }
      });
    }

    // Get next question
    const nextQuestion = QUESTION_BANK[session.currentQuestionIndex];
    const progress = {
      questionsAnswered: session.responses.length,
      questionsRemaining: QUESTION_BANK.length - session.responses.length,
      questionsTotal: QUESTION_BANK.length,
      percentComplete: Math.round((session.responses.length / QUESTION_BANK.length) * 100),
      currentStage: nextQuestion.stage
    };

    res.json({
      success: true,
      question: nextQuestion,
      progress: progress,
      encouragement: session.responses.length % 3 === 0 ? 
        "You're doing great - thank you for being so thoughtful with your responses." : null
    });

  } catch (error) {
    console.error('❌ Response submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get assessment results
app.get('/api/assessment/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found or expired',
        action: 'Please start a new assessment'
      });
    }

    // Validate session completeness
    if (!session.demographics || Object.keys(session.demographics).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete assessment: demographics missing',
        stage: 'demographics'
      });
    }

    if (session.responses.length < QUESTION_BANK.length) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete assessment: not all questions answered',
        stage: 'assessment',
        progress: {
          questionsAnswered: session.responses.length,
          questionsTotal: QUESTION_BANK.length,
          percentComplete: Math.round((session.responses.length / QUESTION_BANK.length) * 100)
        }
      });
    }

    console.log(`📊 Generating results for ${sessionId}`);

    // Generate results if not already done
    if (!session.analysisResults) {
      try {
        const results = await enhancedResultsGenerator.generateResults(session);
        session.setAnalysisResults(results);
        console.log(`✅ Results generated for ${sessionId} using ${results.analysisMethod}`);
      } catch (analysisError) {
        console.error(`❌ Analysis failed for ${sessionId}:`, analysisError);
        
        // Try fallback results generation
        const fallbackResults = enhancedResultsGenerator.generateFallbackResults(session);
        session.setAnalysisResults(fallbackResults);
        console.log(`🔄 Fallback results generated for ${sessionId}`);
      }
    }

    res.json({
      success: true,
      sessionId: sessionId,
      results: session.analysisResults,
      metadata: {
        generatedAt: session.analysisResults.metadata?.generatedAt || new Date(),
        analysisMethod: session.analysisResults.analysisMethod,
        confidence: session.analysisResults.confidence,
        sessionDuration: new Date() - session.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Results generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate results',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      fallback_message: 'Please try again or contact support if the problem persists'
    });
  }
});

// =============================================================================
// SESSION MANAGEMENT ENDPOINTS
// =============================================================================

// Get session status
app.get('/api/assessment/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found or expired' 
      });
    }

    const sessionInfo = session.getSessionInfo();
    const progress = session.getProgress();

    res.json({
      success: true,
      session: {
        id: sessionId,
        stage: session.stage,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        progress: progress,
        hasDemographics: Object.keys(session.demographics).length > 0,
        hasResults: session.analysisResults !== null,
        nextAction: progress.isComplete ? 'get_results' : 
                   !progress.hasDemographics ? 'submit_demographics' : 'continue_assessment'
      }
    });
  } catch (error) {
    console.error('❌ Session status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get session status' });
  }
});

// Delete session
app.delete('/api/assessment/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = sessions.delete(sessionId);

    if (deleted) {
      console.log(`🗑️ Session deleted: ${sessionId}`);
      res.json({ 
        success: true, 
        message: 'Session deleted successfully' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
  } catch (error) {
    console.error('❌ Session deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// Get current question for session
app.get('/api/assessment/question/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found or expired' 
      });
    }

    const currentQuestion = session.getCurrentQuestion();
    const progress = session.getProgress();

    if (!currentQuestion) {
      return res.json({
        success: true,
        complete: true,
        progress: progress,
        message: 'Assessment complete - ready for results'
      });
    }

    res.json({
      success: true,
      question: currentQuestion,
      progress: progress
    });
  } catch (error) {
    console.error('❌ Current question error:', error);
    res.status(500).json({ success: false, error: 'Failed to get current question' });
  }
});

// =============================================================================
// FEEDBACK & SUPPORT ENDPOINTS
// =============================================================================

// Submit feedback
app.post('/api/assessment/feedback', async (req, res) => {
  try {
    const { sessionId, quickRating, mostHelpful, additionalComments, improvements } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = sessions.get(sessionId);
    const feedbackData = {
      sessionId,
      quickRating,
      mostHelpful,
      additionalComments,
      improvements,
      timestamp: new Date().toISOString()
    };

    // Save to database if session exists and has Supabase support
    if (session && typeof session.saveFeedback === 'function') {
      await session.saveFeedback(feedbackData);
    }

    console.log('📝 Feedback received:', feedbackData);

    res.json({
      success: true,
      message: 'Thank you for your feedback! It helps us improve the assessment experience.'
    });
  } catch (error) {
    console.error('❌ Feedback submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit feedback'
    });
  }
});

// Get support resources
app.get('/api/support/resources', (req, res) => {
  try {
    const { region = 'north-america' } = req.query;
    
    const resources = enhancedResultsGenerator.getSupportResources(region);
    
    res.json({
      success: true,
      region: region,
      resources: resources,
      emergency_note: "If you're in immediate danger, please call your local emergency services (911, 999, 112, etc.)",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Support resources error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get support resources',
      fallback_resources: [
        {
          name: "National Domestic Violence Hotline",
          contact: "1-800-799-7233",
          available: "24/7"
        }
      ]
    });
  }
});

// =============================================================================
// ADMINISTRATIVE ENDPOINTS (Development/Debug)
// =============================================================================

// Get all active sessions (admin endpoint)
app.get('/api/admin/sessions', (req, res) => {
  try {
    // Basic auth check (in production, implement proper authentication)
    const authHeader = req.get('Authorization');
    if (process.env.NODE_ENV === 'production' && !authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const activeSessions = getActiveSessions();
    const sessionStats = getSessionStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_sessions: activeSessions.length,
      stats: sessionStats,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('❌ Admin sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get session data' });
  }
});

// Manual cleanup endpoint
app.post('/api/admin/cleanup', (req, res) => {
  try {
    const { timeoutMs = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours
    const cleanedCount = cleanupExpiredSessions(timeoutMs);
    
    res.json({
      success: true,
      message: `Cleanup completed`,
      sessions_cleaned: cleanedCount,
      remaining_sessions: sessions.size,
      timeout_used: timeoutMs
    });
  } catch (error) {
    console.error('❌ Manual cleanup error:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Handle unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    message: 'The requested endpoint does not exist',
    available_endpoints: {
      assessment: [
        'POST /api/assessment/start',
        'POST /api/assessment/demographics',
        'POST /api/assessment/respond',
        'GET /api/assessment/results/:sessionId',
        'GET /api/assessment/session/:sessionId',
        'DELETE /api/assessment/session/:sessionId',
        'GET /api/assessment/question/:sessionId'
      ],
      system: [
        'GET /api/health',
        'GET /api/analysis/status',
        'GET /api/stats'
      ],
      support: [
        'POST /api/assessment/feedback',
        'GET /api/support/resources'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    details: isDevelopment ? error.message : undefined,
    stack: isDevelopment ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    request_id: req.id || 'unknown'
  });
});

// =============================================================================
// SECTION 10: SERVER STARTUP & ERROR HANDLING
// =============================================================================

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

let isShuttingDown = false;

// Graceful shutdown function
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('⚠️ Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(async () => {
      console.log('📡 HTTP server closed');
      
      try {
        // Save critical session data (in production, you'd persist to database)
        const activeSessions = Array.from(sessions.values());
        const criticalSessions = activeSessions.filter(session => 
          session.responses.length > 0 || session.analysisResults
        );
        
        if (criticalSessions.length > 0) {
          console.log(`💾 Preserving ${criticalSessions.length} active sessions...`);
          // In production, save to database or Redis
        }

        // Cleanup resources
        sessions.clear();
        console.log('🧹 Sessions cleared');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
        process.exit(1);
      }
    });

    // Force close after timeout
    setTimeout(() => {
      console.error('⏰ Graceful shutdown timeout - forcing close');
      process.exit(1);
    }, 10000); // 10 second timeout

  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  
  // In production, you might want to send this to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracking(error);
  }
  
  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // In production, you might want to send this to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracking(new Error(`Unhandled Rejection: ${reason}`));
  }
  
  // Don't crash on unhandled rejections in development
  if (process.env.NODE_ENV !== 'development') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// =============================================================================
// MAINTENANCE & MONITORING
// =============================================================================

// Automatic session cleanup
function startMaintenanceTasks() {
  // Cleanup expired sessions every hour
  const cleanupInterval = setInterval(() => {
    try {
      const cleanedCount = cleanupExpiredSessions();
      if (cleanedCount > 0) {
        console.log(`🧹 Automatic cleanup: removed ${cleanedCount} expired sessions`);
      }
    } catch (error) {
      console.error('❌ Automatic cleanup error:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  // Memory usage monitoring
  const memoryInterval = setInterval(() => {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    // Log memory usage if it's high
    if (usedMB > 500) { // More than 500MB
      console.log(`📊 Memory usage: ${usedMB}MB / ${totalMB}MB (${sessions.size} sessions)`);
    }
    
    // Warning if memory usage is very high
    if (usedMB > 1000) { // More than 1GB
      console.warn('⚠️ High memory usage detected. Consider restarting or optimizing.');
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Store intervals for cleanup during shutdown
  process.cleanupInterval = cleanupInterval;
  process.memoryInterval = memoryInterval;
}

// Stop maintenance tasks during shutdown
function stopMaintenanceTasks() {
  if (process.cleanupInterval) {
    clearInterval(process.cleanupInterval);
    console.log('🛑 Cleanup interval stopped');
  }
  if (process.memoryInterval) {
    clearInterval(process.memoryInterval);
    console.log('🛑 Memory monitoring stopped');
  }
}


// Add analytics endpoint to view your data
app.get('/api/admin/analytics', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not configured' 
      });
    }

    // Get recent sessions
    const { data: recentSessions } = await supabase
      .from('session_analytics') // Using the view we created
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Get persona distribution
    const { data: personaStats } = await supabase
      .from('session_analysis')
      .select('persona_name, count(*)')
      .group('persona_name');

    res.json({
      success: true,
      analytics: {
        recent_sessions: recentSessions,
        persona_distribution: personaStats,
        total_sessions: recentSessions?.length || 0,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get analytics' 
    });
  }
});

// Add export endpoint
app.get('/api/admin/export', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not configured' 
      });
    }

    const { format = 'json', days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: exportData } = await supabase
      .from('session_analytics')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: exportData,
      record_count: exportData?.length || 0,
      export_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export data' 
    });
  }
});
// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🎯 Partner Assessment API Server v3.0                     ║
║                              Enhanced Analysis Edition                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

🚀 Server Details:
   ├─ Port: ${PORT}
   ├─ Environment: ${process.env.NODE_ENV || 'development'}
   ├─ Node.js: ${process.version}
   ├─ Platform: ${process.platform}
   └─ Started: ${new Date().toLocaleString()}

📊 System Capabilities:
   ├─ Active Sessions: ${sessions.size}
   ├─ Personas Available: ${Object.keys(PERSONAS).length}
   ├─ Trait Analysis: 28 comprehensive traits
   ├─ Assessment Questions: ${QUESTION_BANK.length}
   └─ Scenario Analysis: ${Object.keys(SCENARIO_ANALYSIS).length} relationship areas
  `);

  // Initialize LLM capabilities check
  try {
    const engine = new EnhancedAnalysisEngine();
    const status = await engine.testLLMConnections();
    
    console.log(`🧠 Analysis Engine Status:`);
    console.log(`   ├─ OpenAI GPT: ${status.openai?.available ? '✅ Connected' : '❌ Not available'}`);
    console.log(`   ├─ Claude: ${status.claude?.available ? '✅ Connected' : '❌ Not available'}`);
    console.log(`   ├─ Enhanced Manual: ✅ Available`);
    console.log(`   └─ Emergency Fallback: ✅ Available`);

    // ADD THIS NEW SECTION:
console.log(`\n💾 Data Storage Status:`);
console.log(`   ├─ Supabase: ${supabase ? '✅ Connected' : '❌ Not configured'}`);
console.log(`   ├─ Session Persistence: ${supabase ? '✅ Enabled' : '⚠️  Memory only'}`);
console.log(`   └─ Analytics: ${supabase ? '✅ Available' : '❌ Not available'}`);

if (supabase) {
  console.log(`\n📊 Data Access:`);
  console.log(`   ├─ View data: Supabase Dashboard`);
  console.log(`   ├─ Analytics: GET /api/admin/analytics`);
  console.log(`   └─ Export: GET /api/admin/export`);
}
    
    const primaryEngine = status.openai?.available ? 'OpenAI GPT-4' : 
                         status.claude?.available ? 'Claude' : 
                         'Enhanced Manual Analysis';
    
    console.log(`\n🎯 Primary Analysis Engine: ${primaryEngine}`);
    
    if (!status.openai?.available && !status.claude?.available) {
      console.log(`\n⚠️  Running in Enhanced Manual Mode`);
      console.log(`   └─ Add OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables for LLM analysis`);
    }
    
  } catch (error) {
    console.log(`\n⚠️  LLM connectivity check failed: ${error.message}`);
    console.log(`   └─ Enhanced Manual Analysis available as fallback`);
  }

  // Display API endpoints
  console.log(`\n🌐 API Endpoints Available:`);
  console.log(`   ├─ GET  /api/health - System health check`);
  console.log(`   ├─ POST /api/assessment/start - Start new assessment`);
  console.log(`   ├─ POST /api/assessment/demographics - Submit demographics`);
  console.log(`   ├─ POST /api/assessment/respond - Submit responses`);
  console.log(`   ├─ GET  /api/assessment/results/:id - Get analysis results`);
  console.log(`   ├─ POST /api/assessment/feedback - Submit feedback`);
  console.log(`   └─ GET  /api/support/resources - Get support resources`);

  // Start maintenance tasks
  startMaintenanceTasks();
  console.log(`\n🔧 Maintenance Tasks Started:`);
  console.log(`   ├─ Session cleanup: Every hour`);
  console.log(`   └─ Memory monitoring: Every 5 minutes`);

  // Production warnings
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n🔒 Production Mode Active:`);
    console.log(`   ├─ Error details hidden from responses`);
    console.log(`   ├─ Graceful shutdown handlers registered`);
    console.log(`   └─ Admin endpoints require authentication`);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  🎉 Ready to help people understand their relationships!                     ║`);
  console.log(`║  💕 Assessment system fully operational and standing by...                   ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  // Run initial cleanup
  const initialCleanup = cleanupExpiredSessions();
  if (initialCleanup > 0) {
    console.log(`🧹 Initial cleanup: removed ${initialCleanup} expired sessions`);
  }
});

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Try setting a different PORT environment variable`);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied for port ${PORT}`);
    console.error(`   Try using a port number above 1024`);
  } else {
    console.error(`❌ Server startup error:`, error);
  }
  process.exit(1);
});

// Register cleanup function for shutdown
process.on('beforeExit', () => {
  stopMaintenanceTasks();  
});


// =============================================================================
// SECTION 10:Export Statement
// =============================================================================


// Export the enhanced components
module.exports = {
  app,
  server,
  sessions,
  EnhancedAnalysisEngine,
  EnhancedResultsGenerator,
  PERSONAS,
  CHARACTER_REFERENCES,
  SCENARIO_ANALYSIS,
  DEMOGRAPHIC_OPTIONS,
  QUESTION_BANK
};