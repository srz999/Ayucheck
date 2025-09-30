import {
    StreamingTextResponse,
    createStreamDataTransformer
} from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        // Extract the `messages` from the body of the request
        const { messages } = await req.json();
        const message = messages.at(-1).content;

        // Create a prompt template that will receive the greeting-enhanced message
        const prompt = PromptTemplate.fromTemplate("{message}");

        const model = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            model: 'gpt-3.5-turbo',
            temperature: 0.8,
            streaming: true,
        });

        const addGreeting = (input: { message: string }) => {
            // log the original input
            console.log("addGreeting input:", input);

            // build the new message with greeting
            const result = {
                message: ` ${input.message} reply as GOOD DAY!`,
            };

            // log the transformed result
            console.log("addGreeting output:", result);

            return result;
        };

        /**
       * Chat models stream message chunks rather than bytes, so this
       * output parser handles serialization and encoding.
       */
        const parser = new HttpResponseOutputParser();

        // Create a proper chain using RunnableSequence
        const chain = RunnableSequence.from([
            addGreeting,    // Transform the input to add greeting
            prompt,         // Apply the prompt template  
            model,          // Send to OpenAI
            parser,         // Parse the streaming response
        ]);

        // Convert the response into a friendly text-stream
        const stream = await chain.stream({ message });

        // Create a custom transform stream to add "GOOD DAY" after each chunk and "Thank you" at the end
        let isFirstChunk = true;
        let hasEnded = false;
        
        const transformStream = new TransformStream({
            transform(chunk, controller) {
                if (isFirstChunk) {
                    console.log("First chunk received, streaming started");
                    isFirstChunk = false;
                }
                // Enqueue the original chunk first
                controller.enqueue(chunk);
                
                // Add "GOOD DAY" after each chunk
                const goodDayChunk = new TextEncoder().encode(" GOOD DAY");
                controller.enqueue(goodDayChunk);
                console.log("Added 'GOOD DAY' after chunk");
            },
            flush(controller) {
                if (!hasEnded) {
                    // Add "Thank you" at the end
                    const thankYouChunk = new TextEncoder().encode(" Thank you");
                    controller.enqueue(thankYouChunk);
                    console.log("Added 'Thank you' at the end");
                    hasEnded = true;
                }
            }
        });

        // Respond with the enhanced stream
        return new StreamingTextResponse(
            stream.pipeThrough(transformStream).pipeThrough(createStreamDataTransformer()),
        );
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: e.status ?? 500 });
    }
}