import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Configure longer timeout
export const config = {
  maxDuration: 60, // Extend timeout to 60 seconds
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum retries for OpenAI API calls
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function retryOpenAICall(fn: () => Promise<any>, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.status === 500 || error?.status === 503)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOpenAICall(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("API endpoint called with method:", req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { transcriptions, dressCode, responseTimes } = req.body;
    console.log("Received transcriptions:", transcriptions);
    console.log("Received dress code info:", dressCode);
    console.log("Received response times:", responseTimes);

    if (!transcriptions || !Array.isArray(transcriptions)) {
      console.error("Invalid transcriptions data received");
      return res.status(400).json({ message: 'Invalid transcriptions data' });
    }

    // Format transcriptions for GPT-4
    const transcriptText = transcriptions
      .map((t: any) => `${t.name}: ${t.message}`)
      .join('\n');
    
    // Calculate response time metrics
    let responseTimeAnalysis = "";
    if (responseTimes && responseTimes.length > 0) {
      const times = responseTimes.map((rt: { responseTime: number }) => rt.responseTime);
      const avgTime = times.reduce((a: number, b: number) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      responseTimeAnalysis = `
Response Time Analysis:
- Average response time: ${avgTime.toFixed(2)} seconds
- Longest response time: ${maxTime.toFixed(2)} seconds
- Shortest response time: ${minTime.toFixed(2)} seconds
- Response time samples: ${responseTimes.length}

Detailed response times:
${responseTimes.map((rt: { aiMessage: string, responseTime: number }) => 
  `- After AI said: "${rt.aiMessage.substring(0, 50)}..."
  User took: ${rt.responseTime.toFixed(2)} seconds to respond`).join('\n')}
`;
    }

    // Optimize prompt to reduce tokens
    const prompt = `Interview Transcript Analysis Request:

Transcript:
${transcriptText}

${responseTimeAnalysis}

${dressCode ? `Dress Code Assessment: ${dressCode.note}` : ''}

Please provide a concise evaluation focusing on:
1. Communication skills and clarity
2. Response quality and relevance
3. Professional demeanor
4. Overall performance

Format the response with:
- A 1-5 star rating (★) with half stars (½) allowed
- Key strengths
- Areas for improvement
- Final recommendation

Keep the response under 1000 words.`;

    const completion = await retryOpenAICall(() => 
      openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert HR interview evaluator. Provide detailed, constructive feedback with specific examples and clear improvement suggestions. Pay special attention to professional presentation and dress code compliance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4",
        temperature: 0.7,
        max_tokens: 2000 // Reduced from 4000 to optimize response time
      })
    );

    const summary = completion.choices[0].message.content;
    console.log("Received summary from OpenAI:", summary);

    return res.status(200).json({ summary });
  } catch (error: any) {
    console.error('Error in summarize API:', error);
    return res.status(500).json({ 
      message: 'Error generating summary', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 