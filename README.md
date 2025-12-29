<p align="center">
<img src="public\img_assets\icon.png" alt="Logo of Pokemon Dungeons" width="200" height="200">
</p>

 # Pokemon Dungeons

> _In fulfillment of Bootcamp requirements as the third and final project._

#### Blockchain-Integrated Pokémon

This web application serves as a technical proof of concept demonstrating modern Web3 and blockchain technologies through a Pokémon-inspired, turn-based game. Users can mint, own, and trade Pokémon as ERC-721 Non-Fungible Tokens, with each asset existing as a verifiable on-chain entity fully controlled by the user’s connected wallet.

> [!WARNING]
> This system is developed strictly as a proof of concept and is not intended for commercial deployment. If adapted for commercial use, all NFT metadata, tokenized assets, artwork, names, and associated intellectual property must be replaced with original or properly licensed content.

> [!CAUTION]
> _The developer disclaims any liability for any legal, intellectual property, or regulatory issues arising from the minting, trading, or use of NFTs within this project._

---

## Project Requirements

##### The project must integrate at least two of the following features:

- [x] Non-Fungible Tokens (NFTs) for Pokémon
- [ ] Bitcoin as In-Game Currency
- [x] Play-to-Earn (P2E) Mechanics
- [x] Decentralized Marketplace for Trading Pokémon and Items
- [ ] Leaderboards and Achievements Linked to Blockchain

> [!NOTE]
> As advised, apart from the Round-Robin style of gameplay, other gameplay modes are also allowed.

## Features

### 1. NFT Minting and Marketplace (ERC-721 Standard)

Pokémon are implemented as ERC-721 compliant NFTs, ensuring each minted Pokémon is provably unique and non-interchangeable. Minting is handled through smart contract functions deployed on a blockchain test network, allowing users to create new Pokémon directly from the application.

Ownership, transfers, and trades are fully managed on-chain, meaning players retain full control over their assets independent of the application itself. A built-in decentralized marketplace enables users to list, buy, and sell Pokémon NFTs, demonstrating real-world NFT trading mechanics such as wallet-based transactions and ownership verification.

### 2. Play-to-Earn (P2E) mechanics

During gameplay, when a wild Pokémon encounter occurs, the wild Pokémon’s stats and moveset are automatically generated. Upon defeating the Pokémon, trainers may attempt to capture it, mint it as an NFT on the blockchain, and choose whether to retain it for gameplay or list it on the marketplace for sale.

### 3. MetaMask Wallet Integration

MetaMask is used as the primary Web3 wallet provider for blockchain interactions within the application. Users connect their MetaMask wallet to authenticate ownership, sign transactions, and interact with smart contracts directly from the browser.

This integration enables secure NFT minting, transfers, and marketplace transactions without exposing private keys to the application. All blockchain operations require explicit user confirmation through MetaMask, reinforcing user-controlled asset management and decentralized security principles.

### 4. Firebase Integration

Firebase and Firestore are used to manage off-chain data that does not belong on the blockchain. This includes user authentication, wallet address mapping, player profiles, and auxiliary game data.

### 5. Stat Randomization and Asset Uniqueness

Each Pokémon NFT is generated with randomized attributes, including stats and movesets, ensuring that no two Pokémon are ever identical. Because these attributes are tied to the minted NFT, they persist across transfers and trades. This allows Pokémon to retain their individual identity and value, whether held by the original minter or acquired through the marketplace.

## Technical Purpose

This project demonstrates:

- Practical implementation of ERC-721 smart contracts
- Secure wallet-based authentication and ownership validation using MetaMask
- Integration of blockchain assets with a modern web stack

## Getting Started

### Prerequisites:

- <a href="https://metamask.io/">Metamask Wallet</a>
- <a href="https://nodejs.org/en">Node.js | NPM</a>
- <a href="https://console.firebase.google.com">Firebase/Firestore</a>

### Setup:
1. Clone this repo to your chosen directory.
```Bash
Git clone https://github.com/MiztahBoneZ/Pokemon-Web3.git
```
2. Install dependencies.
```Bash
npm install
```
3. Create and setup a firebase project.
4. Create a .env file on the root folder of the project and use the configuration you got from the firebase setup, follow this format for the .env (remove the square bracket):
```env
VITE_FIREBASE_API_KEY=[YOUR API KEY]
VITE_FIREBASE_AUTH_DOMAIN=[YOUR AUTH DOMAIN]
VITE_FIREBASE_PROJECT_ID=[YOUR PROJECT ID]
VITE_FIREBASE_STORAGE_BUCKET=[YOUR STORAGE BUCKET]
VITE_FIREBASE_MESSAGING_SENDER_ID=[YOUR MESSAGING  SENDER ID]
VITE_FIREBASE_APP_ID=[YOUR APP ID]
VITE_FIREBASE_MEASUREMENT_ID=[YOUR MEASUREMENT ID]
```
5. In MetaMask ensure that your chosen token and Network is added/enabled, the default token is the ETH Sepolia Testnet Token
6. To run the app, enter this to your terminal.
```bash
npm run dev
```
After executing the command you should see a few lines i.e. Local and Network, ctrl click the link in the Local to view the web app.

### Optional:
Rather than using the contractID in the source code you can setup your own contract using <a href="https://remix.ethereum.org/">Remix</a>

Steps:
1. Use the PokeNFT.sol file inside the /Project_Artifacts folder as a reference for creating your own contract.
2. Add your created contract file to the IDE.
3. Go to Compile and compile the contract file.
4. copy the abi and paste it inside the PokemonNFT.json file under the src/core.
5. Click deployment and select your chosen network to deploy the contract to, gas and other fees may apply depending on the Network.
6. copy the ContractID and replace all instances of the old ContractID in the source code with the new one
