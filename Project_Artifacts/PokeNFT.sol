// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PokemonNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    // Mapping from token ID to Pokemon metadata
    mapping(uint256 => PokemonMetadata) public pokemonData;
    
    // Marketplace: token ID => listing
    mapping(uint256 => Listing) public listings;
    
    // Track all listed token IDs for easy querying
    uint256[] private listedTokenIds;
    mapping(uint256 => uint256) private listedTokenIndex; // tokenId => index in listedTokenIds

    struct PokemonMetadata {
        uint256 pokemonId;
        string name;
        string nickname;
        string rarity;
        bool isShiny;
        uint256 createdAt;
    }
    
    struct Listing {
        uint256 price;
        address seller;
        bool isActive;
    }

    // Events
    event PokemonMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 pokemonId,
        string name,
        bool isShiny
    );

    event NicknameUpdated(
        uint256 indexed tokenId,
        string newNickname
    );
    
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event ListingCancelled(
        uint256 indexed tokenId,
        address indexed seller
    );

    constructor() ERC721("PokemonNFT", "PKMN") Ownable(msg.sender) {}

    function mintPokemon(
        address to,
        string memory tokenURI,
        uint256 pokemonId,
        string memory name,
        string memory nickname,
        string memory rarity,
        bool isShiny
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        pokemonData[tokenId] = PokemonMetadata({
            pokemonId: pokemonId,
            name: name,
            nickname: nickname,
            rarity: rarity,
            isShiny: isShiny,
            createdAt: block.timestamp
        });

        emit PokemonMinted(to, tokenId, pokemonId, name, isShiny);

        return tokenId;
    }

    function getPokemonData(uint256 tokenId) public view returns (PokemonMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return pokemonData[tokenId];
    }

    function updateNickname(uint256 tokenId, string memory newNickname) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        pokemonData[tokenId].nickname = newNickname;
        emit NicknameUpdated(tokenId, newNickname);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // ============ MARKETPLACE FUNCTIONS ============
    
    /**
     * @dev List an NFT for sale
     * @param tokenId The token ID to list
     * @param price The price in wei (ETH)
     */
    function listNFT(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].isActive, "Already listed");
        
        listings[tokenId] = Listing({
            price: price,
            seller: msg.sender,
            isActive: true
        });
        
        // Add to listed tokens array
        listedTokenIndex[tokenId] = listedTokenIds.length;
        listedTokenIds.push(tokenId);
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev Cancel a listing
     * @param tokenId The token ID to cancel
     */
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Not listed");
        require(listing.seller == msg.sender, "Not the seller");
        
        _removeListing(tokenId);
        
        emit ListingCancelled(tokenId, msg.sender);
    }
    
    /**
     * @dev Buy an NFT
     * @param tokenId The token ID to buy
     */
    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // Remove listing before transfer to prevent reentrancy
        _removeListing(tokenId);
        
        // Transfer NFT to buyer
        _transfer(seller, msg.sender, tokenId);
        
        // Transfer ETH to seller
        (bool success, ) = payable(seller).call{value: price}("");
        require(success, "Transfer to seller failed");
        
        // Refund excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @dev Update listing price
     * @param tokenId The token ID
     * @param newPrice The new price in wei
     */
    function updateListingPrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "Not listed");
        require(listing.seller == msg.sender, "Not the seller");
        require(newPrice > 0, "Price must be greater than 0");
        
        listing.price = newPrice;
        
        emit NFTListed(tokenId, msg.sender, newPrice);
    }
    
    /**
     * @dev Get all active listings
     * @return Array of token IDs that are listed
     */
    function getAllListings() external view returns (uint256[] memory) {
        return listedTokenIds;
    }
    
    /**
     * @dev Get listing details
     * @param tokenId The token ID
     * @return The listing struct
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
    
    /**
     * @dev Internal function to remove a listing
     * @param tokenId The token ID to remove
     */
    function _removeListing(uint256 tokenId) private {
        listings[tokenId].isActive = false;
        
        // Remove from listedTokenIds array
        uint256 index = listedTokenIndex[tokenId];
        uint256 lastIndex = listedTokenIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastTokenId = listedTokenIds[lastIndex];
            listedTokenIds[index] = lastTokenId;
            listedTokenIndex[lastTokenId] = index;
        }
        
        listedTokenIds.pop();
        delete listedTokenIndex[tokenId];
    }
    
    /**
     * @dev Override transfer to automatically cancel listings
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // If NFT is being transferred and it's listed, cancel the listing
        if (from != address(0) && listings[tokenId].isActive) {
            _removeListing(tokenId);
        }
        
        return super._update(to, tokenId, auth);
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}