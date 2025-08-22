import React, { useState } from 'react';
import { Search, MapPin, User, Phone, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const SocialWorkerApp = () => {
  const [clientNeeds, setClientNeeds] = useState('');
  const [location, setLocation] = useState('');
  const [demographics, setDemographics] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [functionsUsed, setFunctionsUsed] = useState([]);
  const [error, setError] = useState('');

  // Demo mode for testing without backend
  const [demoMode, setDemoMode] = useState(true);

  // Claude API integration function
  const searchGooglePlaces = async (location, serviceType, keywords = '') => {
    try {
      const GOOGLE_PLACES_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        return { error: "Google Places API key not configured" };
      }

      const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
      
      // Create targeted search queries for different service types
      const searchQueries = {
        "food": `food pantry near ${location} OR food bank near ${location} OR emergency food assistance ${location}`,
        "housing": `homeless shelter near ${location} OR housing assistance ${location} OR transitional housing ${location}`,
        "employment": `job training near ${location} OR employment services ${location} OR workforce development ${location}`,
        "healthcare": `community health center near ${location} OR free clinic ${location} OR health services ${location}`,
        "childcare": `childcare assistance near ${location} OR head start ${location} OR daycare subsidies ${location}`,
        "transportation": `public transportation near ${location} OR bus services ${location} OR transportation assistance ${location}`,
        "financial": `financial assistance near ${location} OR emergency aid ${location} OR utility assistance ${location}`,
        "mental_health": `mental health services near ${location} OR counseling center ${location} OR therapy ${location}`,
        "senior": `senior center near ${location} OR elderly services ${location} OR senior assistance ${location}`,
        "disability": `disability services near ${location} OR accessibility resources ${location}`,
        "legal": `legal aid near ${location} OR free legal services ${location} OR legal assistance ${location}`,
        "education": `adult education near ${location} OR GED classes ${location} OR literacy programs ${location}`
      };
      
      const query = searchQueries[serviceType] || `${serviceType} social services nonprofit near ${location}`;
      
      if (keywords) {
        query += ` ${keywords}`;
      }
      
      // Using a CORS proxy for demo purposes - in production, this should be done server-side
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const params = new URLSearchParams({
        query: query,
        key: GOOGLE_PLACES_API_KEY,
        type: 'establishment'
      });
      
      const response = await fetch(`${proxyUrl}${baseUrl}?${params}`);
      const data = await response.json();
      
      // Filter and format results
      const filteredResults = [];
      if (data.results) {
        for (const place of data.results.slice(0, 10)) {
          filteredResults.push({
            name: place.name || "Unknown",
            address: place.formatted_address || "Address not available",
            phone: "Call for information",
            rating: place.rating || "No rating",
            price_level: place.price_level || "Free/Low-cost",
            business_status: place.business_status || "Unknown",
            place_id: place.place_id,
            types: place.types || []
          });
        }
      }
      
      return {
        results: filteredResults,
        search_query: query,
        total_results: filteredResults.length
      };
      
    } catch (error) {
      return { error: `Google Places API error: ${error.message}` };
    }
  };

  const callClaudeAPI = async (userMessage) => {
    try {
      const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY;
      
      if (!ANTHROPIC_API_KEY) {
        throw new Error("Claude API key not configured");
      }

      const systemPrompt = `You are an expert social services resource assistant helping social workers find resources for their clients.

When given client needs and location:
1. Analyze the client's needs and identify specific service types required
2. For each service type, call the search_google_places function to find local resources
3. Provide specific, actionable recommendations with:
   - Organization name and contact information
   - Address and phone number when available
   - Hours of operation when possible
   - Brief description of services
   - Specific next steps (call today, bring documents, etc.)
   - Any eligibility requirements

Service categories to consider:
- food: Food pantries, food banks, emergency food assistance
- housing: Homeless shelters, transitional housing, rental assistance  
- employment: Job training, workforce development, employment services
- healthcare: Community health centers, free clinics, medical services
- childcare: Daycare assistance, Head Start programs, child care subsidies
- transportation: Public transit, transportation vouchers, medical transport
- financial: Emergency financial assistance, utility help, cash aid
- mental_health: Counseling services, mental health centers, therapy
- senior: Senior centers, elderly services, aging resources
- disability: Disability services, accessibility resources, support services
- legal: Legal aid, free legal services, advocacy
- education: Adult education, GED classes, literacy programs

Always search multiple service types if the client has multiple needs. Be thorough but practical in your recommendations.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ],
          tools: [
            {
              name: 'search_google_places',
              description: 'Search Google Places for social services, nonprofits, food pantries, and community resources',
              input_schema: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'ZIP code, city and state, or specific address'
                  },
                  service_type: {
                    type: 'string',
                    description: 'Type of service: food, housing, employment, healthcare, childcare, transportation, financial, mental_health, senior, disability, legal, education'
                  },
                  keywords: {
                    type: 'string',
                    description: 'Additional search terms to refine the search'
                  }
                },
                required: ['location', 'service_type']
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle tool use in Claude's response
      if (data.content && data.content.some(block => block.type === 'tool_use')) {
        const toolUses = data.content.filter(block => block.type === 'tool_use');
        const toolResults = [];
        
        // Execute each tool call
        for (const toolUse of toolUses) {
          if (toolUse.name === 'search_google_places') {
            const result = await searchGooglePlaces(
              toolUse.input.location,
              toolUse.input.service_type,
              toolUse.input.keywords
            );
            toolResults.push({
              tool_use_id: toolUse.id,
              content: JSON.stringify(result, null, 2)
            });
          }
        }
        
        // Send tool results back to Claude for final response
        const finalResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 2500,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage
              },
              {
                role: 'assistant',
                content: data.content
              },
              {
                role: 'user',
                content: toolResults
              }
            ]
          })
        });

        const finalData = await finalResponse.json();
        
        return {
          recommendations: finalData.content.find(block => block.type === 'text')?.text || 'No response generated',
          functions_used: toolUses.map(tool => tool.name),
          success: true
        };
      } else {
        // No tool use, direct response
        return {
          recommendations: data.content.find(block => block.type === 'text')?.text || 'No response generated',
          functions_used: [],
          success: true
        };
      }
      
    } catch (error) {
      console.error('Claude API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRecommendations('');
    setError('');
    
    try {
      if (demoMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Demo response based on input
        const demoResponse = generateDemoResponse(clientNeeds, location);
        setRecommendations(demoResponse);
        setFunctionsUsed(['search_google_places']);
      } else {
        // Real Claude API call
        const userMessage = `Client Information:
Needs: ${clientNeeds}
Location: ${location}
Demographics: ${demographics || 'Not specified'}

Please search for relevant resources and provide specific recommendations with contact information and next steps.`;

        const result = await callClaudeAPI(userMessage);
        
        if (result.success) {
          setRecommendations(result.recommendations);
          setFunctionsUsed(result.functions_used || []);
        } else {
          setError('Error: ' + result.error);
        }
      }
    } catch (error) {
      setError('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoResponse = (needs, loc) => {
    const needsLower = needs.toLowerCase();
    let response = `📍 RESOURCES FOR CLIENT IN ${loc.toUpperCase()}\n\n`;
    
    if (needsLower.includes('food') || needsLower.includes('hungry') || needsLower.includes('eat')) {
      response += `🍽️ EMERGENCY FOOD ASSISTANCE:\n\n`;
      response += `• Greater Chicago Food Depository\n`;
      response += `  📍 4100 W Ann Lurie Pl, Chicago, IL 60632\n`;
      response += `  📞 (773) 247-3663\n`;
      response += `  🕒 Mon-Fri 9AM-4PM, Sat 8AM-2PM\n`;
      response += `  ➤ NEXT STEPS: Call today for emergency food box. No appointment needed. Bring ID.\n\n`;
      
      response += `• St. Augustine Food Pantry\n`;
      response += `  📍 1210 W Carmen Ave, Chicago, IL 60640\n`;
      response += `  📞 (773) 728-1210\n`;
      response += `  🕒 Tuesdays & Thursdays 10AM-2PM\n`;
      response += `  ➤ NEXT STEPS: Bring ID and proof of address. Serves North Side families.\n\n`;
      
      response += `• Holy Trinity Food Pantry\n`;
      response += `  📍 1120 N Noble St, Chicago, IL 60642\n`;
      response += `  📞 (773) 278-1090\n`;
      response += `  🕒 Wednesdays 4PM-6PM\n`;
      response += `  ➤ NEXT STEPS: Walk-ins welcome. Fresh produce available.\n\n`;
    }
    
    if (needsLower.includes('job') || needsLower.includes('work') || needsLower.includes('employ')) {
      response += `💼 EMPLOYMENT & JOB TRAINING:\n\n`;
      response += `• Chicago Cook Workforce Partnership\n`;
      response += `  📍 69 W Washington St, Chicago, IL 60602\n`;
      response += `  📞 (312) 603-0200\n`;
      response += `  🕒 Mon-Fri 8:30AM-5PM\n`;
      response += `  ➤ NEXT STEPS: Free job training programs. Call to schedule intake appointment.\n\n`;
      
      response += `• Goodwill Industries Career Center\n`;
      response += `  📍 4650 S Cottage Grove Ave, Chicago, IL 60653\n`;
      response += `  📞 (773) 247-6000\n`;
      response += `  🕒 Mon-Fri 9AM-5PM\n`;
      response += `  ➤ NEXT STEPS: Resume help, job search assistance. Drop-in hours available.\n\n`;
    }
    
    if (needsLower.includes('housing') || needsLower.includes('homeless') || needsLower.includes('shelter') || needsLower.includes('rent')) {
      response += `🏠 HOUSING & EMERGENCY SHELTER:\n\n`;
      response += `• Chicago Department of Family Services\n`;
      response += `  📍 1615 W Chicago Ave, Chicago, IL 60622\n`;
      response += `  📞 (312) 743-0300\n`;
      response += `  🕒 Mon-Fri 8AM-5PM\n`;
      response += `  ➤ NEXT STEPS: Emergency rental assistance. Bring lease, ID, and income docs.\n\n`;
      
      response += `• Pacific Garden Mission\n`;
      response += `  📍 1458 S Canal St, Chicago, IL 60607\n`;
      response += `  📞 (312) 922-1462\n`;
      response += `  🕒 24/7 intake\n`;
      response += `  ➤ NEXT STEPS: Emergency shelter available. Men's and women's programs.\n\n`;
    }
    
    if (needsLower.includes('child') || needsLower.includes('daycare') || needsLower.includes('care')) {
      response += `👶 CHILDCARE & FAMILY SERVICES:\n\n`;
      response += `• Illinois Action for Children\n`;
      response += `  📍 4753 N Broadway, Chicago, IL 60640\n`;
      response += `  📞 (312) 823-1100\n`;
      response += `  🕒 Mon-Fri 9AM-5PM\n`;
      response += `  ➤ NEXT STEPS: Childcare subsidies available. Apply online or call for help.\n\n`;
      
      response += `• Chicago Commons - Head Start\n`;
      response += `  📍 915 N Wolcott Ave, Chicago, IL 60622\n`;
      response += `  📞 (773) 342-5330\n`;
      response += `  🕒 Mon-Fri 7:30AM-6PM\n`;
      response += `  ➤ NEXT STEPS: Free preschool for income-eligible families. Call for enrollment.\n\n`;
    }
    
    if (needsLower.includes('health') || needsLower.includes('medical') || needsLower.includes('doctor')) {
      response += `🏥 HEALTHCARE SERVICES:\n\n`;
      response += `• Erie Family Health Centers\n`;
      response += `  📍 1701 W Superior St, Chicago, IL 60622\n`;
      response += `  📞 (312) 666-3494\n`;
      response += `  🕒 Mon-Fri 8AM-8PM, Sat 8AM-4PM\n`;
      response += `  ➤ NEXT STEPS: Sliding fee scale. Accept Medicaid. Call for appointment.\n\n`;
    }
    
    if (needsLower.includes('mental') || needsLower.includes('counsel') || needsLower.includes('therapy')) {
      response += `🧠 MENTAL HEALTH SERVICES:\n\n`;
      response += `• Thresholds Psychiatric Rehabilitation\n`;
      response += `  📍 4101 N Ravenswood Ave, Chicago, IL 60613\n`;
      response += `  📞 (773) 572-5500\n`;
      response += `  🕒 Mon-Fri 9AM-5PM\n`;
      response += `  ➤ NEXT STEPS: Free counseling services. Walk-in crisis services available.\n\n`;
    }
    
    response += `⚠️ IMPORTANT REMINDERS:\n`;
    response += `• Call ahead to verify current hours and availability\n`;
    response += `• Bring ID, proof of address, and income documentation when possible\n`;
    response += `• Many services available regardless of immigration status\n`;
    response += `• Ask about additional resources and referrals when you visit\n`;
    response += `• Some programs may have waiting lists - apply as soon as possible\n\n`;
    
    response += `📞 24/7 CRISIS & EMERGENCY RESOURCES:\n`;
    response += `• 211 Information & Referral: Dial 2-1-1\n`;
    response += `• National Suicide Prevention Lifeline: 988\n`;
    response += `• Crisis Text Line: Text HOME to 741741\n`;
    response += `• Chicago Police Non-Emergency: (311)\n`;
    response += `• Domestic Violence Hotline: 1-800-799-7233`;
    
    return response;
  };

  const exampleQueries = [
    "Single mother with 2 kids needs emergency food assistance and childcare help",
    "Elderly client needs help with utility bills and transportation to medical appointments", 
    "Homeless veteran needs temporary housing and job training programs",
    "Family facing eviction needs rental assistance and food pantry access",
    "Teenager aging out of foster care needs housing and employment services",
    "Client struggling with mental health needs counseling and medical care",
    "Immigrant family needs ESL classes and healthcare services"
  ];

  const handleExampleClick = (example) => {
    setClientNeeds(example);
    setLocation('Chicago, IL 60601');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Social Services Resource Assistant
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered tool to help social workers find local resources for clients
          </p>
          
          {/* Demo Mode Toggle */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <input
              type="checkbox"
              id="demoMode"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="demoMode" className="text-sm text-gray-600">
              Demo Mode (for testing without API keys)
            </label>
          </div>
          
          {/* API Status */}
          <div className="mt-2 text-xs text-gray-500">
            {demoMode ? 'Demo Mode: Showing sample data' : 'Live Mode: Using Claude AI + Google Places API'}
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Client Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  What does the client need? (Required)
                </label>
                <textarea
                  value={clientNeeds}
                  onChange={(e) => setClientNeeds(e.target.value)}
                  placeholder="Describe what help the client needs... (e.g., emergency food, housing assistance, job training, childcare help, etc.)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Client Location (Required)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ZIP code or City, State (e.g., 60601 or Chicago, IL)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Demographics (Optional)
                </label>
                <input
                  type="text"
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="Age, family size, income level, special circumstances, etc."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !clientNeeds || !location}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching for Resources...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Resources
                  </>
                )}
              </button>
            </div>

            {/* Example Queries */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Examples:</h3>
              <div className="space-y-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border transition duration-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">How to Use:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Describe what your client needs in plain language</li>
                <li>• Add their location (ZIP code works best)</li>
                <li>• Click "Find Resources" to get specific recommendations</li>
                <li>• Results include addresses, phone numbers, and next steps</li>
              </ul>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Resource Recommendations
              </h2>
              {functionsUsed.length > 0 && (
                <div className="flex space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    ✓ Google Places
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    ✓ Claude AI
                  </span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 min-h-96 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Claude is analyzing client needs...</p>
                    <p className="text-sm text-gray-500">Searching multiple databases...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {!demoMode && "Check that your API keys are properly configured"}
                    </p>
                  </div>
                </div>
              ) : recommendations ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {recommendations}
                  </pre>
                </div>
              ) : (
                <div className="text-center text-gray-500 h-64 flex items-center justify-center">
                  <div>
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-lg mb-2">Ready to help!</p>
                    <p>Enter client needs and location above to find local resources</p>
                    {demoMode && (
                      <p className="text-sm text-blue-600 mt-2">
                        Currently in demo mode - try the examples above!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {recommendations && (
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => navigator.clipboard.writeText(recommendations)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition duration-200"
                >
                  📋 Copy Results
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head><title>Resource Recommendations</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                          <h1>Social Services Resource Recommendations</h1>
                          <pre style="white-space: pre-wrap; font-family: Arial;">${recommendations}</pre>
                        </body>
                      </html>
                    `);
                    printWindow.print();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition duration-200"
                >
                  🖨️ Print Results
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600">
          <div className="mb-4 flex justify-center space-x-4">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Claude AI Analysis
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Real-Time Database Search
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Local Resource Focus
            </span>
          </div>
          <p className="mb-2">
            Powered by Claude AI and Google Places API
          </p>
          <p className="text-sm">
            Always verify resource information and availability before referring clients
          </p>
        </div>
      </div>
    </div>
  );
};

export default SocialWorkerApp;
