# 🚀 OpenAI Integration Setup Guide

## 1. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

## 2. Add API Key to Environment

1. Create a `.env` file in your project root:
```bash
cp .env.example .env
```

2. Add your OpenAI API key:
```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 3. Test the Integration

1. Start the development server:
```bash
npm run dev
```

2. Open the app and try parsing an email
3. Look for the "AI Ready" indicator in the top right

## 4. API Usage & Costs

### Pricing (as of 2024)
- **GPT-4**: ~$0.03 per 1K tokens input, ~$0.06 per 1K tokens output
- **GPT-3.5-turbo**: ~$0.001 per 1K tokens input, ~$0.002 per 1K tokens output

### Estimated Costs for Email Parsing
- Average email: ~500 tokens input + 100 tokens output = ~$0.02 per parse with GPT-4
- **1000 emails/month ≈ $20 in API costs**

### Cost Optimization Tips
1. **Use GPT-3.5-turbo for MVP** (10x cheaper than GPT-4)
2. **Implement caching** for similar emails
3. **Add rate limiting** to prevent abuse
4. **Use shorter prompts** when possible

## 5. Production Considerations

### Security
- **Never expose API keys in frontend code**
- **Use a backend proxy** for production
- **Implement rate limiting**
- **Add input validation**

### Fallback Strategy
The app automatically falls back to enhanced local parsing if:
- No API key is provided
- API quota is exceeded
- Network issues occur
- API is temporarily unavailable

### Monitoring
- Monitor API usage in OpenAI dashboard
- Set up billing alerts
- Track parsing accuracy
- Log errors for debugging

## 6. Next Steps

After OpenAI integration is working:

1. **Google Calendar API** - Real calendar integration
2. **Supabase Auth** - User authentication
3. **Backend Proxy** - Secure API key handling
4. **Rate Limiting** - Prevent abuse
5. **Analytics** - Track usage and accuracy

## 7. Troubleshooting

### Common Issues

**"OpenAI API key not found"**
- Check your `.env` file exists
- Verify the key starts with `sk-`
- Restart the development server

**"Insufficient quota"**
- Check your OpenAI billing
- Add payment method
- Consider using GPT-3.5-turbo

**"Invalid API key"**
- Regenerate your API key
- Check for extra spaces
- Verify the key is active

**Parsing accuracy issues**
- Try different email formats
- Check the system prompt
- Consider fine-tuning

### Getting Help

1. Check OpenAI documentation
2. Review error logs in browser console
3. Test with simple email examples
4. Contact OpenAI support for API issues

---

**🎉 You're now ready to parse emails with AI!**