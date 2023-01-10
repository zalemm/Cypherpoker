/**
* @file Monitors and analyzes a CypherPoker game (hand) for cryptographic correctness
* and ranks the completed hands of the game to determine the winner.
*
* @version 0.4.1
* @author Patrick Bay
* @copyright MIT License
*/

/**
* @class Monitors and analyzes a CypherPoker game (hand) for cryptographic correctness
* and ranks the completed hands of the game to determine the winner.
*/
class CypherPokerAnalyzer extends EventDispatcher {

   /**
   * The cards captured for an associated game are about to be analyzed.
   *
   * @event CypherPokerAnalyzer#analyzing
   * @type {Event}
   * @property {CypherPokerAnalyzer} analyzer A reference to this instance.
   * @property {CypherPokerAnalyzer#analysis} analysis A reference to the current analysis.
   * property.
   */
   /**
   * The cards captured for an associated game have been fully analyzed. A successful
   * analysis is usually followed by scoring.
   *
   * @event CypherPokerAnalyzer#analyzed
   * @type {Event}
   * @property {CypherPokerAnalyzer} analyzer A reference to this instance.
   * @property {CypherPokerAnalyzer#analysis} analysis A reference to the current analysis.
   * property.
   */
   /**
   * The cards captured for an associated game have been scored and ranked (post analysis).
   *
   * @event CypherPokerAnalyzer#scored
   * @type {Event}
   * @property {CypherPokerAnalyzer} analyzer A reference to this instance.
   * @property {CypherPokerAnalyzer#analysis} analysis A reference to the current analysis.
   * property.
   */

   /**
   * Creates a new instance.
   *
   * @param {CypherPokerGame} game The game instance with which this instance
   * is to be associated. Event listeners are added to the {@link CypherPokerGame}
   * instance at this time so the analyzer should usually be instantiated at the
   * beginning of a new game (hand).
   *
   */
   constructor(game) {
      super();
      this._game = game;
      this.game.addEventListener("gamecardsencrypt", this.onEncryptCards, this);
      this.game.addEventListener("gamedealmsg", this.onGameDealMessage, this);
      this.game.addEventListener("gamedealprivate", this.onSelectCards, this);
      this.game.addEventListener("gamedealpublic", this.onSelectCards, this);
      this.game.addEventListener("gamedeal", this.onCardDeal, this);
      this.game.addEventListener("gamedecrypt", this.onGameDecrypt, this);
      this.game.addEventListener("gameanalyze", this.onGameAnalyze, this);
      this.game.addEventListener("gameplayerkeychain", this.onPlayerKeychain, this);
   }

   /**
   * @property {Boolean} True if the instance is active (tracking game actions),
   * false if not.
   *
   * @readonly
   */
   get active() {
      if (this._active == undefined) {
         this._active = false;
      }
      return (this._active);
   }

   /**
   * @property {Number} keychainCommitTimeout=10000 The amount of time, in milliseconds,
   * to wait at the end of a game for all players' keychains to be comitted before timing out.
   */
   get keychainCommitTimeout() {
      if (this._keychainCommitTimeout == undefined) {
         this._keychainCommitTimeout = 10000;
      }
      return (this._keychainCommitTimeout);
   }

   set keychainCommitTimeout (KRSTSet) {
      this._keychainCommitTimeout = KRSTSet;
   }

   /**
   * @property {Boolean} allKeychainsCommitted True when all players associated
   * with the {@link CypherPokerAnalyzer#game} instance have committed an
   * end-game keychain.
   *
   * @readonly
   */
   get allKeychainsCommitted() {
      if (this._keychains == undefined) {
         this._keychains = new Object();
      }
      var allPlayersCommitted = true;
      var numCommitted = 0;
      for (var count=0; count < this.players.length; count++) {
         var player = this.players[count];
         if (this._keychains[player.privateID] == undefined) {
            this._keychains[player.privateID] = Array.from(player.keychain);
         }
         var keychain = this._keychains[player.privateID];
         if (keychain.length == 0) {
            allPlayersCommitted = false;
            break;
         } else {
            numCommitted++;
         }
      }
      if (allPlayersCommitted) {
         return (true);
      }
      return (false);
   }

   /**
   * @property {Array} communityCards An array of {@link CypherPokerCard}
   * instances of the community cards reported by the final decryptors.
   *
   * @readonly
   */
   get communityCards() {
      if (this._communityCards == undefined) {
         this._communityCards = new Array();
      }
      return (this._communityCards);
   }

   /**
   * @property {Object} privateCards={} An object of named arrays, with each
   * array named using the private ID of the associated player and containing
   * the {@link CypherPokerCard} instances of the decrypted private cards for
   * that player.
   *
   * @readonly
   */
   get privateCards() {
      if (this._privateCards == undefined) {
         this._privateCards = new Object();
      }
      return (this._privateCards);
   }

   /**
   * @property {Array} deck An array of named objects, with each
   * array element storing an object representing a snapshot of the
   * deck generation and encryption processes.
   *
   * @readonly
   */
   get deck() {
      if (this._deck == undefined) {
         this._deck = new Array();
      }
      return (this._deck);
   }

   /**
   * @property {Array} Returns a copy of the mapped deck of the associated
   * {@link CypherPokerAnalyzer#game} instance
   * (the {@link CypherPokerGame#cardDecks}<code>faceup</code> property),
   * or an empty array if none exists.
   *
   * @readonly
   */
   get mappedDeck() {
      if (this._mappedDeck == undefined) {
         this._mappedDeck = new Array();
      }
      return (this._mappedDeck);
   }

   /**
   * @property {Object} deals Contains name/value pairs with each name representing
   * the source (dealing) private ID of the player and the associated value being an
   * array of objects, each containing a <code>fromPID</code> private ID of the sender
   * of the data, a <code>type</code> denoting the type of dealing operation ("select" or "decrypt"),
   * the card values in a <code>cards</code> array, and a <code>private</code> property
   * indicating whether the deal was for private / hole cards or for public / community ones.
   * Each entry is stored in order of operation.
   *
   * @readonly
   */
   get deals() {
      if (this._deals == undefined) {
         this._deals = new Object();
      }
      return (this._deals);
   }

   /**
   * @property {Object} keychains Name/value pairs of player keychains with
   * each name representing a player private ID and associated value being their
   * keychain. The keychain is copied from the associated {@link CypherPokerAnalayzer#game}
   * instance once a game completes.
   *
   * @readonly
   */
   get keychains() {
      if (this._keychains == undefined) {
         this._keychains = new Object();
      }
      return (this._keychains);
   }

   /**
   * @property {CypherPokerGame} game=null The game instance associated with this
   * analyzer, as set at instantiation time.
   *
   * @readonly
   */
   get game() {
      if (this._game == undefined) {
         this._game = null;
      }
      return (this._game);
   }

   /**
   * @property {CypherPoker} cypherpoker=null The {@link CypherPoker} instance
   * associated with {@link CypherPokerAnalyzer#game}.
   *
   * @readonly
   */
   get cypherpoker() {
      if (this.game == null) {
         return (null);
      }
      return (this.game.cypherpoker);
   }

   /**
   * @property {CypherPoker} cypherpoker A reference to the
   * {@link CypherPokerAnalyzer#game}'s <code>cypherpoker</code> instance or
   * <code>null</code> if none exists.
   */
   get cypherpoker() {
      if ((this._game != null) && (this._game != undefined)) {
         return (this._game.cypherpoker);
      }
      return (null);
   }

   /**
   * @property {TableObject} A copy of the table associated with the {@link CypherPokerAnalyzer#game}
   * instance.
   */
   get table() {
      if (this._table == undefined) {
         this._table = this.game.getTable();
      }
      return (this._table);
   }

   /**
   * @property {Array} Indexed list of {CypherPokerPlayer} instances copied
   * from the associated {@link CypherPokerAnalyzer#game} instance.
   */
   get players() {
      if (this._players == undefined) {
         this.refreshPlayers();
      }
      return (this._players);
   }

   /**
   * @property {Object} analysis The partial or full analysis of the
   * completed game.
   * @property {Object} analysis.private Name/value pairs with each name matching
   * a player private ID and value containing an array of their verified private
   * {@link CypherPokerCard} instances.
   * @property {Array} analysis.public Array of verified public {@link CypherPokerCard}
   * instances.
   * @property {Boolean} analysis.complete=false Set to true when the hand has been
   * fully validated as far as possible.
   * @property {Error} analysis.error=null The analysis error object, if one exists.
   *
   * @readonly
   */
   get analysis() {
      if (this._analysis == undefined) {
         this._analysis = new Object();
         this._analysis.private = new Object();
         this._analysis.public = new Array();
         this._analysis.complete = false;
         this._analysis.error = null;
      }
      return (this._analysis);
   }

   /**
   * Refreshes the {@link CypherPokerAnalyzer#players} array with data from
   * the associated {@link CypherPokerAnalyzer#game}.
   *
   * @private
   */
   refreshPlayers() {
      this._players = new Array();
      for (var count=0; count < this.game.players.length; count++) {
         this._players.push(this.game.players[count].copy());
      }
   }

   /**
   * Returns a {@link CypherPokerPlayer} instance associated with the analyzer's
   * game instance.
   *
   * @param {String} privateID The private ID of the player to return.
   *
   * @return {CypherPokerPlayer} The {@link CypherPokerPlayer} for the private ID
   * associated with this instance. <code>null</code> is returned if no matching
   * player private ID can be found.
   */
   getPlayer(privateID) {
      for (var count=0; count < this.players.length; count++) {
         if (this.players[count].privateID == privateID) {
            return (this.players[count]);
         }
      }
      return (null);
   }

   /**
   * Returns a condensed array containing the copied properties of the
   * {@link CypherPokerAnalyzer#players} array. Use the object returned by
   * this function with <code>JSON.stringify</code> instead of using
   * {@link CypherPokerAnalyzer#players} directly in order to prevent circular
   * reference errors.
   *
   * @param {Boolean} [includeKeychains=false] If true, the {@link CypherPokerPlayer#keychain}
   * array of each player will be included in the returned object.
   * @param {Boolean} [includePasswords=false] If true, the {@link CypherPokerAccount#password}
   * property of each {@link CypherPokerPlayer#account} reference will be included
   * with the returned object.
   *
   * @return {Object} The condensed players array associated with this instance's
   * game reference.
   */
   getPlayers(includeKeychains=false, includePasswords=false) {
      var returnArr = new Array();
      for (var count=0; count < this.players.length; count++) {
         var playerObj = this.players[count].toObject(includeKeychains, includePasswords);
         returnArr.push(playerObj);
      }
      return (returnArr);
   }

   /**
   * Returns the {@link CypherPokerPlayer} that is currently flagged as the dealer
   * in the {@link CypherPokerAnalyzer#players} array.
   *
   * @return {CypherPokerPlayer} The {@link CypherPokerPlayer} instance that
   * is flagged as a dealer. <code>null</code> is returned if no dealer is flagged.
   */
   getDealer() {
      for (var count=0; count < this.players.length; count++) {
         if (this.players[count].isDealer) {
            return (this.players[count]);
         }
      }
      return (null);
   }

   /**
   * Removes all of the event listeners added to the {@link CypherPokerAnalyzer.game}
   * reference at instantiation.
   *
   * @private
   */
   removeGameListeners() {
      this.game.removeEventListener("gamecardsencrypt", this.onEncryptCards, this);
      this.game.removeEventListener("gamedealmsg", this.onGameDealMessage, this);
      this.game.removeEventListener("gamedealprivate", this.onSelectCards, this);
      this.game.removeEventListener("gamedealpublic", this.onSelectCards, this);
      this.game.removeEventListener("gamedeal", this.onCardDeal, this);
      this.game.removeEventListener("gamedecrypt", this.onGameDecrypt, this);
      this.game.removeEventListener("gameanalyze", this.onGameAnalyze, this);
      //"gameplayerkeychain" is removed separately, once all keychains are received
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPoker#event:gamecardsencrypt} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gameplayerkeychain} event object.
   *
   * @async
   * @private
   */
   async onEncryptCards(event) {
      var temp = this.table;
      this._active = true;
      var infoObj = new Object();
      if (this.deck.length == 0) {
         //store current face-up deck as generated by dealer
         var generatedDeck = event.game.cardDecks.faceup;
         var cardsArr = new Array();
         for (var count=0; count < generatedDeck.length; count++) {
            cardsArr.push(generatedDeck[count].mapping);
            this.mappedDeck.push(this.game.getMappedCard(generatedDeck[count].mapping));
         }
         infoObj.fromPID = this.getDealer().privateID;
         infoObj.cards = cardsArr;
         this.deck.push (infoObj);
      }
      infoObj = new Object();
      infoObj.fromPID = event.player.privateID;
      infoObj.cards = Array.from(event.selected);
      this.deck.push (infoObj);
   }

   /**
   * Returns a reference to a {@link CypherPokerCard} based on its mapping.
   *
   * @param {String} mapping The plaintext or face-up card mapping value to
   * find.
   *
   * @return {CypherPokerCard} The matching card instance or <code>null</code>
   * if none exists.
   */
   getMappedCard(mapping) {
      for (var count=0; count < this.mappedDeck.length; count++) {
         if (this.mappedDeck[count].mapping == mapping) {
            return (this.mappedDeck[count]);
         }
      }
      return (null);
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPoker#event:gamedecrypt} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gamedecrypt} event object.
   *
   * @async
   * @private
   */
   async onGameDecrypt(event) {
      this._active = true;
      //we have partially decrypted some cards
      if (event.private) {
         this.storeDeal(event.payload.sourcePID, this.game.ownPID, event.selected, true, true);
      } else {
         this.storeDeal(event.payload.sourcePID, this.game.ownPID, event.selected, false, true);
      }
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPoker#event:gamedeal} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gamedeal} event object.
   *
   * @async
   * @private
   */
   async onCardDeal(event) {
      this._active = true;
      var cards = event.cards;
      if (event.private == false) {
         //new community cards have been dealt
         for (var count=0; count < cards.length; count++) {
            this.communityCards.push(cards[count]);
         }
      } else {
         //new private cards have been dealt
         this.privateCards[event.game.ownPID]=new Array();
         for (var count=0; count < cards.length; count++) {
            this.privateCards[event.game.ownPID].push(cards[count]);
         }
      }
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches either a {@link CypherPoker#event:gamedealprivate} or
   * {@link CypherPoker#event:gamedealpublic} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gamedealprivate} or
   * {@link CypherPoker#event:gamedealpublic} event object.
   *
   * @async
   * @private
   */
   async onSelectCards(event) {
      this._active = true;
      var selected = event.selected;
      if (event.type == "gamedealprivate") {
         //private card selection
         this.storeDeal(this.game.ownPID, this.game.ownPID, selected, true, false);
      } else {
         //we have selected a private card
         this.storeDeal(this.game.ownPID, this.game.ownPID, selected, false, false);
      }
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPoker#event:gamedealmsg} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gamedealmsg} event object.
   *
   * @async
   * @private
   */
   async onGameDealMessage(event) {
      this._active = true;
      var resultObj = event.data.result;
      if ((resultObj.data.payload.cards != undefined) && (resultObj.data.payload.cards != null)) {
         var cardsArr = resultObj.data.payload.cards;
         if (typeof(cardsArr.length) == "number") {
            //this message contains fully decrypted community cards
            //and is handled in "onCardDeal"
            return(true);
         }
      }
      //partially decrypted public or private cards:
      var selected = resultObj.data.payload.selected;
      //the player that dealt (selected) the cards:
      var dealingPlayer = this.getPlayer(resultObj.data.payload.sourcePID);
      //the player that sent the "gamedeal" message:
      var fromPlayer = this.getPlayer(resultObj.from);
      //the selected card values:
      if (dealingPlayer.privateID == fromPlayer.privateID) {
         //player is selecting a card
         if (resultObj.data.payload.private) {
            //private card selection
            this.storeDeal(dealingPlayer.privateID, fromPlayer.privateID, selected, true, false);
         } else {
            //public card selection
            this.storeDeal(dealingPlayer.privateID, fromPlayer.privateID, selected, false, false);
         }
      } else {
         //player has decrypted card(s)
         if (resultObj.data.payload.private) {
            //private cards
            this.storeDeal(dealingPlayer.privateID, fromPlayer.privateID, selected, true, true);
         } else {
            //public card(s)
            this.storeDeal(dealingPlayer.privateID, fromPlayer.privateID, selected, false, true);
         }
      }
      return(true);
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPokerGame#event:gameanalyze} event.
   *
   * @param {Event} event A {@link CypherPokerGame#event:gameanalyze} event object.
   *
   * @async
   * @private
   */
   async onGameAnalyze(event) {
      this.refreshPlayers(); //refresh the players array
      if ((this._keychains == null) || (this._keychains == undefined)) {
         this._keychains = new Object();
      }
      this._keychains[this.game.ownPID] = Array.from(this.getPlayer(this.game.ownPID).keychain);
      this.removeGameListeners();
      this._keychainCommitTimeout = setTimeout(this.onKCSTimeout, this.keychainCommitTimeout, this, event.game);
      return (true);
   }

   /**
   * Called when the keychain submission timer elapses and not all players have
   * committed their keychains.
   *
   * @param {CypherPokerAnalayzer} context The execution context of the instance.
   * @param {CypherPokerGame} game The game instance for which the timeout
   * occurred.
   * @private
   */
   onKCSTimeout(context, game) {
      context.analysis.complete = true;
      throw (new Error("Not all players have committed their keychains in time (table ID: "+context.table.tableID+")"));
   }

   /**
   * Event handler invoked when the associated {@link CypherPokerAnalyzer#game}
   * instance dispatches a {@link CypherPoker#event:gameplayerkeychain} event.
   *
   * @param {Event} event A {@link CypherPoker#event:gameplayerkeychain} event object.
   *
   * @async
   * @private
   */
   async onPlayerKeychain(event) {
      this._active = true;
      if (this._keychains == undefined) {
         this._keychains = new Object();
      }
      var player = event.player;
      var game = event.game;
      this._keychains[player.privateID] = Array.from(event.keychain);
      if (this.allKeychainsCommitted) {
         this.game.removeEventListener("gameplayerkeychain", this.onPlayerKeychain, this);
         //all keychains committed, we can clear the timeout and start the analysis
         clearTimeout(this._keychainCommitTimeout);
         event = new Event("analyzing");
         event.analyzer = this;
         event.analysis = this.analysis;
         this.dispatchEvent(event);
         try {
            this._analysis = await this.analyzeCards();
         } catch (err) {
            console.error(err);
            alert ("Post-game analysis failed. Awaiting contract confirmation...");
            return (false);
         }
         event = new Event("analyzed");
         event.analyzer = this;
         event.analysis = this.analysis;
         this.dispatchEvent(event);
         this._analysis = await this.scoreHands(this._analysis);
         this._analysis.complete = true;
         this._analysis.error = null;
         event = new Event("scored");
         event.analyzer = this;
         event.analysis = this.analysis;
         this.dispatchEvent(event);
         this.game.debug ("Final hand/game analysis:");
         this.game.debug (this.analysis, "dir");
         this.game.debug (this.deals, "dir");
         this._active = false;
      }
      return (true);
   }

   /**
   * Analyzes the stored information for cryptographic correctness and returns
   * the verified, decrypted cards (as {@link CypherPokerCard} instances),
   * for each player along with the public / community cards. This function should
   * only be called when the game has completed and all keychains received.
   *
   * @return {Promise} The promise resolves with an object containing a <code>players</code>
   * object containing name/value pairs with each name matching a player private ID and containing
   * an array of {@link CypherPokerCard} instances, and a <code>public</code>
   * property containing an array of the public / community {@link CypherPokerCard} instances.
   * If the analysis fails it is rejected with an <code>Error</code> which includes a
   * <code>message</code> and numeric <code>code</code> identifying the analysis failure.
   *
   * @async
   * @private
   */
   async analyzeCards() {
      //step 1: analyze the full deck (creation & encryption)
      if (this.deck.length == 0) {
         return (null);
      }
      //todo: check to ensure that all values are quadratic residues
      var cardsObj = new Object();
      cardsObj.private = new Object();
      cardsObj.public = new Array();
      var faceUpMappings = Array.from(this.deck[0].cards); //generated plaintext (quadratic residues) values
      var previousDeck = Array.from(faceUpMappings);
      for (var count = 1; count < this.deck.length; count++) {
         var currentDeck = Array.from(this.deck[count].cards);
         var keychain = this.keychains[this.deck[count].fromPID];
         var promises = new Array();
         for (var count2=0; count2 < previousDeck.length; count2++) {
            promises.push(this.cypherpoker.crypto.invoke("encrypt", {value:previousDeck[count2], keypair:keychain[keychain.length-1]}));
         }
         var promiseResults = await Promise.all(promises);
         var compareDeck = new Array();
         for (count2 = 0; count2 < promiseResults.length; count2++) {
            compareDeck.push(promiseResults[count2].data.result);
         }
         if (this.compareDecks(currentDeck, compareDeck) == false) {
            var error = new Error("Deck encryption at stage "+count+" by \""+this.deck[count].fromPID+"\" failed.");
            error.code = 1;
            this._analysis.error = error;
            this._analysis.complete = true;
            throw (error);
         }
         previousDeck = currentDeck;
      }
      //previousDeck should now contain the fully encrypted deck
      var encryptedDeck = previousDeck;
      //step 1: passed
      //step 2: analyze private / public card selections and decryptions
      for (var privateID in this.deals) {
         var dealArray = this.deals[privateID];
         var decrypting = false; //currently decrypting cards?
         var previousType = "select"; //should match dealArray[0].type
         for (count = 0; count < dealArray.length; count++) {
            var currentDeal = dealArray[count];
            if ((currentDeal == undefined) || (currentDeal == null)) {
               //not a deal history object
               break;
            }
            if (count > 0) {
               var previousDeal = dealArray[count-1];
               var previousCards = previousDeal.cards;
               var previousPID = previousDeal.fromPID;
               var previousPrivate = previousDeal.private;
               previousType = previousDeal.type;
            }
            var sourcePID = privateID; //card dealer / selector
            var fromPID = currentDeal.fromPID; //private ID of "cards" (result) sender
            var type = currentDeal.type; //"select" or "decrypt"
            var privateDeal = currentDeal.private; //private / hole cards?
            var cards = currentDeal.cards; //numeric card value strings, encrypted or plaintext;
            if (cardsObj.private[sourcePID] == undefined) {
               cardsObj.private[sourcePID] = new Array();
            };
            if ((previousType == "select") && (type == "select")) {
               //probably the first entry but...
               if (count > 0) {
                  var error = new Error("Multiple sequential \"select\" sequences in deal.");
                  error.code = 2;
                  this._analysis.error = error;
                  this._analysis.complete = true;
                  throw (error);
               }
               if (this.removeFromDeck(cards, encryptedDeck) == false) {
                  var error = new Error("Duplicates found in \"select\" deal index "+count+" for \""+fromPID+"\" for \""+sourcePID+"\".");
                  error.code = 2;
                  this._analysis.error = error;
                  this._analysis.complete = true;
                  throw (error);
               }
            } else if ((previousType == "select") && (type == "decrypt") && (count < (dealArray.length - 1))) {
               //starting a new decryption operation (deal or select cards)
               decrypting = true;
            } else if ((previousType == "decrypt") && (type == "select")) {
               //ending decryption operation (final decryption outstanding)
               keychain = this.keychains[sourcePID];
               promises = new Array();
               promiseResults = new Array();
               for (count2=0; count2 < previousCards.length; count2++) {
                  promises.push(this.cypherpoker.crypto.invoke("decrypt", {value:previousCards[count2], keypair:keychain[keychain.length-1]}));
               }
               promiseResults = await Promise.all(promises);
               var dealtCards = new Array();
               for (count2 = 0; count2 < promiseResults.length; count2++) {
                  var card = this.getMappedCard(promiseResults[count2].data.result);
                  if (card == null) {
                     var error = new Error("Final decryption (deal "+count+") by \""+this.getPlayer(fromPID).account.address+"\" for \""+this.getPlayer(sourcePID).account.address+"\" does not map: "+promiseResults[count2].data.result);
                     error.code = 2;
                     this._analysis.error = error;
                     this._analysis.complete = true;
                     throw (error);
                  }
                  if (previousPrivate) {
                     cardsObj.private[sourcePID].push(card);
                  } else {
                     cardsObj.public.push(card);
                  }
               }
               if (this.removeFromDeck(cards, encryptedDeck) == false) {
                  var error = new Error("Duplicates found in \"select\" deal index "+count+" for \""+this.getPlayer(fromPID).account.address+"\" for \""+this.getPlayer(sourcePID).account.address+"\".");
                  error.code = 2;
                  this._analysis.error = error;
                  this._analysis.complete = true;
                  throw (error);
               }
            } else {
               //decryption in progress
               if (count == (dealArray.length - 1)) {
                  //final decryption for source
                  keychain = this.keychains[sourcePID];
                  promises = new Array();
                  promiseResults = new Array();
                  for (count2=0; count2 < cards.length; count2++) {
                     promises.push(this.cypherpoker.crypto.invoke("decrypt", {value:cards[count2], keypair:keychain[keychain.length-1]}));
                  }
                  promiseResults = await Promise.all(promises);
                  for (count2 = 0; count2 < promiseResults.length; count2++) {
                     var card = this.getMappedCard(promiseResults[count2].data.result);
                     if (card == null) {
                        var error = new Error("Final decryption (deal "+count+") by \""+fromPID+"\" does not map: "+promiseResults[count2].data.result);
                        error.code = 2;
                        this._analysis.error = error;
                        this._analysis.complete = true;
                        throw (error);
                     }
                     if (privateDeal) {
                        cardsObj.private[sourcePID].push(card);
                     } else {
                        cardsObj.public.push(card);
                     }
                  }
               } else {
                  //continuing decryption from another player
                  keychain = this.keychains[fromPID];
                  compareDeck = new Array();
                  promises = new Array();
                  promiseResults = new Array();
                  //decrypt current cards to compare to what was sent by current player...
                  for (count2=0; count2 < previousCards.length; count2++) {
                     promises.push(this.cypherpoker.crypto.invoke("decrypt", {value:previousCards[count2], keypair:keychain[keychain.length-1]}));
                  }
                  promiseResults = await Promise.all(promises);
                  for (count2 = 0; count2 < promiseResults.length; count2++) {
                     compareDeck.push(promiseResults[count2].data.result);
                  }
                  if (this.compareDecks(compareDeck, cards) == false) {
                     var error = new Error("Previous round ("+count+") of decryption by \""+this.getPlayer(fromPID).account.address+"\" for \""+this.getPlayer(sourcePID).account.address+"\" does not match computed results.");
                     error.code = 2;
                     this._analysis.error = error;
                     this._analysis.complete = true;
                     throw (error);
                  }
               }
            }
         }
      }
      return (cardsObj);
   }

   /**
   * Returns all of the available, unordered 5-hand permutations for a set of supplied cards.
   *
   * @param {Array} cardsArr Values or {@link CypherPokerCard} instance for
   * which to produce permutatuions, up to a maximum of 7 elements.
   *
   * @return {Array} Each array element contains a unique 5-card permutation
   * from the input set. If there are less than 6 cards provided, only one
   * permutation is returned.
   *
   * @private
   */
   createCardPermutations(cardsArr) {
      var permArray = new Array();
      if (cardsArr.length <= 5) {
         //only one hand permutation available
         permArray.push (cardsArr);
      } else if (cardsArr.length == 6) {
         //only private card 2 (index 1)
         permArray.push ([cardsArr[1], cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[5]]);
         //only private card 1 (index 0)
         permArray.push ([cardsArr[0], cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[5]]);
         //both private cards
         permArray.push ([cardsArr[1], cardsArr[0], cardsArr[3], cardsArr[4], cardsArr[5]]);
         permArray.push ([cardsArr[1], cardsArr[2], cardsArr[0], cardsArr[4], cardsArr[5]]);
         permArray.push ([cardsArr[1], cardsArr[2], cardsArr[3], cardsArr[0], cardsArr[5]]);
         permArray.push ([cardsArr[1], cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[0]]);
      } else {
         //no private cards
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[6]]);
         //private card 1 (index 0)
         permArray.push ([cardsArr[0], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[0], cardsArr[4], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[0], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[0], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[0]]);
         //private card 2 (index 1)
         permArray.push ([cardsArr[1], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[1], cardsArr[4], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[1], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[1], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[1]]);
         //both private cards
         permArray.push ([cardsArr[0], cardsArr[1], cardsArr[4], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[0], cardsArr[3], cardsArr[1], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[0], cardsArr[3], cardsArr[4], cardsArr[1], cardsArr[6]]);
         permArray.push ([cardsArr[0], cardsArr[3], cardsArr[4], cardsArr[5], cardsArr[1]]);
         permArray.push ([cardsArr[2], cardsArr[0], cardsArr[1], cardsArr[5], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[0], cardsArr[4], cardsArr[1], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[0], cardsArr[4], cardsArr[5], cardsArr[1]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[0], cardsArr[1], cardsArr[6]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[0], cardsArr[5], cardsArr[1]]);
         permArray.push ([cardsArr[2], cardsArr[3], cardsArr[4], cardsArr[0], cardsArr[1]]);
      }
      return (permArray);
   }

   /**
   * Generates player card permutations for analysis and scores the
   * hands.
   *
   * @param {Object} cardsObj A player card object matching the format of the
   * {@link CypherPokerAnalyzer#analysis} object.
   *
   * @private
   */
   async scoreHands(cardsObj) {
      var playersObj = cardsObj.private;
      cardsObj.hands = new Object();
      var playerHands = new Object();
      var highestScore = -1;
      var highestHand = new Array;
      var winningPlayers = new Array();
      var winningHands = new Array();
      for (var privateID in playersObj) {
         var player = this.getPlayer(privateID);
         //private ID may actually be some other object property
         if (player != null) {
            if (player.hasFolded == false) {
               var fullCards = playersObj[privateID].concat(cardsObj.public);
               cardsObj.hands[privateID] = new Array();
               var perms = this.createCardPermutations(fullCards);
               for (var count = 0; count < perms.length; count++) {
                  var handObj = new Object();
                  handObj.hand = perms[count];
                  handObj.score = -1; //default (not scored)
                  this.scoreHand (handObj);
                  cardsObj.hands[privateID].push(handObj);
                  if (handObj.score == highestScore) {
                     //this may be a split pot; see below
                     winningPlayers.push(player);
                     winningHands.push(handObj);
                  } else if (handObj.score > highestScore) {
                     //new best hand
                     winningPlayers = new Array();
                     winningHands = new Array();
                     winningPlayers.push(player);
                     winningHands.push(handObj);
                     highestScore = handObj.score;
                  }
               }
            }
         }
      }
      if (winningPlayers.length > 1) {
         //need to look at both private cards since we currently have a potential split pot
         var newWinningPlayers = new Array();
         var newWinningHands = new Array();
         var highestScore = 0;
         for (count = 0; count < winningPlayers.length; count++) {
            var winningHand = winningHands[count]; //indexes match with winningPlayers
            var hand = winningHand.hand;
            var player = winningPlayers[count];
            var playerPID = player.privateID;
            var privateCard1 = this.analysis.private[playerPID][0];
            var privateCard2 = this.analysis.private[playerPID][1];
            //adjust score for highest card value
            if (privateCard1.highvalue > privateCard2.highvalue) {
               var currentScore = (privateCard1.highvalue * 10) + privateCard2.highvalue;
            } else {
               currentScore = (privateCard2.highvalue * 10) + privateCard1.highvalue;
            }
            winningHand.score = currentScore;
            if (currentScore > highestScore) {
               highestScore = currentScore;
               newWinningPlayers = new Array();
               newWinningHands = new Array();
               newWinningPlayers.push(player);
               newWinningHands.push(winningHand);
            } else if (currentScore == highestScore) {
               //both private card values are the same -- split pot
               newWinningPlayers.push(player);
               newWinningHands.push(winningHand);
            }
         }
         winningPlayers = newWinningPlayers;
         winningHands = newWinningHands;
      }
      //eliminate any duplicates
      newWinningPlayers = new Array();
      newWinningHands = new Array();
      for (var count=0; count < winningPlayers.length; count++) {
         var currentWinnerPID = winningPlayers[count];
         var currentWinningHand = winningHands[count];
         var existingWinnerPID = newWinningPlayers.find(winnerPID => {
            return (winnerPID == currentWinnerPID);
         }, this);
         if (existingWinnerPID == undefined) {
            newWinningPlayers.push(currentWinnerPID);
            newWinningHands.push(currentWinningHand);
         }
      }
      winningPlayers = newWinningPlayers;
      winningHands = newWinningHands;
      cardsObj.winningPlayers = winningPlayers;
      cardsObj.winningHands = winningHands;
      return (cardsObj);
   }

   /**
   * Scores a 5 cards (or fewer) poker hand. The higher the score the
   * better the hand.
   *
   * @param {Object} handObj A hand permutation and score object. This object
   * is updated with the resulting score, hand name, and other information.
   * @param {Array} handObj.hand Array of {@link CypherPokerCard} instances
   * comprising the hand to score.
   * @param {Number} handObj.score=-1 Calculated score of final hand. -1 means
   * that the hand is not scored.
   *
   * @private
   */
   scoreHand(handObj) {
      if ((handObj.hand == undefined) || (handObj.hand == null)) {
         return;
      }
      handObj.score = -1;
      //create groups sorted by suits and values
      var suitGroups = new Object();
      var valueGroups = new Object();
      for (count = 0; count < handObj.hand.length; count++) {
         var currentCard = handObj.hand[count];
         var suit = currentCard.suit;
         var value = currentCard.value;
         if (suitGroups[suit] == undefined) {
            suitGroups[suit] = new Array();
         }
         if (valueGroups[value] == undefined) {
            valueGroups[value] = new Array();
         }
         suitGroups[suit].push(currentCard);
         valueGroups[value].push(currentCard);
      }
      //convert group objects to arrays of arrays
      suitGroups = Object.entries(suitGroups);
      valueGroups = Object.entries(valueGroups);
      var flush = false;
      //evaluate for flush (only 1 suit and 5 cards):
      if ((suitGroups.length == 1) && (handObj.hand.length == 5)) {
         flush = true;
      }
      //evaluate straight:
      var straight = false;
      var royalflush = false;
      var acesHigh = true;
      var valuesArr = new Array();
      var handValue = 0; //the base numeric value of the hand
      var valueMultiplier = 1; //the multiplier applied to handValue to determine the score
      var valueAdjust = 0; //the amount to adjust the hand value in the final calculation
      for (var count = 0; count < handObj.hand.length; count++) {
         valuesArr.push(handObj.hand[count].value);
      };
      var straightVal = this.straightType(valuesArr);
      if ((straightVal == 10) && flush) {
         straight = true;
         royalflush = true;
      } else if (straightVal > 0) {
         straight = true;
      }
      if (royalflush) {
         valueMultiplier = 1000000000;
         handObj.name = "Royal Flush";
      } else if (straight && flush) {
         if (straightVal == 1) {
            //this is a straight starting with an ace
            acesHigh = false;
         }
         valueMultiplier = 100000000;
         handObj.name = "Straight Flush";
      } else if ((valueGroups.length == 2) && (handObj.hand.length >= 5)) {
         if ((valueGroups[0][1].length == 4) || (valueGroups[1][1].length == 4)) {
            valueMultiplier = 10000000;
            for (count = 0; count < valueGroups.length; count++) {
               if (valueGroups[count][1].length != 4) {
                  var cardSum = this.getCardSum(valueGroups[count][1]);
                  //remove multiplied values for cards that are not in the hand
                  //otherwise they can cause significant scoring problems
                  valueAdjust = (cardSum * valueMultiplier * -1) + cardSum;
               }
            }
            handObj.name = "Four of a Kind";
         }
         if ((valueGroups[0][1].length == 3) || (valueGroups[1][1].length == 3)) {
            valueMultiplier = 1000000;
            handObj.name = "Full House";
         }
      } else if (flush && (straight==false)) {
         valueMultiplier = 100000;
         handObj.name = "Flush";
      } else if (straight && (flush == false)) {
         if (straightVal == 1) {
            //this is a straight starting with an ace
            acesHigh = false;
         }
         valueMultiplier = 10000;
         handObj.name = "Straight";
      } else if (valueGroups.length == 3) {
         if ((valueGroups[0][1].length == 3) || (valueGroups[1][1].length == 3) || (valueGroups[2][1].length == 3)) {
            valueMultiplier = 1000;
            for (count = 0; count < valueGroups.length; count++) {
               if (valueGroups[count][1].length != 3) {
                  var cardSum = this.getCardSum(valueGroups[count][1]);
                  valueAdjust = (cardSum * valueMultiplier * -1) + cardSum;
               }
            }
            handObj.name = "Three of a Kind";
         } else {
            valueMultiplier = 100;
            handObj.name = "Two Pairs";
            for (count = 0; count < valueGroups.length; count++) {
               if (valueGroups[count][1].length != 2) {
                  var cardSum = this.getCardSum(valueGroups[count][1]);
                  valueAdjust = (cardSum * valueMultiplier * -1) + cardSum;
               }
            }
         }
      } else if ((valueGroups.length == 4) || (valueGroups.length == 1)) {
         //valueGroups.length == 1 on flop
         valueMultiplier = 15;
         for (count = 0; count < valueGroups.length; count++) {
            if (valueGroups[count][1].length != 2) {
               var cardSum = this.getCardSum(valueGroups[count][1]);
               valueAdjust = (cardSum * valueMultiplier * -1) + cardSum;
            }
         }
         handObj.name = "One Pair";
      } else {
         handObj.name = "High Card";
      }
      if (valueMultiplier > 1) {
         for (count = 0; count < handObj.hand.length; count++) {
            if (acesHigh) {
               handValue += handObj.hand[count].highvalue;
            } else {
               handValue += handObj.hand[count].value;
            }
         }
      } else {
         //high card (secondary scan is required for additional card)
         handValue = 0;
         for (count = 0; count < handObj.hand.length; count++) {
            if (handValue < handObj.hand[count].highvalue) {
               handValue = handObj.hand[count].highvalue;
            }
         }
      }
      handObj.score = (handValue * valueMultiplier) + valueAdjust;
   }

   /**
   * Evaluates an unordered series of card values to determine what type of
   * straight they comprise.
   *
   * @param {Array} cardValues Unordered sequence of card values to analyze.
   *
   * @return {Number} A 0 is returned if the input is not a straight, otherwise
   * the lowest value in the straight is returned (e.g. if <code>cardValues=[4,3,5,6,7]</code>
   * then 3 is returned).
   *
   * @private
   */
   straightType(cardValues) {
      if (cardValues.length < 5) {
         //need 5 cards for a straight
         return (0);
      }
      //check for ace through 9
      for (var count = 1; count < 10; count++) {
         if (this.compareDecks(cardValues, [count, count+1, count+2, count+3, count+4])) {
            return (count);
         }
      }
      //check for high ace with a 10 (is there a more elegant way to do this in the "for" loop?)
      if (this.compareDecks(cardValues, [10,11,12,13,1])) {
         return (10);
      }
      //not a straight
      return (0);
   }

   /**
   *  Sum the {@link CypherPokerCard} instances provided.
   *
   * @param {Array} cards Indexed array of {@link CypherPokerCard} instances to sum.
   * @param {Boolean} [high=true] If true, the card's <code>highvalue</code> is used to
   * calculate the sum otherwise its <code>value</code> is used.
   * @return {Number} The numeric sum of the card values.
   * @private
   */
   getCardSum(cards, high=true) {
      var sum = new Number(0);
      for (var count = 0; count < cards.length; count++) {
         if (high) {
            sum += cards[count].highvalue;
         } else {
            sum += cards[count].value;
         }
      }
      return (sum);
   }

   /**
   * Stores a card deal -- new cards have either been selected or partially
   * decrypted -- to the {@link CypherPokerAnalyzer#deals} array.
   *
   * @param {String} dealingPID The private ID of the dealer of the cards (i.e.
   * the player that selected them).
   * @param {String} fromPID The private ID of the player that last operated
   * on the cards (selected or decrypted them).
   * @param {Array} cards An array of numeric string values representing the
   * selected or partially decrypted cards.
   * @param {Booolean} isPrivate If true, the <code>cards</code> array contains
   * private / hole card values, otherwise they are community / public cards.
   * @param {Boolean} isDecryption If true, the <code>cards</code> array
   * contains partially decrypted values otherwise it contains the initial,
   * fully encrypted selections.
   *
   * @private
   */
   storeDeal(dealingPID, fromPID, cards, isPrivate, isDecryption) {
      if (this.deals[dealingPID] == undefined) {
         this.deals[dealingPID] = new Array();
      }
      var dealObj = this.deals[dealingPID];
      var cardsCopy = Array.from(cards);
      var infoObj = new Object();
      infoObj.fromPID = fromPID;
      if (isDecryption) {
         infoObj.type = "decrypt";
      } else {
         infoObj.type = "select";
      }
      if (isPrivate) {
         infoObj.private = true;
      } else {
         infoObj.private = false;
      }
      infoObj.cards = cardsCopy;
      this.deals[dealingPID].push(infoObj);
   }

   /**
   * Remove a set of items from a deck.
   *
   * @param {Array} removeItems Array of strings matching card values to remove
   * from <code>deckArr</code>
   * @param {Array} deckArr Array of strings matching card values and representing
   * a deck. Items found in <code>removeItems</code> will be removed directly
   * from this array.
   *
   * @return {Boolean} True if the correct number of items were removed from
   * <code>deckArr</code> (i.e. only one unique match for each value existed).
   * False is returned if the removed items don't match the expected set but
   * <code>deckArr</code> may still be modified.
   *
   * @private
   */
   removeFromDeck(removeItems, deckArr) {
      var itemsToRemove = removeItems.length;
      var removedItems = new Array();
      for (var count=0; count < removeItems.length; count++) {
         var count2=0;
         while (count2 < deckArr.length) {
            if (removeItems[count] == deckArr[count2]) {
               removedItems.push(deckArr.splice(count2, 1)[0]);
               //keep going in case there are duplicates
            } else {
               count2++;
            }
         }
      }
      if (removedItems.length == itemsToRemove) {
         return (true);
      }
      return (false);
   }

   /**
   * Compares two card decks of either plaintext mappings or encrypted
   * card values, regardless of their order.
   *
   * @param {Array} deckArr1 First array of numeric strings to compare.
   * @param {Array} deckArr2 Second array of numeric strings to compare.
   *
   * @return {Boolean} True if both decks have exactly the same elements (regardless of order),
   * false if there's a difference.
   *
   * @private
   */
   compareDecks(deck1Arr, deck2Arr) {
      if (deck1Arr.length != deck2Arr.length)  {
         return (false);
      }
      var deck1 = Array.from(deck1Arr);
      var deck2 = Array.from(deck2Arr);
      while (deck1.length > 0) {
         var currentCard = deck1.splice(0, 1);
         var index = 0;
         while (index < deck2.length) {
            var compareCard = deck2[index];
            if (compareCard == currentCard) {
               deck2.splice(index, 1);
               break;
            }
            index++;
         }
      }
      if (deck2.length == 0) {
         //all unique matching elements removed from secondary array (all match)
         return (true);
      }
      return (false);
   }

   /**
   * @private
   */
   toString() {
      //output as much analysis information as possible
      var output = new Object();
      output.deals = this.deals;
      output.communityCards = this.communityCards;
      output.privateCards = this.privateCards;
      output.deck = this.deck;
      output.analysis = this.analysis;
      return (JSON.stringify(output));
   }
}
