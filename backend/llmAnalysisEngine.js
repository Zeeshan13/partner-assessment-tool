// =============================================================================
// ENHANCED LLM ANALYSIS ENGINE - COMPLETE IMPLEMENTATION
// Partner Assessment Tool - Advanced Analysis with Multiple LLM Support
// =============================================================================

// =============================================================================
// SECTION 1: DEPENDENCIES & CLIENT INITIALIZATION
// =============================================================================

// Only import if API keys are available to prevent startup errors
let OpenAI = null;
let Anthropic = null;

// Initialize OpenAI client
if (process.env.OPENAI_API_KEY) {
  try {
    OpenAI = require('openai');
    console.log('📦 OpenAI SDK loaded');
  } catch (error) {
    console.warn('⚠️ OpenAI SDK not available:', error.message);
  }
}

// Initialize Anthropic client
if (process.env.ANTHROPIC_API_KEY) {
  try {
    Anthropic = require('@anthropic-ai/sdk');
    console.log('📦 Anthropic SDK loaded');
  } catch (error) {
    console.warn('⚠️ Anthropic SDK not available:', error.message);
  }
}

// Simple Analysis Engine fallback
class SimpleAnalysisEngine {
  analyzeResponses(responses, demographics) {
    console.log('🔄 Using simple analysis fallback...');
    
    const responseText = responses.map(r => r.response.toLowerCase()).join(' ');
    
    // Basic pattern matching for emergency fallback
    const traitScores = {
      DOMN: 5, EXPL: 5, EMPA: 5, CTRL: 5, DECP: 5, BNDY: 5, ISOL: 5, ACCO: 5,
      CHAR: 5, GRAN: 5, CNFL: 5, IMPL: 5, NEED: 5, INCO: 5, VALS: 5, DISP: 5,
      SUPR: 5, TRST: 5, INTN: 5, SNSE: 5, SEEK: 5, PERS: 5, CGFL: 5, EMOX: 5,
      HYPL: 5, ATCH: 5, DYRG: 5, ENSH: 5
    };
    
    // Very basic pattern detection
    if (responseText.includes('controls') || responseText.includes('decides for me')) {
      traitScores.CTRL = 8;
      traitScores.DOMN = 7;
    }
    
    if (responseText.includes('lies') || responseText.includes('hides')) {
      traitScores.DECP = 7;
    }
    
    if (responseText.includes('doesn\'t care') || responseText.includes('dismisses')) {
      traitScores.EMPA = 3;
    }
    
    return {
      persona: 'The Clinger',
      traitScores: traitScores,
      scenarioScores: this.calculateScenarioScores(traitScores),
      riskLevel: 'medium',
      confidence: 0.4,
      analysisMethod: 'simple',
      keyIndicators: ['Basic pattern analysis completed'],
      reasoning: 'Simple fallback analysis - limited pattern recognition'
    };
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
}

// =============================================================================
// SECTION 2: TRAIT DEFINITIONS & PERSONA MAPPINGS
// =============================================================================

class LLMAnalysisEngine {
  constructor() {
    // Initialize LLM clients only if API keys are available
    this.openai = null;
    this.anthropic = null;
    this.simpleEngine = new SimpleAnalysisEngine();
    
    // Initialize OpenAI client
    if (OpenAI && process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized');
      } catch (error) {
        console.warn('⚠️ OpenAI initialization failed:', error.message);
      }
    }
    
    // Initialize Anthropic client
    if (Anthropic && process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        console.log('✅ Anthropic client initialized');
      } catch (error) {
        console.warn('⚠️ Anthropic initialization failed:', error.message);
      }
    }
    
    // 28 Trait definitions matching server.js exactly
    this.traitDefinitions = {
      DOMN: "Dominance - Controlling behavior, demanding compliance, authoritative presence",
      EXPL: "Exploitation - Using others for personal gain, taking advantage, manipulative tactics", 
      EMPA: "Empathy - Understanding others' feelings, showing compassion, emotional awareness",
      CTRL: "Control - Micromanaging, restricting freedom, dictating choices and decisions",
      DECP: "Deception - Lying, misleading, hiding truth, gaslighting behaviors",
      BNDY: "Boundary Respect - Honoring limits, respecting personal space and choices",
      ISOL: "Isolation - Separating partner from support systems, creating dependency",
      ACCO: "Accountability - Taking responsibility, owning mistakes, making amends",
      CHAR: "Charisma - Charm, persuasive appeal, magnetic personality traits",
      GRAN: "Grandiosity - Inflated self-importance, superiority complex, entitlement",
      CNFL: "Conflict Style - How disagreements are handled, resolution approaches",
      IMPL: "Impulsivity - Acting without consideration, reactive behaviors, reckless",
      NEED: "Neediness - Excessive emotional demands, clingy behaviors, insecurity",
      INCO: "Inconsistency - Unpredictable behavior patterns, unreliable responses",
      VALS: "Validation-Seeking - Constant need for approval, praise, reassurance",
      DISP: "Disrespect - Dismissive behavior, lack of regard for partner",
      SUPR: "Superficiality - Shallow interactions, surface-level connections, lack of depth",
      TRST: "Trust - Reliability, faith in partner, secure belief in honesty",
      INTN: "Intensity - Overwhelming emotional intensity, dramatic reactions",
      SNSE: "Sense of Self - Individual identity strength, autonomy, self-awareness",
      SEEK: "Sensation Seeking - Thrill-seeking, need for excitement, risk-taking",
      PERS: "Perseveration - Obsessive focus, unable to let go, repetitive thoughts",
      CGFL: "Conflict Frequency - How often disagreements occur, tension levels",
      EMOX: "Emotional Overexposure - Oversharing emotions, inappropriate emotional boundaries",
      HYPL: "Hyperlogical Thinking - Over-analyzing, emotion-suppressing rationality",
      ATCH: "Compulsive Attachment - Obsessive bonding, inability to be alone, clingy",
      DYRG: "Dysregulation - Emotional instability, mood swings, poor emotional control",
      ENSH: "Enmeshment - Boundary blurring, loss of individual identity, codependence"
    };

    // Persona mapping matching server.js exactly
    this.personaMapping = {
      'The Puppet Master': { highTraits: ['INTN', 'DECP', 'EMOX'], lowTraits: ['SNSE', 'DISP', 'ACCO'] },
      'The Intimidator': { highTraits: ['ATCH', 'BNDY', 'DOMN'], lowTraits: ['HYPL', 'EMPA', 'NEED'] },
      'The Self-Obsessed': { highTraits: ['GRAN', 'VALS', 'CHAR'], lowTraits: ['ISOL', 'EMPA', 'ACCO'] },
      'The Drill Sergeant': { highTraits: ['CTRL', 'DOMN', 'SNSE'], lowTraits: ['NEED', 'EMOX', 'HYPL'] },
      'The Suspicious Strategist': { highTraits: ['ISOL', 'CNFL', 'DYRG'], lowTraits: ['TRST', 'CHAR', 'HYPL'] },
      'Master of Everything': { highTraits: ['DOMN', 'CNFL', 'DISP'], lowTraits: ['ENSH', 'NEED', 'ACCO'] },
      'The Subtle Saboteur': { highTraits: ['DISP', 'INCO', 'CTRL'], lowTraits: ['DYRG', 'CNFL', 'ACCO'] },
      'The Clinger': { highTraits: ['ENSH', 'DYRG', 'ATCH'], lowTraits: ['SNSE', 'DISP', 'GRAN'] },
      'The Addict': { highTraits: ['DYRG', 'IMPL', 'INCO'], lowTraits: ['SNSE', 'CTRL', 'HYPL'] },
      'The Parental Seeker': { highTraits: ['DYRG', 'CHAR', 'ATCH'], lowTraits: ['CTRL', 'PERS', 'EMPA'] },
      'The Future Faker': { highTraits: ['DECP', 'INCO', 'CHAR'], lowTraits: ['ACCO', 'PERS', 'EMPA'] },
      'The Freewheeler': { highTraits: ['IMPL', 'EMOX', 'SEEK'], lowTraits: ['CTRL', 'DOMN', 'HYPL'] },
      'The Thinker': { highTraits: ['HYPL', 'PERS', 'TRST'], lowTraits: ['IMPL', 'CHAR', 'SEEK'] },
      'Emotional Invalidator': { highTraits: ['DISP', 'CTRL', 'INCO'], lowTraits: ['HYPL', 'SEEK', 'EMPA'] },
      'The Emotionally Distant': { highTraits: ['INCO', 'SUPR', 'DISP'], lowTraits: ['ENSH', 'DYRG', 'ATCH'] },
      'The Rake': { highTraits: ['CHAR', 'SEEK', 'INTN'], lowTraits: ['ATCH', 'DISP', 'SNSE'] },
      'The Perpetual Victim': { highTraits: ['VALS', 'INCO', 'EMOX'], lowTraits: ['ACCO', 'EMPA', 'CTRL'] }
    };
  }

  // =============================================================================
  // SECTION 3: DETAILED SCORING RUBRICS (All 28 Traits)
  // =============================================================================

  initializeScoringRubrics() {
    this.scoringRubrics = {
      DOMN: {
        "0-2": "Rarely takes charge, prefers collaborative decisions, respects partner's autonomy, follows partner's lead naturally",
        "3-4": "Occasionally takes leadership role, generally collaborative, respects partner's input in most decisions",
        "5-6": "Balanced leadership, sometimes dominant but also follows, moderate control tendencies",
        "7-8": "Frequently dominant, often makes unilateral decisions, expects compliance, dismisses partner's input",
        "9-10": "Extremely controlling, demands absolute compliance, never allows partner to lead, authoritarian behavior"
      },
      EXPL: {
        "0-2": "Genuinely caring, never uses partner for personal gain, gives more than takes, selfless in relationship",
        "3-4": "Generally fair, occasionally benefits from partner's efforts but reciprocates, mostly balanced exchange",
        "5-6": "Moderate give-and-take, sometimes uses partner's resources/efforts for own benefit, generally fair",
        "7-8": "Frequently exploits partner's kindness, resources, or efforts for personal gain, one-sided benefits",
        "9-10": "Consistently manipulative, uses partner purely for personal advantage, parasitic relationship dynamic"
      },
      EMPA: {
        "0-2": "Rarely shows understanding of partner's emotions, dismissive of feelings, lacks emotional awareness",
        "3-4": "Limited emotional understanding, occasionally acknowledges partner's feelings but struggles to connect",
        "5-6": "Moderate empathy, sometimes understands partner's emotions, inconsistent emotional support",
        "7-8": "Generally empathetic, good at reading partner's emotions, provides emotional support most of the time",
        "9-10": "Exceptionally empathetic, deeply understands partner's emotions, consistently compassionate and supportive"
      },
      CTRL: {
        "0-2": "Gives partner complete freedom, never interferes with partner's choices, fully respects autonomy",
        "3-4": "Mostly respects partner's freedom, occasional preferences but doesn't impose, generally non-controlling",
        "5-6": "Moderate control tendencies, sometimes restricts partner's choices, mixed respect for autonomy",
        "7-8": "Frequently controlling, restricts partner's choices, micromanages activities and decisions",
        "9-10": "Extremely controlling, dictates all major decisions, severe restriction of partner's freedom and choices"
      },
      DECP: {
        "0-2": "Completely honest, transparent in all communications, never misleads or hides information",
        "3-4": "Generally truthful, very rare white lies, mostly transparent with occasional minor omissions",
        "5-6": "Moderate honesty, sometimes withholds information or tells white lies, generally truthful",
        "7-8": "Frequently deceptive, regularly lies or misleads, hides important information, gaslighting behaviors",
        "9-10": "Consistently dishonest, pathological lying, severe gaslighting, completely untrustworthy communication"
      },
      BNDY: {
        "0-2": "Completely ignores partner's boundaries, invasive behavior, no respect for personal limits",
        "3-4": "Poor boundary respect, frequently crosses limits, struggles to understand personal space needs",
        "5-6": "Moderate boundary respect, sometimes crosses limits but generally tries to respect boundaries",
        "7-8": "Good boundary respect, usually honors partner's limits, occasional boundary crossing but corrects behavior",
        "9-10": "Excellent boundary respect, always honors limits, highly respectful of personal space and choices"
      },
      ISOL: {
        "0-2": "Encourages partner's social connections, supports friendships and family relationships, promotes independence",
        "3-4": "Generally supportive of partner's relationships, occasional jealousy but doesn't interfere significantly",
        "5-6": "Mixed behavior, sometimes supportive of social connections, occasionally discourages certain relationships",
        "7-8": "Frequently discourages social connections, creates conflict with friends/family, promotes dependency",
        "9-10": "Actively isolates partner, forbids social connections, creates complete dependency, cuts off support systems"
      },
      ACCO: {
        "0-2": "Never compromises, rigid and inflexible, always insists on own way, refuses to adapt",
        "3-4": "Rarely compromises, very inflexible, difficult to negotiate with, strong preference for own way",
        "5-6": "Moderate flexibility, sometimes compromises, mixed willingness to accommodate partner's needs",
        "7-8": "Generally accommodating, willing to compromise, flexible in most situations, considers partner's needs",
        "9-10": "Highly accommodating, always willing to compromise, extremely flexible, prioritizes partner's needs"
      },
      CHAR: {
        "0-2": "Lacks charm, socially awkward, no persuasive appeal, struggles with social interactions",
        "3-4": "Limited charm, occasional social appeal, some persuasive ability but inconsistent",
        "5-6": "Moderate charisma, socially competent, some charm and appeal, moderate persuasive ability",
        "7-8": "Quite charming, socially skilled, persuasive and appealing, draws people in easily",
        "9-10": "Extremely charismatic, magnetic personality, highly persuasive, irresistible social appeal"
      },
      GRAN: {
        "0-2": "Humble and modest, self-aware of limitations, no sense of superiority, realistic self-assessment",
        "3-4": "Generally modest, occasional pride but realistic, mostly appropriate self-assessment",
        "5-6": "Moderate self-importance, sometimes inflated ego, mixed realistic and grandiose self-perception",
        "7-8": "Frequently grandiose, inflated self-importance, sense of superiority, entitlement behaviors",
        "9-10": "Extreme grandiosity, severe narcissistic traits, complete sense of superiority, pathological entitlement"
      },
      CNFL: {
        "0-2": "Excellent conflict resolution, always seeks win-win solutions, constructive communication, problem-solving focus",
        "3-4": "Good conflict handling, usually constructive, occasionally defensive but generally problem-focused",
        "5-6": "Moderate conflict skills, sometimes constructive, mixed approach to disagreements",
        "7-8": "Poor conflict resolution, often defensive or aggressive, personalizes disagreements, destructive patterns",
        "9-10": "Terrible conflict handling, always destructive, vindictive, refuses resolution, escalates every disagreement"
      },
      IMPL: {
        "0-2": "Highly thoughtful, always considers consequences, deliberate decision-making, excellent impulse control",
        "3-4": "Generally thoughtful, good impulse control, occasionally acts quickly but usually considers consequences",
        "5-6": "Moderate impulsivity, sometimes acts without thinking, mixed thoughtful and reactive behaviors",
        "7-8": "Frequently impulsive, often acts without consideration, poor impulse control, reactive behaviors",
        "9-10": "Extremely impulsive, never considers consequences, completely reactive, dangerous impulsive behaviors"
      },
      NEED: {
        "0-2": "Very independent, secure, rarely seeks excessive reassurance, self-sufficient emotionally",
        "3-4": "Generally independent, occasional need for reassurance, mostly secure in relationship",
        "5-6": "Moderate neediness, sometimes clingy, mixed independence and emotional demands",
        "7-8": "Frequently needy, clingy behaviors, excessive emotional demands, insecure attachment",
        "9-10": "Extremely needy, constant emotional demands, severe clinginess, cannot function independently"
      },
      INCO: {
        "0-2": "Extremely consistent, predictable behavior patterns, stable moods, reliable responses",
        "3-4": "Generally consistent, predictable most of the time, stable with occasional mood variations",
        "5-6": "Moderate consistency, sometimes unpredictable, mixed stable and variable behavior patterns",
        "7-8": "Frequently inconsistent, unpredictable behavior, mood swings, unreliable patterns",
        "9-10": "Completely unpredictable, severe mood swings, chaotic behavior patterns, no consistency"
      },
      VALS: {
        "0-2": "Never seeks validation, completely self-assured, no need for external approval or praise",
        "3-4": "Rarely seeks validation, mostly self-confident, occasional desire for recognition",
        "5-6": "Moderate validation seeking, sometimes needs reassurance, balanced self-confidence",
        "7-8": "Frequently seeks validation, needs regular praise and approval, insecure without external confirmation",
        "9-10": "Constantly seeks validation, desperate for approval, cannot function without continuous praise and attention"
      },
      DISP: {
        "0-2": "Extremely respectful, always honors partner's dignity, consistently considerate and kind",
        "3-4": "Generally respectful, occasional insensitive moments but mostly considerate behavior",
        "5-6": "Moderate respect, sometimes dismissive, mixed considerate and disrespectful behaviors",
        "7-8": "Frequently disrespectful, often dismissive of partner's feelings and opinions, rude behavior",
        "9-10": "Consistently disrespectful, contemptuous behavior, completely dismissive of partner's worth and dignity"
      },
      SUPR: {
        "0-2": "Extremely deep and meaningful interactions, genuine emotional connection, authentic communication",
        "3-4": "Generally deep connection, occasionally superficial but mostly meaningful interactions",
        "5-6": "Moderate depth, some meaningful moments mixed with surface-level interactions",
        "7-8": "Frequently superficial, avoids deep topics, surface-level emotional connection",
        "9-10": "Completely superficial, no genuine emotional depth, all interactions remain on surface level"
      },
      TRST: {
        "0-2": "Completely untrustworthy, never keeps commitments, unreliable, breaks promises consistently",
        "3-4": "Generally unreliable, often breaks commitments, struggles to keep promises, inconsistent follow-through",
        "5-6": "Moderate trustworthiness, sometimes reliable, mixed ability to keep commitments",
        "7-8": "Generally trustworthy, usually keeps commitments, reliable in most situations",
        "9-10": "Completely trustworthy, always keeps commitments, extremely reliable, never breaks promises"
      },
      INTN: {
        "0-2": "Very calm and measured, rarely shows intense emotions, peaceful demeanor",
        "3-4": "Generally calm, occasional emotional moments but mostly even-tempered",
        "5-6": "Moderate intensity, sometimes emotional, balanced between calm and intense",
        "7-8": "Frequently intense, strong emotional reactions, dramatic responses to situations",
        "9-10": "Extremely intense, overwhelming emotional reactions, everything is dramatic and overwhelming"
      },
      SNSE: {
        "0-2": "No individual identity, completely dependent on others for self-definition, no autonomy",
        "3-4": "Weak sense of self, often looks to others for identity, limited autonomy",
        "5-6": "Moderate sense of self, sometimes dependent on others, mixed autonomy and dependence",
        "7-8": "Strong sense of self, generally autonomous, maintains individual identity in relationships",
        "9-10": "Extremely strong sense of self, completely autonomous, never loses individual identity"
      },
      SEEK: {
        "0-2": "Avoids excitement, prefers routine and predictability, risk-averse behavior",
        "3-4": "Generally prefers stability, occasionally enjoys mild excitement, mostly risk-averse",
        "5-6": "Moderate excitement seeking, sometimes enjoys thrills, balanced approach to risk",
        "7-8": "Frequently seeks excitement, enjoys thrills and new experiences, somewhat risk-taking",
        "9-10": "Constantly seeks intense excitement, extreme thrill-seeking, dangerous risk-taking behaviors"
      },
      PERS: {
        "0-2": "Gives up easily, no determination, abandons goals quickly, no persistence in conflicts",
        "3-4": "Limited persistence, gives up fairly easily, minimal determination, rarely follows through",
        "5-6": "Moderate persistence, sometimes determined, mixed ability to follow through on goals",
        "7-8": "Generally persistent, determined, usually follows through on goals, doesn't give up easily",
        "9-10": "Extremely persistent, never gives up, unwavering determination, obsessive follow-through"
      },
      CGFL: {
        "0-2": "No conflicts, harmonious relationship, disagreements are rare and minor",
        "3-4": "Rare conflicts, mostly harmonious, occasional minor disagreements",
        "5-6": "Moderate conflict frequency, regular disagreements but not constant tension",
        "7-8": "Frequent conflicts, regular disagreements, high tension levels, constant stress",
        "9-10": "Constant conflicts, never peaceful, extreme tension, relationship in crisis mode"
      },
      EMOX: {
        "0-2": "Never expresses emotions, completely shut down, no emotional communication",
        "3-4": "Rarely expresses emotions, very limited emotional communication, struggles to share feelings",
        "5-6": "Moderate emotional expression, sometimes shares feelings, inconsistent emotional communication",
        "7-8": "Good emotional expression, usually communicates feelings, healthy emotional sharing",
        "9-10": "Excessive emotional expression, overshares feelings inappropriately, no emotional boundaries"
      },
      HYPL: {
        "0-2": "Never overthinks, purely emotional decision-making, no logical analysis",
        "3-4": "Rarely analytical, mostly emotional responses, limited logical thinking",
        "5-6": "Moderate balance between emotion and logic, sometimes overthinks",
        "7-8": "Frequently analytical, often overthinks situations, logic over emotion",
        "9-10": "Extremely analytical, overthinks everything, completely suppresses emotions with logic"
      },
      ATCH: {
        "0-2": "Extremely secure attachment, comfortable with independence, healthy bonding patterns",
        "3-4": "Generally secure attachment, mostly comfortable with independence, stable bonding",
        "5-6": "Moderate attachment security, some insecurities, mixed stable and anxious patterns",
        "7-8": "Insecure attachment, clingy behavior, anxious bonding patterns, fear of abandonment",
        "9-10": "Extremely insecure attachment, obsessive clinging, cannot tolerate any separation"
      },
      DYRG: {
        "0-2": "Excellent emotional regulation, stable moods, consistent emotional responses",
        "3-4": "Good emotional regulation, mostly stable, occasional emotional fluctuations",
        "5-6": "Moderate emotional regulation, sometimes unstable, mixed emotional stability",
        "7-8": "Poor emotional regulation, frequent mood swings, unstable emotional responses",
        "9-10": "No emotional regulation, extreme mood swings, chaotic emotional instability"
      },
      ENSH: {
        "0-2": "Maintains clear individual identity, healthy boundaries, encourages partner's independence",
        "3-4": "Generally maintains identity, mostly healthy boundaries, supports partner's independence",
        "5-6": "Moderate boundary blurring, some loss of individual identity, mixed independence/dependence",
        "7-8": "Significant boundary blurring, notable loss of individual identity, creates unhealthy dependence",
        "9-10": "Complete boundary dissolution, total loss of individual identity, extreme unhealthy enmeshment"
      }
    };
  }

  // =============================================================================
  // SECTION 4: PROMPT ENGINEERING SYSTEM
  // =============================================================================

  buildAnalysisPrompt(responses, demographics, conversationHistory) {
    // Initialize rubrics if not done yet
    if (!this.scoringRubrics) {
      this.initializeScoringRubrics();
    }

    const responseText = responses.map(r => 
      `Q: ${r.questionText}\nA: ${r.response}`
    ).join('\n\n');

    const demographicInfo = Object.entries(demographics)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    // Build detailed scoring rubrics section
    const detailedRubrics = Object.entries(this.scoringRubrics).map(([trait, rubric]) => {
      const traitName = this.traitDefinitions[trait];
      return `
${trait} - ${traitName}:
• Score 0-2: ${rubric['0-2']}
• Score 3-4: ${rubric['3-4']}
• Score 5-6: ${rubric['5-6']}
• Score 7-8: ${rubric['7-8']}
• Score 9-10: ${rubric['9-10']}`;
    }).join('\n');

    // Build persona matching criteria
    const personaCriteria = Object.entries(this.personaMapping).map(([persona, criteria]) => {
      return `${persona}:
  - High traits (should score 7-10): ${criteria.highTraits.join(', ')}
  - Low traits (should score 0-3): ${criteria.lowTraits.join(', ')}`;
    }).join('\n');

    return `
RELATIONSHIP BEHAVIOR ANALYSIS REQUEST

PARTICIPANT DEMOGRAPHICS:
${demographicInfo}

CONVERSATION RESPONSES:
${responseText}

DETAILED SCORING INSTRUCTIONS:
You must analyze each response for specific behavioral evidence and score each trait based on the detailed rubrics below. Look for concrete examples in the responses that match the behavioral descriptions.

EVIDENCE REQUIREMENTS:
- Base scores ONLY on behaviors explicitly described in the responses
- Higher scores (7-10) require clear evidence of problematic behaviors
- Lower scores (0-3) require evidence of positive/healthy behaviors  
- Neutral scores (4-6) for ambiguous or mixed evidence
- If no evidence exists for a trait, default to 5 (neutral)

DETAILED TRAIT SCORING RUBRICS:
${detailedRubrics}

PERSONA MATCHING CRITERIA:
After scoring all traits, match to the persona where the participant's scores best align with these patterns:
${personaCriteria}

ANALYSIS METHODOLOGY:
1. Read each response carefully for behavioral evidence
2. Score each trait based on specific behavioral indicators from the rubrics
3. Justify scores with specific examples from the responses
4. Match the overall pattern to the most appropriate persona
5. Assess risk level based on severity and frequency of concerning behaviors

RESPONSE FORMAT (JSON ONLY):
{
  "trait_scores": {
    "DOMN": 7.2,
    "EXPL": 6.1,
    "EMPA": 3.4,
    "CTRL": 8.5,
    "DECP": 5.7,
    "BNDY": 2.8,
    "ISOL": 6.9,
    "ACCO": 3.2,
    "CHAR": 7.8,
    "GRAN": 6.4,
    "CNFL": 7.1,
    "IMPL": 5.9,
    "NEED": 4.3,
    "INCO": 6.7,
    "VALS": 4.1,
    "DISP": 5.8,
    "SUPR": 3.5,
    "TRST": 4.2,
    "INTN": 5.6,
    "SNSE": 3.8,
    "SEEK": 6.2,
    "PERS": 7.4,
    "CGFL": 6.8,
    "EMOX": 5.1,
    "HYPL": 3.9,
    "ATCH": 6.5,
    "DYRG": 7.3,
    "ENSH": 5.4
  },
  "persona_match": "The Puppet Master",
  "confidence": 0.89,
  "key_indicators": [
    "Makes decisions without consulting partner (DOMN: 8.5)",
    "Uses guilt and manipulation to get compliance (EXPL: 8.2)",
    "Isolates partner from support systems (ISOL: 7.8)",
    "Dismisses partner's feelings and concerns (EMPA: 2.1)"
  ],
  "risk_level": "high",
  "reasoning": "Partner exhibits strong controlling behaviors with manipulation tactics. High dominance scores combined with low empathy and boundary respect indicate potentially harmful relationship dynamics. Specific evidence includes [cite specific examples from responses].",
  "behavioral_evidence": {
    "DOMN": "Respondent stated 'he decides everything for us' and 'I'm not allowed to have opinions'",
    "CTRL": "Examples include controlling where respondent goes, who they see, what they wear",
    "EMPA": "No evidence of partner showing understanding or compassion for respondent's feelings"
  }
}

CRITICAL: Base all scores on actual behavioral evidence from the responses. Do not make assumptions. Provide specific examples in your reasoning and behavioral_evidence sections.`;
  }

  // =============================================================================
  // SECTION 5: OPENAI INTEGRATION METHODS
  // =============================================================================

  async analyzeWithOpenAI(responses, demographics, conversationHistory) {
    const prompt = this.buildAnalysisPrompt(responses, demographics, conversationHistory);
    
    try {
      console.log('🤖 Attempting OpenAI GPT-4 analysis...');
      
      // Try GPT-4 first
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert relationship psychologist analyzing partner behavior patterns. You provide accurate, nuanced analysis based on described behaviors. Always respond with valid JSON only. Never include explanatory text outside the JSON response.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      console.log('✅ GPT-4 analysis successful');
      return this.processLLMResponse(analysis);
      
    } catch (gpt4Error) {
      console.warn('⚠️ GPT-4 failed, trying GPT-3.5:', gpt4Error.message);
      
      try {
        // Fallback to GPT-3.5
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert relationship psychologist. Analyze partner behavior patterns and respond with valid JSON only. Do not include any text outside the JSON response.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });

        const analysis = JSON.parse(completion.choices[0].message.content);
        console.log('✅ GPT-3.5 analysis successful');
        return this.processLLMResponse(analysis);
        
      } catch (gpt35Error) {
        console.error('❌ Both GPT-4 and GPT-3.5 failed:', gpt35Error.message);
        throw new Error(`OpenAI analysis failed: ${gpt35Error.message}`);
      }
    }
  }

  // =============================================================================
  // SECTION 6: CLAUDE INTEGRATION METHODS
  // =============================================================================

  async analyzeWithClaude(responses, demographics, conversationHistory) {
    const prompt = this.buildAnalysisPrompt(responses, demographics, conversationHistory);
    
    try {
      console.log('🤖 Attempting Claude analysis...');
      
      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2500,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: `You are an expert relationship psychologist. Analyze the following relationship data and respond with valid JSON only. Do not include any explanatory text outside the JSON response.\n\n${prompt}`
          }
        ]
      });

      const analysis = JSON.parse(message.content[0].text);
      console.log('✅ Claude analysis successful');
      return this.processLLMResponse(analysis);
      
    } catch (claudeError) {
      console.error('❌ Claude analysis failed:', claudeError.message);
      throw new Error(`Claude analysis failed: ${claudeError.message}`);
    }
  }

  // =============================================================================
  // SECTION 7: RESPONSE PROCESSING & VALIDATION
  // =============================================================================

  processLLMResponse(analysis) {
    try {
      // Validate and process the LLM response
      const traitScores = analysis.trait_scores || {};
      
      // Ensure all 28 traits have valid scores
      Object.keys(this.traitDefinitions).forEach(trait => {
        if (typeof traitScores[trait] !== 'number' || traitScores[trait] < 0 || traitScores[trait] > 10) {
          console.warn(`⚠️ Invalid score for trait ${trait}: ${traitScores[trait]}, defaulting to 5`);
          traitScores[trait] = 5; // Neutral default
        }
      });

      // Validate persona
      let persona = analysis.persona_match || 'The Clinger';
      if (!this.personaMapping[persona]) {
        console.warn(`⚠️ Invalid persona ${persona}, defaulting to The Clinger`);
        persona = 'The Clinger';
      }

      // Determine persona using our matching logic as backup
      const calculatedPersona = this.determinePersona(traitScores);
      
      // Use calculated persona if LLM persona doesn't match well
      const personaConfidence = this.calculatePersonaMatch(traitScores, this.personaMapping[persona]);
      const calculatedConfidence = this.calculatePersonaMatch(traitScores, this.personaMapping[calculatedPersona]);
      
      if (calculatedConfidence > personaConfidence + 0.2) {
        console.log(`🔄 Using calculated persona ${calculatedPersona} over LLM persona ${persona}`);
        persona = calculatedPersona;
      }

      // Calculate scenario scores using same method as server.js
      const scenarioScores = this.calculateScenarioScores(traitScores);

      // Validate risk level
      let riskLevel = analysis.risk_level || 'medium';
      if (!['low', 'medium', 'high'].includes(riskLevel)) {
        riskLevel = this.assessRiskLevel(traitScores, scenarioScores);
      }

      // Validate confidence
      let confidence = analysis.confidence || 0.7;
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
        confidence = 0.7;
      }

      return {
        persona: persona,
        traitScores: traitScores,
        scenarioScores: scenarioScores,
        confidence: confidence,
        keyIndicators: analysis.key_indicators || [],
        riskLevel: riskLevel,
        reasoning: analysis.reasoning || 'LLM analysis completed',
        behavioralEvidence: analysis.behavioral_evidence || {},
        analysisMethod: 'llm'
      };
      
    } catch (error) {
      console.error('❌ Error processing LLM response:', error);
      throw new Error(`Failed to process LLM response: ${error.message}`);
    }
  }

  // =============================================================================
  // SECTION 8: PERSONA MATCHING LOGIC
  // =============================================================================

  determinePersona(traitScores) {
    let bestMatch = 'The Clinger';
    let highestScore = 0;

    Object.entries(this.personaMapping).forEach(([name, persona]) => {
      const score = this.calculatePersonaMatch(traitScores, persona);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = name;
      }
    });

    return bestMatch;
  }

  calculatePersonaMatch(traitScores, persona) {
    let score = 0;
    const totalTraits = persona.highTraits.length + persona.lowTraits.length;

    // Check high traits (should be > 6 for strong match)
    persona.highTraits.forEach(trait => {
      if (traitScores[trait] && traitScores[trait] > 6) {
        score += (traitScores[trait] - 6) / 4;
      }
    });

    // Check low traits (should be < 4 for strong match)  
    persona.lowTraits.forEach(trait => {
      if (traitScores[trait] && traitScores[trait] < 4) {
        score += (4 - traitScores[trait]) / 4;
      }
    });

    return score / totalTraits;
  }

  calculateScenarioScores(traitScores) {
    // Use exact same calculation as server.js
    return {
      'Decision-Making Dynamics': Math.min(100, ((traitScores.DOMN * 0.6) + (traitScores.CTRL * 0.4)) * 10),
      'Conflict Resolution Patterns': Math.min(100, ((traitScores.CGFL * 0.4) + ((10 - traitScores.EMPA) * 0.3) + ((10 - traitScores.ACCO) * 0.3)) * 10),
      'Social Connection Control': Math.min(100, ((traitScores.CTRL * 0.5) + (traitScores.ISOL * 0.5)) * 10),
      'Emotional Support Quality': Math.min(100, (((10 - traitScores.EMPA) * 0.6) + (traitScores.EXPL * 0.4)) * 10),
      'Boundary Respect': Math.min(100, (((10 - traitScores.BNDY) * 0.6) + (traitScores.CTRL * 0.4)) * 10)
    };
  }

  assessRiskLevel(traitScores, scenarioScores) {
    const avgScenarioScore = Object.values(scenarioScores).reduce((a, b) => a + b, 0) / Object.values(scenarioScores).length;
    
    // Check for high-risk trait combinations
    const highRiskTraits = ['CTRL', 'DECP', 'EXPL', 'DOMN', 'DYRG'];
    const highRiskScore = highRiskTraits.reduce((sum, trait) => sum + traitScores[trait], 0) / highRiskTraits.length;
    
    // Check boundary and safety scores
    const safetyScore = (traitScores.BNDY + traitScores.TRST + (10 - traitScores.DYRG)) / 3;
    
    if (avgScenarioScore > 80 || highRiskScore > 8 || safetyScore < 3) return 'high';
    if (avgScenarioScore > 60 || highRiskScore > 6.5 || safetyScore < 5) return 'medium';
    return 'low';
  }

  // =============================================================================
  // SECTION 9: FALLBACK ANALYSIS SYSTEM
  // =============================================================================

  async analyzePartnerBehavior(responses, demographics, conversationHistory) {
    try {
      console.log('🧠 Starting LLM analysis pipeline...');
      
      // Try OpenAI first if available
      if (this.openai) {
        try {
          return await this.analyzeWithOpenAI(responses, demographics, conversationHistory);
        } catch (openaiError) {
          console.warn('⚠️ OpenAI analysis failed:', openaiError.message);
        }
      }
      
      // Try Claude if OpenAI failed or unavailable
      if (this.anthropic) {
        try {
          return await this.analyzeWithClaude(responses, demographics, conversationHistory);
        } catch (claudeError) {
          console.warn('⚠️ Claude analysis failed:', claudeError.message);
        }
      }
      
      // Fallback to simple analysis if all LLMs failed
      console.log('🔄 All LLM options failed, using simple analysis fallback...');
      return this.simpleEngine.analyzeResponses(responses, demographics);
      
    } catch (error) {
      console.error('❌ Complete analysis pipeline failed:', error);
      
      // Emergency fallback
      console.log('🚨 Using emergency fallback analysis...');
      return this.simpleEngine.analyzeResponses(responses, demographics);
    }
  }

  // =============================================================================
  // SECTION 10: CONNECTION TESTING & UTILITIES
  // =============================================================================

  async testConnections() {
    const status = {
      openai: { available: false, error: null },
      claude: { available: false, error: null },
      fallback: { available: true, error: null }
    };

    // Test OpenAI connection
    if (this.openai) {
      try {
        console.log('🧪 Testing OpenAI connection...');
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test connection - respond with just "OK"' }],
          max_tokens: 5,
          temperature: 0
        });
        
        status.openai = {
          available: true,
          error: null,
          model: 'gpt-3.5-turbo',
          response: response.choices[0].message.content,
          test_timestamp: new Date().toISOString()
        };
        console.log('✅ OpenAI connection test successful');
      } catch (error) {
        status.openai.error = error.message;
        console.warn('⚠️ OpenAI connection test failed:', error.message);
      }
    } else {
      status.openai.error = 'API key not configured or SDK not available';
    }

    // Test Claude connection
    if (this.anthropic) {
      try {
        console.log('🧪 Testing Claude connection...');
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Test connection - respond with just "OK"' }]
        });
        
        status.claude = {
          available: true,
          error: null,
          model: 'claude-3-sonnet-20240229',
          response: response.content[0].text,
          test_timestamp: new Date().toISOString()
        };
        console.log('✅ Claude connection test successful');
      } catch (error) {
        status.claude.error = error.message;
        console.warn('⚠️ Claude connection test failed:', error.message);
      }
    } else {
      status.claude.error = 'API key not configured or SDK not available';
    }

    // Test simple analysis fallback
    try {
      const testResponses = [
        { questionText: 'Test question', response: 'Test response', timestamp: new Date() }
      ];
      const testDemographics = { ageGroup: '25-34', gender: 'female' };
      
      const fallbackResult = this.simpleEngine.analyzeResponses(testResponses, testDemographics);
      status.fallback = {
        available: true,
        error: null,
        test_result: 'Simple analysis working',
        test_timestamp: new Date().toISOString()
      };
      console.log('✅ Fallback analysis test successful');
    } catch (error) {
      status.fallback = {
        available: false,
        error: error.message
      };
      console.error('❌ Fallback analysis test failed:', error.message);
    }

    return status;
  }

  // Utility method to get default trait scores
  getDefaultTraitScores() {
    const scores = {};
    Object.keys(this.traitDefinitions).forEach(trait => {
      scores[trait] = 5; // Neutral default
    });
    return scores;
  }

  // Utility method to validate trait scores
  validateTraitScores(traitScores) {
    const errors = [];
    
    Object.keys(this.traitDefinitions).forEach(trait => {
      if (typeof traitScores[trait] !== 'number') {
        errors.push(`${trait} is not a number`);
      } else if (traitScores[trait] < 0 || traitScores[trait] > 10) {
        errors.push(`${trait} score ${traitScores[trait]} is out of range (0-10)`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Utility method to get analysis summary
  getAnalysisSummary(analysisResult) {
    return {
      persona: analysisResult.persona,
      confidence: analysisResult.confidence,
      riskLevel: analysisResult.riskLevel,
      analysisMethod: analysisResult.analysisMethod,
      topTraits: this.getTopTraits(analysisResult.traitScores),
      keyIndicators: analysisResult.keyIndicators?.slice(0, 3) || []
    };
  }

  getTopTraits(traitScores, count = 5) {
    return Object.entries(traitScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([trait, score]) => ({
        trait,
        score: Math.round(score * 10) / 10,
        description: this.traitDefinitions[trait]
      }));
  }
}

// =============================================================================
// EXPORT
// =============================================================================

module.exports = { LLMAnalysisEngine };