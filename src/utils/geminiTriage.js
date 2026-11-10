// Direct Gemini API Integration for Dynamic MCQ Triage & Incident Dispatch Analysis

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * Fallback static MCQs by category if Gemini API is unreachable or rate limited
 */
export const CATEGORY_STATIC_MCQS = {
  "Fire Emergency": [
    {
      id: "q1",
      question: "What is the fire spread and smoke density at the scene?",
      options: [
        { label: "Contained small flames / light white smoke", points: 0 },
        { label: "Active room/vehicle fire with thick dark smoke", points: 2 },
        { label: "Rapidly spreading multi-floor blaze / explosive hazards", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Are individuals trapped or suffering severe burns/smoke inhalation?",
      options: [
        { label: "All occupants evacuated safely outside", points: 0 },
        { label: "1-3 individuals trapped or suffering smoke inhalation", points: 2 },
        { label: "Multiple people trapped on upper floors / severe burns", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "Is there access for heavy fire tenders & water hydrants?",
      options: [
        { label: "Clear wide arterial road access with nearby hydrant", points: 0 },
        { label: "Narrow residential street, minor traffic obstruction", points: 2 },
        { label: "Completely blocked / congested alleyway / zero water source", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "Are there adjacent high-risk structures (fuel pump, hospital, power grid)?",
      options: [
        { label: "Isolated open ground or residential boundary", points: 0 },
        { label: "Dense residential building or commercial shops adjacent", points: 2 },
        { label: "LPG cylinders / chemical storage / transformer directly exposed", points: 4 }
      ]
    }
  ],
  "Building Collapse": [
    {
      id: "q1",
      question: "What is the extent of structural failure?",
      options: [
        { label: "Non-structural wall/balcony plaster crack or shed collapse", points: 0 },
        { label: "Partial floor or beam collapse with suspended slabs", points: 2 },
        { label: "Pancake total collapse of multi-story concrete structure", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Are victims buried under heavy rubble or void spaces?",
      options: [
        { label: "No persons underneath, exterior collapse only", points: 0 },
        { label: "1-4 people visible or calling out from rubble voids", points: 2 },
        { label: "Over 5 people buried deep under collapsed concrete slabs", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "Are there live secondary hazards (gas line leak, electrical spark)?",
      options: [
        { label: "Utilities isolated / no active secondary hazards", points: 0 },
        { label: "Live power cables hanging / water pipe bursting", points: 2 },
        { label: "Ruptured gas lines / strong fuel odor / imminent collapse of adjacent walls", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "Can heavy rescue machinery (cranes, earthmovers) reach the site?",
      options: [
        { label: "Direct broad highway/road approach for cranes", points: 0 },
        { label: "Tight street; only mini excavators or manual cutters can enter", points: 2 },
        { label: "Inaccessible to vehicles; manual extrication only", points: 4 }
      ]
    }
  ],
  "Road Accident": [
    {
      id: "q1",
      question: "What vehicle types are involved in the collision?",
      options: [
        { label: "Two-wheeler or single light passenger car scrape", points: 0 },
        { label: "Multi-car pileup or overturned commercial van", points: 2 },
        { label: "Heavy bus, oil/hazardous chemical tanker, or truck rollover", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Are victims trapped inside crumpled cabin or ejected onto roadway?",
      options: [
        { label: "Victims ambulatory with minor abrasions/cuts", points: 0 },
        { label: "Victims unable to open doors / head injury / fractures", points: 2 },
        { label: "Victims crushed under metal cabin needing hydraulic cutters / unconscious", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "Is traffic gridlocked on the corridor impacting emergency vehicles?",
      options: [
        { label: "Traffic moving freely on remaining open lanes", points: 0 },
        { label: "Moderate slowdown; ambulance can navigate with siren", points: 2 },
        { label: "Complete standstill across all lanes / highway blocked both sides", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "Is there active fuel spillage, fire risk, or hazardous vapor?",
      options: [
        { label: "No fluid leak observed", points: 0 },
        { label: "Minor oil slick or radiator fluid leakage", points: 2 },
        { label: "Large diesel/petrol pool spreading near traffic / fire sparked", points: 4 }
      ]
    }
  ],
  "Flood": [
    {
      id: "q1",
      question: "What is the current flood water depth and current velocity?",
      options: [
        { label: "Ankle to shin deep (under 1 ft), stagnant waterlogging", points: 0 },
        { label: "Waist-deep (2-3 ft), slowly rising into ground floors", points: 2 },
        { label: "Above chest level (4+ ft) or fast-flowing flash flood current", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Are stranded vulnerable residents (infants, elderly, bedridden) present?",
      options: [
        { label: "Able-bodied adults capable of wading to higher ground", points: 0 },
        { label: "Children or elderly stranded on ground floors awaiting help", points: 2 },
        { label: "Bedridden patients, ICU/dialysis dependents cut off on roofs", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "Are power lines submerged or drinking water contaminated?",
      options: [
        { label: "Electricity disconnected safely; municipal supply active", points: 0 },
        { label: "Power grid trip; cell connectivity degraded", points: 2 },
        { label: "Submerged transformers sparking / zero drinking water / sewage mix", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "What rescue conveyance is required to evacuate the zone?",
      options: [
        { label: "Standard high-clearance emergency 4x4 vehicles can enter", points: 0 },
        { label: "Tractors or shallow-draft inflatable rafts required", points: 2 },
        { label: "Motorized NDRF rescue boats or aerial helicopter winch needed", points: 4 }
      ]
    }
  ],
  "Medical Emergency": [
    {
      id: "q1",
      question: "What is the primary patient's consciousness & airway status?",
      options: [
        { label: "Alert, fully oriented, breathing normally", points: 0 },
        { label: "Confused, severe shortness of breath or persistent chest pain", points: 2 },
        { label: "Unresponsive, cardiac arrest / gasping breathing / blocked airway", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Is there severe uncontrolled hemorrhaging or trauma?",
      options: [
        { label: "Minor bleeding controlled with direct pressure", points: 0 },
        { label: "Deep laceration or suspected internal bleeding", points: 2 },
        { label: "Arterial spurting blood / traumatic amputation / profound shock", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "Are automated external defibrillator (AED) or basic life support available?",
      options: [
        { label: "Trained first-aider on-site with first aid kit", points: 0 },
        { label: "Bystanders present; no medical equipment on hand", points: 2 },
        { label: "Solo patient or panicked bystanders without CPR knowledge", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "What is the estimated transit time to the nearest tertiary trauma center?",
      options: [
        { label: "Under 5 minutes / hospital within 1 km", points: 0 },
        { label: "10-20 minutes with regular city traffic", points: 2 },
        { label: "Over 30 minutes / severe peak hour gridlock", points: 4 }
      ]
    }
  ],
  "Other Emergencies": [
    {
      id: "q1",
      question: "What is the primary danger mechanism to life and limb?",
      options: [
        { label: "Minor localized disturbance or property damage only", points: 0 },
        { label: "Threat of physical injury or chemical/environmental exposure", points: 2 },
        { label: "Direct imminent threat of fatality to multiple individuals", points: 4 }
      ]
    },
    {
      id: "q2",
      question: "Is the crisis actively escalating or self-contained?",
      options: [
        { label: "Situation stable, no further expansion", points: 0 },
        { label: "Slowly spreading or drawing crowd buildup", points: 2 },
        { label: "Rapidly spiraling out of control with domino hazards", points: 4 }
      ]
    },
    {
      id: "q3",
      question: "What is the crowd density and panic level in the immediate vicinity?",
      options: [
        { label: "Calm surroundings, few bystanders", points: 0 },
        { label: "Agitated crowd gathering around the hazard area", points: 2 },
        { label: "Active stampede risk or widespread mass panic", points: 4 }
      ]
    },
    {
      id: "q4",
      question: "Can specialized civil defense or police units access the perimeter?",
      options: [
        { label: "Direct unimpeded vehicle access", points: 0 },
        { label: "Partially cordoned or restricted access route", points: 2 },
        { label: "Hostile / blocked / hazardous terrain entry", points: 4 }
      ]
    }
  ]
};

/**
 * Clean Markdown/JSON code blocks returned by Gemini
 */
function extractJsonFromText(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  // Strip ```json and ```
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return JSON.parse(text);
}

/**
 * Call Gemini 2.5 Flash to generate 4 dynamic MCQs
 */
export async function generateDynamicMCQs(title, category, description = '') {
  const fallback = CATEGORY_STATIC_MCQS[category] || CATEGORY_STATIC_MCQS["Other Emergencies"];
  
  if (!GEMINI_API_KEY) {
    return fallback;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const descClause = description?.trim() ? ` with extra site details '${description.trim().slice(0, 300)}'` : '';
  const prompt = `Generate 4 multiple-choice triage questions (MCQs) specific to an emergency incident titled '${title || category}' under category '${category}'${descClause}. 2 questions must cover site-specific hazards & victim status, and 2 must cover location accessibility & hazard spread. Return raw JSON array ONLY in this structure: [{"id": "q1", "question": "...", "options": [{"label": "...", "points": 0}, {"label": "...", "points": 2}, {"label": "...", "points": 4}]}]`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout for crisp UX

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Gemini MCQ generation failed with status", response.status);
      return fallback;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = extractJsonFromText(candidateText);

    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 4).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question,
        options: (q.options || []).map(opt => ({
          label: opt.label || String(opt),
          points: typeof opt.points === 'number' ? opt.points : 2
        }))
      }));
    }
    return fallback;
  } catch (err) {
    console.warn("Gemini dynamic MCQ generation error (using fallback):", err);
    return fallback;
  }
}

/**
 * Call Gemini 2.5 Flash to perform final triage & incident dispatch analysis
 */
export async function analyzeIncidentWithGemini({
  title,
  category,
  peopleAffected,
  mcqAnswers = [],
  description = "",
  score = 0
}) {
  // Local fallback if API fails
  const localSeverity = score >= 11 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low';
  const defaultUnits = {
    'Fire Emergency': ['Fire & Rescue Engine', 'Ambulance Unit 108', 'Breathing Apparatus Crew'],
    'Building Collapse': ['NDRF Search & Rescue', 'Heavy Cranes / Hydraulic Extrication', 'Trauma Ambulance'],
    'Road Accident': ['Highway Patrol Police', 'Ambulance 108', 'Hydraulic Cutter Rescue'],
    'Flood': ['Inflatable Rescue Boat Team', 'NDRF Evacuation Platoon', 'Medical Relief Mobile Unit'],
    'Medical Emergency': ['Advanced Life Support (ALS) Ambulance', 'Paramedic Rapid Response', 'Hospital Trauma Alert'],
    'Other Emergencies': ['Local Police Station Patrol', 'Civil Defense First Responders', 'Emergency Medical Team']
  };

  const fallbackResult = {
    severity: localSeverity,
    ai_summary: `Algorithmic triage score ${score}/16: ${localSeverity} tier dispatch warranted for ${peopleAffected} casualty(s) in ${category}.`,
    recommended_units: defaultUnits[category] || ['Local Emergency Responders', 'Police Patrol']
  };

  if (!GEMINI_API_KEY) {
    return fallbackResult;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const mcqSummary = mcqAnswers.map((a, idx) => `Q${idx + 1}: ${a.question} -> Answer: ${a.selectedLabel} (${a.points} pts)`).join("; ");

  const prompt = `Analyze this live emergency incident report and return raw JSON ONLY:
Incident Title: ${title}
Category: ${category}
People Affected: ${peopleAffected}
Calculated Triage Score: ${score}/16
Triage Questionnaire Responses: ${mcqSummary}
Additional Description: ${description}

Return raw JSON strictly matching this schema:
{
  "severity": "Low" | "Medium" | "High" | "Critical",
  "ai_summary": "Single concise sentence situational analysis with tactical priority",
  "recommended_units": ["Unit 1", "Unit 2", "Unit 3"]
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Gemini incident analysis failed with status", response.status);
      return fallbackResult;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = extractJsonFromText(candidateText);

    if (parsed && parsed.severity && parsed.ai_summary) {
      return {
        severity: ['Critical', 'High', 'Medium', 'Low'].includes(parsed.severity) ? parsed.severity : localSeverity,
        ai_summary: parsed.ai_summary,
        recommended_units: Array.isArray(parsed.recommended_units) && parsed.recommended_units.length > 0
          ? parsed.recommended_units
          : fallbackResult.recommended_units
      };
    }
    return fallbackResult;
  } catch (err) {
    console.warn("Gemini triage analysis error (using fallback):", err);
    return fallbackResult;
  }
}

/**
 * Standard category mapping helper for voice-extracted categories
 */
export const VOICE_CATEGORY_MAP = {
  'Fire': 'Fire Emergency',
  'Fire Emergency': 'Fire Emergency',
  'Building Collapse': 'Building Collapse',
  'Collapse': 'Building Collapse',
  'Road Accident': 'Road Accident',
  'Accident': 'Road Accident',
  'Flood': 'Flood',
  'Medical': 'Medical Emergency',
  'Medical Emergency': 'Medical Emergency',
  'Other': 'Other Emergencies',
  'Other Emergencies': 'Other Emergencies'
};

/**
 * Process Raw Spoken Voice Audio & Transcript directly using Gemini 2.5 Flash
 * 
 * Extracts structured emergency data:
 * - title
 * - category ('Fire Emergency', 'Medical Emergency', 'Road Accident', 'Flood', 'Building Collapse', 'Other Emergencies')
 * - description
 * - casualties (number)
 * - severity ('Low' | 'Medium' | 'High' | 'Critical')
 * - ai_summary (1 concise situational sentence)
 * - recommended_units (array of tactical responders)
 */
export async function processVoiceReportWithGemini({
  audioBase64,
  mimeType = 'audio/webm',
  transcript = '',
  language = 'en-US'
}) {
  const defaultUnits = {
    'Fire Emergency': ['Tambaram Fire Tender', 'Ambulance 108', 'Police Patrol'],
    'Building Collapse': ['NDRF Search & Rescue', 'Heavy Cranes Extrication', 'Trauma Ambulance'],
    'Road Accident': ['Highway Patrol 104', 'Ambulance 108', 'Hydraulic Rescue'],
    'Flood': ['Inflatable Rescue Boat Team', 'NDRF Evacuation Platoon', 'Mobile Clinic'],
    'Medical Emergency': ['108 ALS Ambulance', 'Paramedic Rapid Response', 'Hospital Trauma Alert'],
    'Other Emergencies': ['Sector Police Patrol', 'Civil Defense Unit', 'Local Responders']
  };

  // Robust heuristic fallback if API is unreachable
  const inferFallback = () => {
    const text = (transcript || '').toLowerCase();
    let cat = 'Other Emergencies';
    let sev = 'Medium';
    let cas = 1;

    if (text.includes('fire') || text.includes('smoke') || text.includes('blaze') || text.includes('burn') || text.includes('தீ')) {
      cat = 'Fire Emergency';
      sev = 'High';
    } else if (text.includes('collapse') || text.includes('building') || text.includes('rubble') || text.includes('slab') || text.includes('இடிந்து')) {
      cat = 'Building Collapse';
      sev = 'Critical';
      cas = 4;
    } else if (text.includes('accident') || text.includes('crash') || text.includes('car') || text.includes('truck') || text.includes('bike') || text.includes('விபத்து')) {
      cat = 'Road Accident';
      sev = 'High';
      cas = 2;
    } else if (text.includes('flood') || text.includes('water') || text.includes('drown') || text.includes('வெள்ளம்')) {
      cat = 'Flood';
      sev = 'High';
      cas = 5;
    } else if (text.includes('heart') || text.includes('cardiac') || text.includes('unconscious') || text.includes('blood') || text.includes('bleed') || text.includes('மருத்துவ')) {
      cat = 'Medical Emergency';
      sev = 'Critical';
    }

    if (text.includes('critical') || text.includes('trapped') || text.includes('emergency') || text.includes('urgent') || text.includes('dying')) {
      sev = 'Critical';
    }

    // Try extracting numbers for casualties
    const numMatch = text.match(/(\d+)\s*(people|persons|victims|casualties|passengers|injured)/i);
    if (numMatch && numMatch[1]) {
      cas = parseInt(numMatch[1], 10);
    }

    const shortTitle = transcript && transcript.length > 5
      ? (transcript.length > 50 ? transcript.slice(0, 47) + '...' : transcript)
      : `Spoken Emergency Voice Report (${cat || 'Medical/Other'})`;

    return {
      title: shortTitle,
      category: cat || 'Medical Emergency',
      description: transcript || 'Spoken emergency voice recording captured. Raw voice audio attached for manual dispatch operator review.',
      casualties: cas || 1,
      severity: 'High', // Default High severity for fail-safe response safety
      ai_summary: '🎙️ Raw Voice Recording Attached (Pending Manual Admin Review)',
      recommended_units: defaultUnits[cat] || ['108 ALS Ambulance', 'Sector Patrol Unit'],
      is_fallback: true
    };
  };

  const fallback = inferFallback();

  if (!GEMINI_API_KEY) {
    return fallback;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const promptText = `You are an emergency response AI. Process this raw spoken emergency report audio/transcript. Extract and return JSON ONLY with keys: 'title', 'category' ('Fire'|'Medical'|'Accident'|'Flood'|'Collapse'|'Other'), 'description', 'casualties' (number), 'severity' ('Low'|'Medium'|'High'|'Critical'), 'ai_summary' (1 sentence), and 'recommended_units' (array).

Language: ${language}
Spoken Voice Transcript (if available): "${transcript || ''}"

Return raw JSON strictly matching this schema:
{
  "title": "Concise 3-6 word incident title",
  "category": "Fire" | "Medical" | "Accident" | "Flood" | "Collapse" | "Other",
  "description": "Clear professional emergency description synthesizing the voice report",
  "casualties": 1,
  "severity": "Low" | "Medium" | "High" | "Critical",
  "ai_summary": "1 concise sentence situational tactical analysis",
  "recommended_units": ["Unit 1", "Unit 2"]
}`;

  // Build Gemini request parts
  const parts = [];

  // If audioBase64 is provided, attach audio inlineData
  if (audioBase64) {
    // Strip data URI prefix if present (e.g., "data:audio/webm;base64,")
    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    parts.push({
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanBase64
      }
    });
  }

  // Text instruction part
  parts.push({ text: promptText });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 600
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Gemini voice processing failed with status:", response.status);
      return fallback;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = extractJsonFromText(candidateText);

    if (parsed && (parsed.title || parsed.description)) {
      const mappedCategory = VOICE_CATEGORY_MAP[parsed.category] || fallback.category;
      const validSeverity = ['Critical', 'High', 'Medium', 'Low'].includes(parsed.severity)
        ? parsed.severity
        : fallback.severity;
      const casualties = typeof parsed.casualties === 'number' && parsed.casualties >= 0
        ? parsed.casualties
        : fallback.casualties;

      return {
        title: parsed.title || fallback.title,
        category: mappedCategory,
        description: parsed.description || fallback.description,
        casualties,
        severity: validSeverity,
        ai_summary: parsed.ai_summary || fallback.ai_summary,
        recommended_units: Array.isArray(parsed.recommended_units) && parsed.recommended_units.length > 0
          ? parsed.recommended_units
          : (defaultUnits[mappedCategory] || fallback.recommended_units)
      };
    }

    return fallback;
  } catch (err) {
    console.warn("Gemini voice report processing error (using fallback):", err);
    return fallback;
  }
}


