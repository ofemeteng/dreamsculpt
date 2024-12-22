import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State
} from "@ai16z/eliza";
import { composeContext } from "@ai16z/eliza";
import { generateObjectDeprecated } from "@ai16z/eliza";

// Interface for the generated 3D model content
export interface Text3DContent extends Content {
    prompt: string;
    artStyle: string;
    negativePrompt: string;
    modelUrl: string;
    previewTaskId: string;
}

// Type guard for the 3D content
function isText3DContent(
    runtime: IAgentRuntime,
    content: any
): content is Text3DContent {
    return (
        typeof content.prompt === "string" &&
        typeof content.artStyle === "string" &&
        typeof content.negativePrompt === "string" &&
        typeof content.modelUrl === "string" &&
        typeof content.previewTaskId === "string"
    );
}

// Template to extract key features from user description
const promptTemplate = `Extract the key features for 3D model generation from the user's description. Return only a JSON markdown block.

Example response:
\`\`\`json
{
    "prompt": "detailed monster mask with horns and sharp teeth",
    "artStyle": "realistic",
    "negativePrompt": "low quality, low resolution, low poly, ugly"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the main description and important features for the 3D model.
Focus on physical characteristics, style, and important details.
Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "TEXT_TO_3D",
    similes: [
        "GENERATE_3D",
        "CREATE_3D_MODEL",
        "MAKE_3D",
        "MODEL_FROM_TEXT"
    ],
    description: "Generates a 3D model from a text description using Meshy API",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true; // Basic validation - could be enhanced to check for description presence
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // Extract 3D model requirements from description
            const promptContext = composeContext({
                state,
                template: promptTemplate,
            });

            const promptContent = await generateObjectDeprecated({
                runtime,
                context: promptContext,
                modelClass: ModelClass.LARGE,
            });

            // Get API key from runtime settings
            const apiKey = runtime.getSetting("MESHY_API_KEY");
            if (!apiKey) {
                throw new Error("Meshy API key not configured");
            }

            // Generate preview model
            const previewResponse = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: "preview",
                    prompt: promptContent.prompt,
                    negative_prompt: promptContent.negativePrompt,
                    art_style: promptContent.artStyle,
                    should_remesh: true
                })
            });

            if (!previewResponse.ok) {
                throw new Error("Failed to initiate 3D model generation");
            }

            const { result: taskId } = await previewResponse.json();

            // Poll for task completion
            let modelUrl = '';
            while (true) {
                const taskResponse = await fetch(
                    `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`,
                    {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    }
                );

                if (!taskResponse.ok) {
                    throw new Error("Failed to check task status");
                }

                const taskStatus = await taskResponse.json();

                if (taskStatus.status === "SUCCEEDED") {
                    modelUrl = taskStatus.model_urls.glb;
                    break;
                }

                if (taskStatus.status === "FAILED") {
                    throw new Error("Model generation failed");
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Prepare content response
            const content: Text3DContent = {
                text: `Generated 3D model from prompt: ${promptContent.prompt}`,
                prompt: promptContent.prompt,
                artStyle: promptContent.artStyle,
                negativePrompt: promptContent.negativePrompt,
                modelUrl,
                previewTaskId: taskId
            };

            if (callback) {
                callback({
                    text: `I've generated a 3D model based on your description!\nPrompt: ${content.prompt}\nStyle: ${content.artStyle}\nYou can download the model here: ${content.modelUrl}`,
                    content
                });
            }

            return true;
        } catch (error) {
            console.error("Error generating 3D model:", error);
            if (callback) {
                callback({
                    text: `Error generating 3D model: ${error.message}`,
                    content: { error: error.message }
                });
            }
            return false;
        }
    },

    // examples
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a detailed monster mask with horns and sharp teeth, make it look realistic",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll generate a 3D model of your monster mask...",
                    action: "TEXT_TO_3D",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've generated a 3D model based on your description!\nPrompt: detailed monster mask with horns and sharp teeth\nStyle: realistic\nYou can download the model here: https://storage.meshy.ai/models/xyz...",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;