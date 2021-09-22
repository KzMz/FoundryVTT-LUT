/**
 * Extend the base Item entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LUTItem extends Item {
    static getTemplateData(item, actor=null) {
        if (!actor) actor = item.actor;
        const token = actor.token;
        const tokenId = token ? `${token.scene._id}.${token.id}` : null;

        return {
            actor: actor,
            tokenId: tokenId,
            item: item.data,
            type: item.type
        };
    }

    static getChatData(html, item, actor=null) {
        if (!actor) actor = item.actor;

        const chatData = {
            user: game.user._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: html,
            speaker: {
                actor: actor._id,
                token: actor.token,
                alias: actor.name
            }
        };

        let rollMode = game.settings.get("core", "rollMode");
        if(["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
        if (rollMode === "blindroll") chatData["blind"] = true;

        return chatData;
    }

    static async postChatMessage(templateData, item, actor=null) {
        const templateType = LUTItem.getTemplateType();
        const template = `systems/ultima-torcia/templates/chat/${templateType}-card.html`;
        const html = await renderTemplate(template, templateData);

        const chatData = this.getChatData(html, item, actor);
        return ChatMessage.create(chatData);
    }

    async roll() {
        const templateData = LUTItem.getTemplateData(this);

        if (this.type === "activefeature") {
            await this._onRollActiveFeature(templateData);
        } else if (this.type === "spellfeature") {
            await this._onRollSpellFeature(templateData);
        } else if (this.type === "weapon") {
            await this._onRollWeapon(templateData);
        } else if (this.type === "potion") {
            await this._onRollPotion(templateData);
        } else if (this.type === "spellscroll") {
            await this._onRollSpellScroll(templateData);
        }

        await LUTItem.postChatMessage(templateData, this);

        if (this.data.data.consumable) {
            await this.removeItem();
        }
        let manaPrice = parseInt(this.data.data.manaprice);
        if (manaPrice > 0) {
            this.actor.consumeMana(manaPrice);
        }
    }

    static getTemplateType() {
        return "active";
    }

    static genericRoll(attribute, faces, dice, modifier, templateData, item, actor=null, isAttackOrDefense=false) {
        if (!actor) actor = item.actor;

        if (attribute === "empty")
        {
            templateData["dice"] = [];
            templateData["faces"] = 0;
            templateData["formula"] = modifier;
            templateData["total"] = modifier;
            templateData["isCritical"] = false;
            templateData["isFumble"] = false;
            templateData["isCombat"] = false;
            templateData["canReroll"] = false;
            templateData["specialtyRerolls"] = 0;
        }
        else
        {
            const diceFormula = actor.getDiceFormula(attribute, faces, dice, modifier, isAttackOrDefense);
            const roll = new Roll(diceFormula).roll();

            const d = roll.dice;
            const attributeData = actor.data.data.attributes[attribute];

            const maxRolls = d[0].results.filter(r => r.result === parseInt(faces) && !r.discarded);
            const fumbleRolls = d[0].results.filter(r => r.result === 1 && !r.discarded);

            templateData["formula"] = roll.formula;
            templateData["total"] = roll.total;
            templateData["dice"] = roll.dice;
            templateData["isCritical"] = maxRolls.length > 0;
            templateData["isFumble"] = maxRolls.length === 0 && fumbleRolls.length > 0;
            templateData["faces"] = faces;
            templateData["isCombat"] = isAttackOrDefense;
            templateData["attribute"] = attribute;
            templateData["canReroll"] = true;

            if (attributeData && attributeData.specialty) {
                const rerolls = d[0].results.filter(r => r.result === 1 || r.result === 2);
                templateData["specialtyRerolls"] = rerolls.length;
            } else {
                templateData["specialtyRerolls"] = 0;
            }
        }
    }

    async _onRollActiveFeature(templateData) {
        const itemData = this.data.data;

        const attribute = itemData.attribute;
        const flavor = `${this.actor.name} usa l'Abilità di Ruolo ${this.name}!`;

        const diceFormula = this.actor.getDiceFormula(attribute, 10, itemData.modifiers.dice, itemData.modifiers.modifier);
        const roll = new Roll(diceFormula).roll();

        const dice = roll.dice;

        const attributeData = this.actor.data.data.attributes[attribute];

        const faces = dice[0].faces;
        const maxRolls = dice[0].results.filter(r => r.result === faces && !r.discarded);
        const fumbleRolls = dice[0].results.filter(r => r.result === 1 && !r.discarded);

        templateData["formula"] = roll.formula;
        templateData["total"] = roll.total;
        templateData["dice"] = roll.dice;
        templateData["isCritical"] = maxRolls.length > 0;
        templateData["isFumble"] = maxRolls.length === 0 && fumbleRolls.length > 0;
        templateData["hasResult"] = true;
        templateData["faces"] = 10;
        templateData["isCombat"] = false;
        templateData["attribute"] = attribute;
        templateData["canReroll"] = true;

        templateData["flavor"] = flavor;

        if (attributeData.specialty) {
            const rerolls = dice[0].results.filter(r => r.result === 1 || r.result === 2);
            templateData["specialtyRerolls"] = rerolls.length;
        } else {
            templateData["specialtyRerolls"] = 0;
        }
    }

    async _onRollWeapon(templateData) {
        templateData["hasAttack"] = true;
        templateData["hasDamage"] = true;
    }

    async _onRollPotion(templateData) {
        const itemData = this.data.data;
        const flavor = `${this.actor.name} usa ${this.name}!`;

        let diceFormula;
        let health = false;
        let mana = false;
        if (itemData.recover.health.faces !== "") {
            health = true;
            diceFormula = this.actor.getDiceFormula("", itemData.recover.health.faces, itemData.recover.health.dice, itemData.recover.health.modifier);
            templateData["custom"] = "Punti Salute";
        }
        else if (itemData.recover.mana.faces !== "") {
            mana = true;
            diceFormula = this.actor.getDiceFormula("", itemData.recover.mana.faces, itemData.recover.mana.dice, itemData.recover.mana.modifier);
            templateData["custom"] = "Punti Mana";
        }

        const roll = new Roll(diceFormula).roll();

        if (health) {
            this.actor.recoverHealth(roll.total);
        }
        if (mana) {
            this.actor.recoverMana(roll.total);
        }

        templateData["formula"] = roll.formula;
        templateData["total"] = roll.total;
        templateData["result"] = roll.result;
        templateData["isHealth"] = health;
        templateData["isMana"] = mana;
        templateData["hasResult"] = true;
        templateData["canReroll"] = false;

        templateData["flavor"] = flavor;
    }

    async removeItem() {
        if (!this.actor) return;

        const prev = this.data.data.container;

        if (this.type === "armor") {
            this.actor.data.data.inventory.equipped.armor = null;
        }
        else if (this.type === "shield") {
            this.actor.data.data.inventory.equipped.shield = null;
        }

        this.actor.deleteOwnedItem(this._id);
        const update = {};
        if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
            update[`data.inventory.${prev}size.value`] = this.actor.data.data.inventory[`${prev}size`].value + item.data.data.slots;
        }

        this.actor.update(update);
    }

    async _onRollSpellScroll(templateData) {
        const itemData = this.data.data;
        if (!itemData.spell) return;

        const spell = game.items.find(s => s._id === itemData.spell);
        if (!spell) return;

        templateData["overrideId"] = itemData.spell;
        await spell._onRollSpellFeature(templateData);
    }

    async _onRollSpellFeature(templateData) {
        const itemData = this.data.data;

        let pre = "";
        switch (itemData.type) {
            case 'naturechant':
                pre = "Canto della Natura";
                break;
            case 'enchant':
                pre = "Incantesimo";
                break;
            case 'prayer':
                pre = "Preghiera";
                break;
        }

        templateData["prename"] = pre;

        if (itemData.duration.attribute !== "") {
            templateData["hasDuration"] = true;
        }
        if (itemData.target.attribute !== "") {
            templateData["hasTarget"] = true;
        }
        if (itemData.hit.attribute !== "") {
            templateData["hasAttack"] = true;
        }
        if (itemData.damage.attribute !== "") {
            templateData["hasDamage"] = true;
        }

        templateData["isHealing"] = itemData.damage.healing;
    }

    /* -------------------------------------------- */
    /*  Chat Message Helpers                        */
    /* -------------------------------------------- */

    static chatListeners(html) {
        html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
        html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Handle execution of a chat card action via a click event on one of the card buttons
     * @param {Event} event       The originating click event
     * @returns {Promise}         A promise which resolves once the handler workflow is complete
     * @private
     */
    static async _onChatCardAction(event) {
        event.preventDefault();

        // Extract card data
        const button = event.currentTarget;
        button.disabled = true;
        const card = button.closest(".chat-card");
        const messageId = card.closest(".message").dataset.messageId;
        const message = game.messages.get(messageId);
        const action = button.dataset.action;

        // Validate permission to proceed with the roll
        if (!(game.user.isGM || message.isAuthor)) return;

        // Get the Actor from a synthetic Token
        const actor = this._getChatCardActor(card);
        if (!actor) return;

        if (action === "specialtyRoll") return;

        // Get the Item
        let item = actor.getOwnedItem(card.dataset.itemId);
        if ( !item ) {
            item = game.items.find(i => i._id === card.dataset.itemId);

            if (!item) {
                return ui.notifications.error(`L'oggetto ${card.dataset.itemId} non esiste più sull'Actor ${actor.name}`);
            }
        }

        const templateData = this.getTemplateData(item, actor);

        const itemData = item.data.data;
        switch (action) {
            case "attack":
                this.genericRoll(itemData.hit.attribute, 10, itemData.hit.dice, itemData.hit.modifier, templateData, item, actor, true);
                templateData["custom"] = itemData.hit.custom;
                templateData["postname"] = "Tiro per Colpire";
                break;
            case "duration":
                this.genericRoll(itemData.duration.attribute, itemData.duration.faces, itemData.duration.dice, itemData.duration.modifier, templateData, item, actor);
                templateData["custom"] = itemData.duration.custom;
                templateData["postname"] = "Durata";
                break;
            case "damage":
                this.genericRoll(itemData.damage.attribute, itemData.damage.faces, itemData.damage.dice, itemData.damage.modifier, templateData, item, actor);
                templateData["custom"] = itemData.damage.custom;
                templateData["postname"] = "Danni";
                break;
            case "target":
                this.genericRoll(itemData.target.attribute, itemData.target.faces, itemData.target.dice, itemData.target.modifier, templateData, item, actor);
                templateData["custom"] = itemData.target.custom;
                templateData["postname"] = "Bersaglio";
                break;
        }

        templateData["hasResult"] = true;
        await this.postChatMessage(templateData, item, actor);

        // Re-enable the button
        button.disabled = false;
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling the visibility of chat card content when the name is clicked
     * @param {Event} event   The originating click event
     * @private
     */
    static _onChatCardToggleContent(event) {
        event.preventDefault();

        const header = event.currentTarget;
        const card = header.closest(".chat-card");
        const content = card.querySelector(".card-content");
        content.style.display = content.style.display === "none" ? "block" : "none";
    }

    /* -------------------------------------------- */

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Actor|null}         The Actor entity or null
     * @private
     */
    static _getChatCardActor(card) {
        // Case 1 - a synthetic actor from a Token
        const tokenKey = card.dataset.tokenId;
        if (tokenKey) {
            const [sceneId, tokenId] = tokenKey.split(".");
            const scene = game.scenes.get(sceneId);
            if (!scene) return null;
            const tokenData = scene.getEmbeddedEntity("Token", tokenId);
            if (!tokenData) return null;
            const token = new Token(tokenData);
            return token.actor;
        }

        // Case 2 - use Actor ID directory
        const actorId = card.dataset.actorId;
        return game.actors.get(actorId) || null;
    }

    /* -------------------------------------------- */

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Array.<Actor>}      An Array of Actor entities, if any
     * @private
     */
    static _getChatCardTargets(card) {
        const character = game.user.character;
        const controlled = canvas.tokens.controlled;
        const targets = controlled.reduce((arr, t) => t.actor ? arr.concat([t.actor]) : arr, []);
        if ( character && (controlled.length === 0) ) targets.push(character);

        return targets;
    }
}