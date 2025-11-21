// --- FINAL, CORRECTED CODE USING SCRAPINGBEE ---

import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai@4.53.2';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ... (Deno.serve part is the same) ...
interface QuizRequest {
  email: string;
  secret: string;
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let payload: QuizRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { email, secret, url } = payload;

    if (!email || !secret || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, secret, url' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('student_config')
      .select('secret')
      .eq('email', email)
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Configuration not found' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (config.secret !== secret) {
      return new Response(JSON.stringify({ error: 'Invalid secret' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'info', message: 'Received quiz request', metadata: { url },
    });

    (async () => {
      try {
        await solveQuiz(email, secret, url, supabase);
      } catch (error) {
        await supabase.from('quiz_logs').insert({
          email, quiz_url: url, log_level: 'error', message: 'Quiz solving failed',
          metadata: { error: String(error), stack: error.stack },
        });
      }
    })();

    return new Response(JSON.stringify({ message: 'Quiz processing started', url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});


// THIS IS THE NEW, SIMPLER SOLVER FUNCTION
async function solveQuiz(email: string, secret: string, url: string, supabase: any) {
  const startTime = Date.now();
  
  await supabase.from('quiz_logs').insert({
    email, quiz_url: url, log_level: 'info',
    message: 'Starting quiz solver (using ScrapingBee)',
    metadata: { url },
  });

  try {
    const scrapingBeeApiKey = Deno.env.get('SCRAPINGBEE_API_KEY');
    if (!scrapingBeeApiKey) {
        throw new Error('SCRAPINGBEE_API_KEY is not set in Supabase secrets.');
    }
    
    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'info', message: 'Sending URL to ScrapingBee for rendering...',
    });

    // Use ScrapingBee to render the JS-heavy page and get the final HTML
    const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
    const params = new URLSearchParams({
        api_key: scrapingBeeApiKey,
        url: url,
        render_js: 'true', // This tells ScrapingBee to run the JavaScript
    });

    const response = await fetch(`${scrapingBeeUrl}?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`ScrapingBee API failed with status: ${response.status} ${await response.text()}`);
    }

    const html = await response.text();

    // Parse the returned HTML to get just the text content
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Could not parse HTML from ScrapingBee");
    const pageContent = doc.body.innerText;

    if (!pageContent) {
      throw new Error('Could not extract any text content from the page.');
    }

    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'info', message: 'Successfully extracted page content.',
      metadata: { contentLength: pageContent.length },
    });

    // The rest of the function is the same as before
    const masterPrompt = `
      You are an expert AI data analyst. Your task is to solve the following quiz based on the provided text content from a webpage.
      The question and all necessary data are in the text below.
      Read the entire text, understand the question, find any data, perform the required calculations or analysis, and determine the final answer.
      The text might also specify a URL to submit the answer to.

      IMPORTANT: Respond with ONLY the final answer. Do not include explanations, pleasantries, or any surrounding text.
      For example, if the answer is the number 12345, your entire response should be "12345".
      If the answer is a JSON object, your response should be the raw JSON object.

      --- START OF WEBPAGE TEXT ---
      ${pageContent}
      --- END OF WEBPAGE TEXT ---

      Now, provide the final answer.
    `;

    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'info', message: 'Sending prompt to OpenAI for analysis...',
    });

    const llmResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: masterPrompt }],
    });

    const llmAnswerString = llmResponse.choices[0].message.content;

    if (!llmAnswerString) {
      throw new Error('LLM (OpenAI) returned an empty answer.');
    }
    
    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'info', message: 'Received answer from OpenAI.',
      metadata: { answer: llmAnswerString },
    });
    
    const submitUrlMatch = pageContent.match(/Post your answer to (https:\/\/[^\s]+)/);
    if (!submitUrlMatch || !submitUrlMatch[1]) {
      throw new Error('Could not find the submission URL on the page.');
    }
    const submitUrl = submitUrlMatch[1].trim();

    let finalAnswer: any;
    try {
      finalAnswer = JSON.parse(llmAnswerString);
    } catch (e) {
      finalAnswer = llmAnswerString.trim();
    }
    
    const duration = Date.now() - startTime;
    const submitPayload = { email, secret, url, answer: finalAnswer };

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitPayload),
    });

    const submitResult = await submitResponse.json();

    await supabase.from('quiz_attempts').insert({
      email, quiz_url: url, question: pageContent, answer: finalAnswer,
      correct: submitResult.correct, response: submitResult, duration_ms: duration,
    });

    await supabase.from('quiz_logs').insert({
      email,
      quiz_url: url,
      log_level: submitResult.correct ? 'info' : 'error',
      message: submitResult.correct ? 'Answer correct' : 'Answer incorrect',
      metadata: { submitResult, answer: finalAnswer },
    });

    if (submitResult.url) {
      await solveQuiz(email, secret, submitResult.url, supabase);
    }
  } catch (error) {
    await supabase.from('quiz_logs').insert({
      email, quiz_url: url, log_level: 'error', message: 'A critical error occurred in solveQuiz.',
      metadata: { error: String(error), stack: error.stack },
    });
    throw error;
  }
}