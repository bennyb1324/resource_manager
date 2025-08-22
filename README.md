# Social Worker Resource Assistant

AI-powered tool to help social workers find local resources for clients using Claude AI and Google Places API.

## Setup Instructions

### 1. Get API Keys

**Claude AI (Anthropic):**
- Visit [console.anthropic.com](https://console.anthropic.com)
- Sign up/login and create an API key
- Copy the key (starts with `sk-ant-`)

**Google Places API:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create/select a project
- Enable the Places API
- Create an API key in Credentials

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual API keys:
   ```
   REACT_APP_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   REACT_APP_GOOGLE_PLACES_API_KEY=your-google-api-key-here
   ```

3. **IMPORTANT**: Never commit the `.env` file to version control!

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm start
```

## Usage

1. **Demo Mode**: Toggle on for testing without API keys (uses sample data)
2. **Live Mode**: Toggle off to use real Claude AI + Google Places API
3. Enter client needs and location
4. Get specific resource recommendations with contact info

## Features

- ✅ Claude AI analysis of client needs
- ✅ Real-time Google Places API search
- ✅ Specific contact information and next steps
- ✅ Print and copy functionality
- ✅ Demo mode for testing
- ✅ Mobile-responsive design

## API Costs

- **Claude AI**: ~$0.01-0.05 per search
- **Google Places**: $0.032 per search (first 1000/month free)

## Security Notes

- API keys are stored in environment variables
- Never expose keys in client-side code in production
- Consider using a backend proxy for production deployments
- The `.env` file is gitignored for security

## Troubleshooting

**"API key not configured" error:**
- Check that your `.env` file exists and has the correct key names
- Restart the development server after adding keys
- Verify keys are valid and have proper permissions

**CORS errors with Google Places:**
- This is expected in development
- For production, implement a backend proxy
- Current demo uses CORS proxy for testing

**No results found:**
- Try broader search terms
- Check that the location is valid
- Verify API quotas haven't been exceeded

## Contributing

This tool is designed to help social workers efficiently find resources for their clients. Contributions welcome!