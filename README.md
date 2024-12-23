# DreamSculpt 🎨

> Revolutionizing 3D creation with GenAI | Autonomous AI agent crafting stunning 3D assets, minted as unique NFTs on Solana

DreamSculpt is an innovative AI agent that combines the power of generative AI with blockchain technology to transform text descriptions into stunning 3D assets and seamlessly mint them as NFTs. Built using the Eliza framework, DreamSculpt offers a unique solution for creators, gamers, and digital artists to bring their imaginations to life.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **AI-Powered 3D Generation**: Transform text descriptions into detailed 3D models using Meshy.ai's advanced text-to-3D technology
- **Automated NFT Minting**: Seamless NFT creation on Solana testnet through Crossmint integration
- **Multi-Platform Interaction**: Engage through both chat interface and Twitter
- **Artistic Expertise**: Specialized in gaming assets, architecture, and virtual reality.
- **Real-Time Progress Updates**: Monitor 3D model generation and NFT minting status.
- **Blockchain Integration**: Native support for Solana blockchain transactions.
- **Professional Asset Management**: Automated handling of 3D asset creation pipeline.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm
- Twitter account (for social media integration)
- API keys for:
  - Meshy.ai
  - Crossmint
  - Your chosen LLM provider

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dreamsculpt.git
cd dreamsculpt
```

2. Install dependencies:
```bash
pnpm install  && pnpm build
```

3. Configure environment variables:

Create a `.env` file in the root directory from a copy of `.env.example`  and fill in the following:
```env
# LLM Provider Credentials
# Fill your model provider credentials here

# Meshy
MESHY_API_KEY=your_meshy_api_key

# Crossmint
CROSSMINT_API_KEY=your_crossmint_api_key

# Twitter Integration
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email
```

### Running DreamSculpt

1. Start the main agent:
```bash
pnpm start --character="characters/dreamsculpt.character.json"
```

2. Launch the client interface:
```bash
pnpm start:client
```

3. The Twitter integration runs immediately you start the main agent.

You can access the agent either through the chat interface at `http://localhost:5173` or through the agent Twitter handle `@DreamSculpt3D`

## 💡 Example Usage

### Creating a 3D Model
```
User: Create a detailed monster mask with horns and sharp teeth, make it look realistic
DreamSculpt: I'll generate a 3D model of your monster mask...
[Generates detailed 3D model with specified characteristics]
DreamSculpt: I've generated a 3D model based on your description!
Prompt: detailed monster mask with horns and sharp teeth
Style: realistic
You can download the model here: [model_url]
```

### Minting as NFT
```
User: Mint this 3D model as an NFT and send it to user@example.com on Solana testnet
DreamSculpt: 3D Model NFT Minting Completed!
Name: 3D Monster Mask NFT
Description: A unique 3D monster mask with horns
Chain: solana
Model URL: [model_url]
Recipient: email:user@example.com:solana
Action ID: [action_id]
```

## 🛠 Technical Stack

- **Framework**: Eliza Agent Framework
- **3D Generation**: Meshy.ai API
- **Blockchain**: Solana (Crossmint Staging Environment)
- **NFT Infrastructure**: Crossmint API
- **Social Integration**: Twitter API
- **Client Interface**: React.js
- **State Management**: Eliza's built-in state management
- **File Formats**: GLB (3D models)

## 🏗 Architecture

DreamSculpt operates through two main action handlers:
1. `TEXT_TO_3D`: Processes text descriptions into 3D models
2. `MINT_3D_NFT`: Handles NFT minting and blockchain transactions

The agent maintains conversation context and can:
- Parse complex text descriptions
- Generate appropriate 3D model parameters
- Monitor generation progress
- Handle NFT minting processes
- Manage social media interactions

## 🔐 Security

- Secure API key management through environment variables
- Blockchain transaction security through Crossmint
- Safe social media authentication handling

## 🎯 Future Roadmap

- Support for additional blockchain networks
- Enhanced 3D model customization options
- Integration with more 3D asset marketplaces
- Advanced social media automation features
- Community feature requests and improvements

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌟 Acknowledgments

- Built with [Eliza Framework](https://github.com/ai16z/eliza)
- 3D generation powered by [Meshy.ai](https://meshy.ai)
- NFT minting powered by [Crossmint](https://crossmint.com)

---

*Created for Solana AI Hackathon 2024 - Bringing AI-powered 3D creation to everyone*