import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (N. Virginia)
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

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const { transcriptions, dressCode, responseTimes } = body;

    if (!transcriptions || !Array.isArray(transcriptions)) {
      return new Response(
        JSON.stringify({ message: 'Invalid transcriptions data' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a TransformStream for streaming the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start processing in the background
    (async () => {
      try {
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

        // Send processing status
        await writer.write(encoder.encode(JSON.stringify({ status: 'processing' }) + '\n'));

        // Optimize prompt to reduce tokens
        const prompt = `Interview Transcript Analysis Request:

Transcript:
${transcriptText}

${responseTimeAnalysis}

${dressCode ? `Dress Code Assessment: ${dressCode.note}` : ''}

You are conducting an HR evaluation of this candidate. Provide a detailed assessment focusing on:

1. Technical Competency
- Understanding of concepts
- Problem-solving approach
- Technical communication skills

2. Professional Conduct
- Communication clarity
- Response timing and engagement
- Professional demeanor

3. Interview Performance
- Confidence level
- Articulation of ideas
- Handling of difficult questions

4. Overall Evaluation
- Strengths demonstrated
- Areas of concern
- Hiring potential

Format your response as:
1. Start with a 1-5 star rating (★) with half stars (½) allowed
2. Provide a detailed evaluation in each category above
3. Include specific examples from the interview
4. End with a clear hiring recommendation (Strongly Recommend / Recommend with Reservations / Do Not Recommend)

Keep the evaluation objective and focused on hiring decision-making. Do not include improvement suggestions or feedback for the candidate.`;

        const completion = await retryOpenAICall(() => 
          openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are a senior HR evaluator assessing candidates for technical positions. Provide objective, detailed assessments focused on hiring decisions. Be critical and thorough in your evaluation."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            model: "gpt-4",
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
          })
        );

        let summary = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          summary += content;
          // Send chunks as they arrive
          if (content) {
            await writer.write(encoder.encode(JSON.stringify({ 
              type: 'chunk',
              content 
            }) + '\n'));
          }
        }

        // Send final complete summary
        await writer.write(encoder.encode(JSON.stringify({ 
          type: 'complete',
          summary 
        }) + '\n'));
      } catch (error: any) {
        await writer.write(encoder.encode(JSON.stringify({ 
          type: 'error',
          message: 'Error generating summary',
          error: error.message
        }) + '\n'));
      } finally {
        await writer.close();
      }
    })();

    // Return the stream immediately
    return new Response(stream.readable, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        message: 'Error generating summary', 
        error: error.message,
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 