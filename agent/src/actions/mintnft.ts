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
    image: string;
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
        typeof content.image === "string" &&
        typeof content.recipient === "string" &&
        typeof content.chain === "string"
    );
}

// Template to extract NFT details from user input
const nftTemplate = `Extract the NFT details from the user's description. Return only a JSON markdown block.

Example response:
\`\`\`json
{
    "name": "Cool Art NFT",
    "description": "A unique digital artwork featuring vibrant colors",
    "image": "https://picsum.photos/400",
    "recipient": "email:user@example.com:solana",
    "chain": "solana"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the NFT details including name, description, image URL, recipient (email or wallet), and chain.
The chain should be either "solana", "polygon-amoy", or "ethereum-sepolia" for testnet.
Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "MINT_NFT",
    similes: [
        "CREATE_NFT",
        "GENERATE_NFT",
        "DEPLOY_NFT",
        "SEND_NFT"
    ],
    description: "Mints an NFT using Crossmint API and sends it to specified recipient",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true; // Basic validation - could be enhanced to check for required details
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

            // Extract NFT details from message
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

            // Mint NFT
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
                            image: nftContent.image,
                            description: nftContent.description
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
                    text: `NFT Minting ${mintStatus === "success" ? "Completed" : "Initiated"}!\n` +
                          `Name: ${finalContent.name}\n` +
                          `Description: ${finalContent.description}\n` +
                          `Chain: ${finalContent.chain}\n` +
                          `Recipient: ${finalContent.recipient}\n` +
                          `Action ID: ${finalContent.actionId}`,
                    content: finalContent
                });
            }

            return true;
        } catch (error) {
            console.error("Error minting NFT:", error);
            if (callback) {
                callback({
                    text: `Error minting NFT: ${error.message}`,
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
                    text: "Mint an NFT called 'Cool Art' with the description 'A unique digital artwork' and send it to user@example.com on Solana testnet",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll mint your NFT now...",
                    action: "MINT_NFT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "NFT Minting Completed!\nName: Cool Art\nDescription: A unique digital artwork\nChain: solana\nRecipient: email:user@example.com:solana\nAction ID: 6410b5a7-f6f8-4776-9480-13ef83389808",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;