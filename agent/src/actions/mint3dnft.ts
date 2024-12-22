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

// Interface for NFT metadata and minting content
export interface NFTMintContent extends Content {
    name: string;
    description: string;
    modelUrl: string;
    recipient: string;
    chain: string;
    actionId?: string;
    status?: string;
}

// Type guard for the NFT content
function isNFTMintContent(
    runtime: IAgentRuntime,
    content: any
): content is NFTMintContent {
    return (
        typeof content.name === "string" &&
        typeof content.description === "string" &&
        typeof content.modelUrl === "string" &&
        typeof content.recipient === "string" &&
        typeof content.chain === "string"
    );
}

// Template to extract NFT details from user input
const nftTemplate = `Extract the NFT details from the user's message and previous 3D model generation. Return only a JSON markdown block.

Example response:
\`\`\`json
{
    "name": "3D Monster Mask NFT",
    "description": "A unique 3D monster mask with horns and sharp teeth",
    "modelUrl": "https://storage.meshy.ai/models/xyz...",
    "recipient": "email:user@example.com:solana",
    "chain": "solana"
}
\`\`\`

{{recentMessages}}

Given the recent messages and the previously generated 3D model URL, extract the NFT details.
Use the 3D model URL from the previous generation step.
The chain should be either "solana", "polygon-amoy", or "ethereum-sepolia" for testnet.
Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "MINT_3D_NFT",
    similes: [
        "MINT_3D_MODEL",
        "CREATE_3D_NFT",
        "MINT_MODEL",
        "CREATE_MODEL_NFT"
    ],
    description: "Mints an NFT from a generated 3D model using Crossmint API",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have a 3D model URL in the recent messages
        const state = await runtime.composeState(message);
        return Array.isArray(state.recentMessages) && state.recentMessages.some(msg =>
            msg.content && typeof msg.content.modelUrl === 'string'
        );
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

            // Extract NFT details including the 3D model URL
            const nftContext = composeContext({
                state,
                template: nftTemplate,
            });

            const nftContent = await generateObjectDeprecated({
                runtime,
                context: nftContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate content format
            if (!isNFTMintContent(runtime, nftContent)) {
                throw new Error("Invalid NFT content format");
            }

            // Get API key from runtime settings
            const apiKey = runtime.getSetting("CROSSMINT_API_KEY");
            if (!apiKey) {
                throw new Error("Crossmint API key not configured");
            }

            // Mint NFT using the 3D model URL
            const mintResponse = await fetch(
                "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts",
                {
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "content-type": "application/json",
                        "x-api-key": apiKey
                    },
                    body: JSON.stringify({
                        recipient: nftContent.recipient,
                        metadata: {
                            name: nftContent.name,
                            image: nftContent.modelUrl,
                            description: nftContent.description,
                            attributes: [
                                {
                                    trait_type: "Model Type",
                                    value: "3D Asset"
                                },
                                {
                                    trait_type: "File Format",
                                    value: "GLB"
                                }
                            ]
                        }
                    })
                }
            );

            if (!mintResponse.ok) {
                throw new Error("Failed to initiate NFT minting");
            }

            const mintResult = await mintResponse.json();
            const actionId = mintResult.actionId;

            // Poll for minting status
            let mintStatus = "pending";
            let attempts = 0;
            const maxAttempts = 12; // 1 minute max waiting time

            while (attempts < maxAttempts) {
                const statusResponse = await fetch(
                    `https://staging.crossmint.com/api/2022-06-09/actions/${actionId}`,
                    {
                        headers: {
                            "x-api-key": apiKey
                        }
                    }
                );

                if (!statusResponse.ok) {
                    throw new Error("Failed to check minting status");
                }

                const statusResult = await statusResponse.json();
                mintStatus = statusResult.status;

                if (mintStatus === "success") {
                    break;
                }

                if (mintStatus === "failed") {
                    throw new Error("NFT minting failed");
                }

                attempts++;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Update content with minting results
            const finalContent: NFTMintContent = {
                ...nftContent,
                actionId,
                status: mintStatus
            };

            if (callback) {
                callback({
                    text: `3D Model NFT Minting ${mintStatus === "success" ? "Completed" : "Initiated"}!\n` +
                          `Name: ${finalContent.name}\n` +
                          `Description: ${finalContent.description}\n` +
                          `Chain: ${finalContent.chain}\n` +
                          `Model URL: ${finalContent.modelUrl}\n` +
                          `Recipient: ${finalContent.recipient}\n` +
                          `Action ID: ${finalContent.actionId}`,
                    content: finalContent
                });
            }

            return true;
        } catch (error) {
            console.error("Error minting 3D NFT:", error);
            if (callback) {
                callback({
                    text: `Error minting 3D NFT: ${error.message}`,
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
                    text: "Generate a 3D monster mask with horns",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've generated a 3D model based on your description!\nPrompt: detailed monster mask with horns\nStyle: realistic\nYou can download the model here: https://storage.meshy.ai/models/abc123",
                    modelUrl: "https://storage.meshy.ai/models/abc123"
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Mint this 3D model as an NFT and send it to user@example.com on Solana testnet",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "3D Model NFT Minting Completed!\nName: 3D Monster Mask NFT\nDescription: A unique 3D monster mask with horns\nChain: solana\nModel URL: https://storage.meshy.ai/models/abc123\nRecipient: email:user@example.com:solana\nAction ID: 6410b5a7-f6f8-4776-9480-13ef83389808",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;