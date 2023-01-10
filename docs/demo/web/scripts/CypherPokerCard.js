/**
* @file Storage and functionality for a single CypherPoker.JS card.
*
* @version 0.2.0
* @author Patrick Bay
* @copyright MIT License
*/


/**
* @class Stores and manages information for a card in a {@link CypherPokerGame}
* instance.
*/
class CypherPokerCard {

   /**
   * Creates a new card instance.
   *
   * @param {String} mapping The plaintext mapping or unencrypted value for
   * the card (e.g. a quadratic residue)
   * @param {Object} cardInfo Additional information for the card such as
   * its suit, numerical value, colour, etc. Enumerable properties of this object
   * become accessible directly as frozen properties of this class instance.
   */
   constructor (mapping, cardInfo) {
      this._mapping = mapping;
      var keyMap = Object.keys(cardInfo);
      for (var count=0; count < keyMap.length; count++) {
         var key = keyMap[count];
         this[key] = cardInfo[key];
      }
      Object.freeze(this);
   }

   /**
   * @property {String} mapping The plaintext or face-up value (e.g. quadratic
   * residue), associated with this card.
   * @readonly
   */
   get mapping() {
      return (this._mapping);
   }

   /**
   * Adds a graphical representation of the card to the HTML DOM.
   *
   * @param {HTMLElement} parentElement The parent or containing element within
   * which to add the card graphic.
   * @param {String} [cardClass="card"] Custom class to apply to the card element.
   * @param {String} [URIProp="imageURI"] The dynamic property of this instance that
   * contains the URI of the card image with which to construct the child element.
   */
   addToDOM(parentElement, cardClass="card", URIProp="imageURI") {
      if (this[URIProp] == undefined) {
         throw (new Error("Card image URI property \""+URIProp+"\" not defined."));
      }
      if ((this[URIProp] == null) || (this[URIProp] == "")) {
         //nothing to do
         return;
      }
      var cardElement = document.createElement("img");
      cardElement.setAttribute("class", cardClass);
      cardElement.setAttribute("src", this[URIProp]);
      parentElement.appendChild(cardElement);
   }

   /**
   * Compares the properties of another {@link CypherPokerCard} instance to this
   * one to determine if they're the same card.
   *
   * @param {CypherPokerCard} card The card instance to compare to this one.
   *
   * @return {Boolean} True if both cards have the same properties, false
   * if they're different.
   */
   compare (card) {
      for (var item in card) {
         if (this[item] != card[item]) {
            return (false);
         }
      }
      return (true);
   }

   /**
   * @private
   */
   toString() {
      if (this.shortname != undefined) {
         return ("[object CypherPokerCard "+this.shortname+"]");
      } else if (this.name != undefined) {
         return ("[object CypherPokerCard \""+this.name+"\"]");
      } else {
         return ("[object CypherPokerCard]");
      }
   }
}
