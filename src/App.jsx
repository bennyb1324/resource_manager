import React, { useState } from 'react';
import { Search, MapPin, User, Phone, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ADD YOUR ACTUAL API KEYS HERE - Replace these placeholder values
const OPENAI_API_KEY = 'sk-your-actual-openai-key-here';
const GOOGLE_PLACES_API_KEY = 'your-actual-google-key-here';

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

  // OpenAI GPT-4 API integration function
  const callOpenAIAPI = async (userMessage) => {
    try {
      if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-your-actual-openai-key-here') {
        throw new Error("OpenAI API key not configured - please add your real API key");
      }

      const systemPrompt = `You are an expert social services resource assistant helping social workers find resources for their clients.

When given client needs and location, provide specific recommendations including:
- Types of services needed (food assistance, housing, employment, healthcare, etc.)
- Specific organizations and resource types to look for in their area
- Next steps and documentation typically needed
- Local resource types commonly available
- Eligibility considerations
- Emergency contacts when appropriate

Format your response clearly with:
- Service categories (🍽️ FOOD ASSISTANCE, 🏠 HOUSING, 💼 EMPLOYMENT, etc.)
- Specific next steps with action items
- Contact information guidance
- Required documentation
- Eligibility requirements

Be specific and actionable in your recommendations. Focus on practical steps the social worker can take immediately.`;

      console.log('Calling OpenAI GPT-4 API...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'User-Agent': 'SocialWorkerApp/1.0'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      console.log('OpenAI API response:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      return {
        recommendations: data.choices[0].message.content || 'No response generated',
        functions_used: ['gpt4_analysis'],
        success: true
      };
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Google Places API integration function
  const searchLocalResources = async (query, location) => {
    try {
      if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'your-actual-google-key-here') {
        console.log('Google Places API key not configured - skipping local search');
        return { success: false, error: 'Google Places API key not configured' };
      }

      // First, get coordinates from the location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_PLACES_API_KEY}`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        throw new Error('Could not find location coordinates');
      }
      
      const { lat, lng } = geocodeData.results[0].geometry.location;
      
      // Search for relevant places nearby
      const searchQueries = generateSearchQueries(query);
      const allResults = [];
      
      for (const searchQuery of searchQueries) {
        try {
          const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery + ' near ' + location)}&location=${lat},${lng}&radius=10000&key=${GOOGLE_PLACES_API_KEY}`;
          
          const placesResponse = await fetch(placesUrl);
          const placesData = await placesResponse.json();
          
          if (placesData.results) {
            // Get detailed info for top results
            for (const place of placesData.results.slice(0, 3)) {
              try {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,opening_hours,website,rating&key=${GOOGLE_PLACES_API_KEY}`;
                
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();
                
                if (detailsData.result) {
                  allResults.push({
                    name: detailsData.result.name,
                    address: detailsData.result.formatted_address,
                    phone: detailsData.result.formatted_phone_number || 'Phone not available',
                    website: detailsData.result.website || 'Website not available',
                    rating: detailsData.result.rating || 'No rating',
                    hours: detailsData.result.opening_hours?.weekday_text || ['Hours not available'],
                    category: searchQuery
                  });
                }
              } catch (error) {
                console.log('Error getting place details:', error);
              }
            }
          }
        } catch (error) {
          console.log('Error searching places for:', searchQuery, error);
        }
      }
      
      return {
        success: true,
        results: allResults
      };
      
    } catch (error) {
      console.error('Google Places API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Helper function to generate search queries based on client needs
  const generateSearchQueries = (clientNeeds) => {
    const needsLower = clientNeeds.toLowerCase();
    const queries = [];
    
    if (needsLower.includes('food') || needsLower.includes('hungry') || needsLower.includes('eat')) {
      queries.push('food bank', 'food pantry', 'soup kitchen');
    }
    
    if (needsLower.includes('job') || needsLower.includes('work') || needsLower.includes('employ')) {
      queries.push('job training center', 'employment services', 'career center');
    }
    
    if (needsLower.includes('housing') || needsLower.includes('homeless') || needsLower.includes('shelter')) {
      queries.push('homeless shelter', 'housing assistance', 'social services');
    }
    
    if (needsLower.includes('child') || needsLower.includes('daycare')) {
      queries.push('childcare center', 'head start program', 'family services');
    }
    
    if (needsLower.includes('health') || needsLower.includes('medical') || needsLower.includes('doctor')) {
      queries.push('community health center', 'free clinic', 'medical clinic');
    }
    
    if (needsLower.includes('mental') || needsLower.includes('counsel') || needsLower.includes('therapy')) {
      queries.push('mental health center', 'counseling center', 'community mental health');
    }
    
    // Default fallback
    if (queries.length === 0) {
      queries.push('social services', 'community services', 'nonprofit organization');
    }
    
    return queries;
  };

  // Format Google Places results for display
  const formatGooglePlacesResults = (placesResults) => {
    if (!placesResults || placesResults.length === 0) {
      return '\n🔍 LOCAL RESOURCES:\nNo specific local resources found through Google Places. Please check 211 or local directories.\n';
    }
    
    let formatted = '\n🔍 LOCAL RESOURCES FOUND:\n\n';
    
    const groupedByCategory = placesResults.reduce((acc, place) => {
      if (!acc[place.category]) {
        acc[place.category] = [];
      }
      acc[place.category].push(place);
      return acc;
    }, {});
    
    Object.entries(groupedByCategory).forEach(([category, places]) => {
      formatted += `📍 ${category.toUpperCase()}:\n\n`;
      
      places.forEach(place => {
        formatted += `• ${place.name}\n`;
        formatted += `  📍 ${place.address}\n`;
        formatted += `  📞 ${place.phone}\n`;
        if (place.website !== 'Website not available') {
          formatted += `  🌐 ${place.website}\n`;
        }
        if (place.rating !== 'No rating') {
          formatted += `  ⭐ Rating: ${place.rating}/5\n`;
        }
        formatted += `  🕒 Hours: ${Array.isArray(place.hours) ? place.hours[0] : place.hours}\n`;
        formatted += `  ➤ NEXT STEPS: Call ahead to verify services and availability\n\n`;
      });
    });
    
    return formatted;
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
        setFunctionsUsed(['demo_mode']);
      } else {
        // Real API calls - both OpenAI and Google Places
        const userMessage = `Client Information:
Needs: ${clientNeeds}
Location: ${location}
Demographics: ${demographics || 'Not specified'}

Please provide specific resource recommendations for this client, including what types of services to look for, specific organizations or resource types commonly available in this area, and actionable next steps.`;

        console.log('Sending request to OpenAI GPT-4...');
        
        // Call both APIs concurrently
        const [gptResult, placesResult] = await Promise.all([
          callOpenAIAPI(userMessage),
          searchLocalResources(clientNeeds, location)
        ]);
        
        let functionsUsed = [];
        let finalResponse = '';
        
        if (gptResult.success) {
          finalResponse = gptResult.recommendations;
          functionsUsed.push('gpt4_analysis');
        } else {
          setError('OpenAI Error: ' + gptResult.error);
          return;
        }
        
        // Add Google Places results if available
        if (placesResult.success && placesResult.results.length > 0) {
          const googlePlacesFormatted = formatGooglePlacesResults(placesResult.results);
          finalResponse += googlePlacesFormatted;
          functionsUsed.push('google_places');
        } else if (placesResult.error && !placesResult.error.includes('not configured')) {
          // Only show error if it's not just missing API key
          finalResponse += '\n⚠️ Note: Could not retrieve local Google Places data: ' + placesResult.error;
        }
        
        // Add disclaimer
        finalResponse += '\n\n📋 IMPORTANT DISCLAIMER:\n';
        finalResponse += '• Always call ahead to verify current services, hours, and eligibility\n';
        finalResponse += '• Information is based on AI analysis and may not be complete\n';
        finalResponse += '• Consider calling 2-1-1 for additional local resources\n';
        finalResponse += '• Verify all contact information before referring clients';
        
        setRecommendations(finalResponse);
        setFunctionsUsed(functionsUsed);
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
          
          {/* Updated API Status */}
          <div className="mt-2 text-xs text-gray-500">
            {demoMode 
              ? 'Demo Mode: Showing sample data' 
              : `Live Mode: GPT-4 ${GOOGLE_PLACES_API_KEY !== 'your-actual-google-key-here' ? '+ Google Places' : '(Google Places not configured)'}`
            }
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
                    {demoMode ? 'Generating Demo Results...' : 'AI is analyzing client needs...'}
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
                <li>• Results include service types and next steps</li>
                <li>• {demoMode ? 'Demo mode shows sample data' : 'Live mode uses GPT-4 AI + Google Places'}</li>
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
                  {functionsUsed.includes('gpt4_analysis') && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      ✓ GPT-4 AI
                    </span>
                  )}
                  {functionsUsed.includes('google_places') && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      ✓ Google Places
                    </span>
                  )}
                  {demoMode && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      ✓ Demo Mode
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 min-h-96 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      {demoMode ? 'Generating demo results...' : 'AI is analyzing client needs...'}
                    </p>
                    <p className="text-sm text-gray-500">This may take a few seconds</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-2">{error}</p>
                    <p className="text-sm text-gray-500">
                      {!demoMode && "Make sure to add your actual API keys to the code"}
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
                    {!demoMode && (
                      <p className="text-sm text-green-600 mt-2">
                        Live mode - add your API keys to test real AI responses!
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
          {/* Updated Footer Status Indicators */}
          <div className="mb-4 flex justify-center space-x-4">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              GPT-4 AI Analysis
            </span>
            <span className="flex items-center">
              <CheckCircle className={`w-4 h-4 mr-1 ${
                GOOGLE_PLACES_API_KEY !== 'your-actual-google-key-here' ? 'text-green-500' : 'text-gray-400'
              }`} />
              Google Places {GOOGLE_PLACES_API_KEY !== 'your-actual-google-key-here' ? '✓' : '(Add API Key)'}
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Professional Interface
            </span>
          </div>
          <p className="mb-2">
            Powered by OpenAI GPT-4 {GOOGLE_PLACES_API_KEY !== 'your-actual-google-key-here' ? '+ Google Places API' : '(Google Places integration ready)'}
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
