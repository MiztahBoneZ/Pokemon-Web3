# Blockchain Technology Demonstration

> _In fulfillment of Bootcamp requirements as the third and final project._

#### NFT Integrated Pokémons

This web application is a comprehensive technical demonstration of modern Web3 and blockchain concepts, applied through Pokémon turn-based gameplay.
At its core, the application allows users to mint, own, and trade Pokémon as Non-Fungible Tokens (NFTs). Each Pokémon exists as a unique on-chain asset, verifiably owned by the user’s connected wallet.

> This system is developed strictly as a proof of concept and is not intended for commercial deployment. If adapted for commercial use, all NFT metadata, tokenized assets, artwork, names, and associated intellectual property must be replaced with original or properly licensed content. <br/><br/>
> _The developer assumes no liability for any legal, intellectual property, or regulatory issues arising from the minting, trading, or use of NFTs within this project._

---

## Project Requirements

##### The project must integrate at least two of the following features:

- [x] Non-Fungible Tokens (NFTs) for Pokémon
- [ ] Bitcoin as In-Game Currency
- [ ] Play-to-Earn (P2E) Mechanics
- [x] Decentralized Marketplace for Trading Pokémon and Items
- [ ] Leaderboards and Achievements Linked to Blockchain

## Features

### 1. NFT Minting and Marketplace (ERC-721 Standard)

Pokémon are implemented as ERC-721 compliant NFTs, ensuring each minted Pokémon is provably unique and non-interchangeable. Minting is handled through smart contract functions deployed on a blockchain test network, allowing users to create new Pokémon directly from the application.

Ownership, transfers, and trades are fully managed on-chain, meaning players retain full control over their assets independent of the application itself. A built-in decentralized marketplace enables users to list, buy, and sell Pokémon NFTs, demonstrating real-world NFT trading mechanics such as wallet-based transactions and ownership verification.

### 2. MetaMask Wallet Integration

MetaMask is used as the primary Web3 wallet provider for blockchain interactions within the application. Users connect their MetaMask wallet to authenticate ownership, sign transactions, and interact with smart contracts directly from the browser.

This integration enables secure NFT minting, transfers, and marketplace transactions without exposing private keys to the application. All blockchain operations require explicit user confirmation through MetaMask, reinforcing user-controlled asset management and decentralized security principles.

### 3. Firebase Integration

Firebase and Firestore are used to manage off-chain data that does not belong on the blockchain. This includes user authentication, wallet address mapping, player profiles, and auxiliary game data.

### 4. Stat Randomization and Asset Uniqueness

Each Pokémon NFT is generated with randomized attributes, including stats and movesets, ensuring that no two Pokémon are ever identical. Because these attributes are tied to the minted NFT, they persist across transfers and trades. This allows Pokémon to retain their individual identity and value, whether held by the original minter or acquired through the marketplace.

## Technical Purpose

This project demonstrates:

- Practical implementation of ERC-721 smart contracts
- Secure wallet-based authentication and ownership validation using MetaMask
- Integration of blockchain assets with a modern web stack

## Tech Stack
