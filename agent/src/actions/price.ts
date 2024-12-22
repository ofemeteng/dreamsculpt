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

// Interface for the formatted price content
export interface BitcoinPriceContent extends Content {
    usdPrice: string;
    gbpPrice: string;
    eurPrice: string;
    lastUpdated: string;
}

// Type guard for the price content
function isBitcoinPriceContent(
    runtime: IAgentRuntime,
    content: any
): content is BitcoinPriceContent {
    return (
        typeof content.usdPrice === "string" &&
        typeof content.gbpPrice === "string" &&
        typeof content.eurPrice === "string" &&
        typeof content.lastUpdated === "string"
    );
}

// Template to format the API response
const priceTemplate = `Format the bitcoin price information in a clear way. Return only a JSON markdown block.

Example response:
\`\`\`json
{
    "usdPrice": "$42,000.00",
    "gbpPrice": "£33,000.00",
    "eurPrice": "€38,000.00",
    "lastUpdated": "2024-12-22 03:05 UTC"
}
\`\`\`

{{recentMessages}}

Given the recent messages and current bitcoin price data, format the price information in USD, GBP, and EUR along with the last update time.
Respond with a JSON markdown block containing only the formatted values.`;

export default {
    name: "GET_BITCOIN_PRICE",
    similes: [
        "CHECK_BTC_PRICE",
        "BITCOIN_PRICE",
        "BTC_PRICE",
        "CRYPTO_PRICE"
    ],
    description: "Fetches and formats the current Bitcoin price from CoinDesk API",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Simple validation - could be enhanced based on needs
        return true;
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

            // Fetch Bitcoin price data
            const response = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
            if (!response.ok) {
                throw new Error("Failed to fetch Bitcoin price");
            }

            const data = await response.json();

            // Add the API response to the state for the template
            state.btcData = data;

            // Compose price context
            const priceContext = composeContext({
                state,
                template: priceTemplate,
            });

            // Generate formatted content
            const content = await generateObjectDeprecated({
                runtime,
                context: priceContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate content format
            //
            if (!isBitcoinPriceContent(runtime, content)) {
                throw new Error("Invalid price content format");
            }

            if (callback) {
                callback({
                    text: `Current Bitcoin Prices:\nUSD: ${content.usdPrice}\nGBP: ${content.gbpPrice}\nEUR: ${content.eurPrice}\nLast Updated: ${content.lastUpdated}`,
                    content
                });
            }

            return true;
        } catch (error) {
            console.error("Error fetching Bitcoin price:", error);
            if (callback) {
                callback({
                    text: `Error fetching Bitcoin price: ${error.message}`,
                    content: { error: error.message }
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the current Bitcoin price?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check the current Bitcoin price for you...",
                    action: "GET_BITCOIN_PRICE",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Current Bitcoin Prices:\nUSD: $96,518.16\nGBP: £77,191.37\nEUR: €92,959.73\nLast Updated: 2024-12-22 03:05 UTC",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;