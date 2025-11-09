# Security Guidelines

## API Key Management

### Environment Variables
- API keys are stored in environment variables, not in source code
- Use `REACT_APP_METLINK_API_KEY` environment variable
- The `.env` file contains sensitive information and is excluded from git

### Setup Process
1. Copy `.env.example` to `.env`
2. Add your Metlink API key to `.env`
3. Never commit `.env` files to version control

### File Structure
```
.env                 # Contains actual API key (git ignored)
.env.example         # Template file (safe to commit)
.gitignore          # Excludes .env files
```

### Best Practices
- ✅ Use environment variables for API keys
- ✅ Keep `.env` files out of version control  
- ✅ Provide `.env.example` for documentation
- ✅ Add error handling for missing API keys
- ❌ Never hardcode API keys in source code
- ❌ Never commit actual API keys to git

### Production Deployment
For production environments:
- Set environment variables in your hosting platform
- Do not include `.env` files in production builds
- Use platform-specific secret management (Vercel, Netlify, etc.)

### API Key Sources
- Get free API keys from [Metlink Open Data](https://opendata.metlink.org.nz/)
- Register and subscribe to the required GTFS endpoints
- Follow Metlink's usage guidelines and rate limits