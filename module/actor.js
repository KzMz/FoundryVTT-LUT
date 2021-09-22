/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LUTActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    const shorthand = game.settings.get("ultima-torcia", "macroShorthand");

    return data;
  }

  static lutAttributes() {
    return ['agility', 'courage', 'strength', 'intelligence', 'magic', 'dexterity', 'perception', 'sociality'];
  }

  static lutAttributeNames() {
    return {
        agility: "Agilità",
        courage: "Coraggio",
        strength: "Forza",
        intelligence: "Intelligenza",
        magic: "Magia",
        dexterity: "Manualità",
        perception: "Percezione",
        sociality: "Socialità"
    };
  }

  setupLight(item, on=true) {
    if (item.type === "light") {
      const token = this.getActiveTokens()[0];
      const duration = item.data.data.duration * 60;
      const speaker = {
        actor: this._id,
        token: token,
        alias: this.name
      };

      let light = 0;
      if (token) {
        if (game.modules.get("about-time").active === true) {
          // About Time

          if (on) {
            light = item.data.data.range;

            ((backup) => {
              game.Gametime.doIn({minutes: Math.floor(3 * duration / 4)}, () => {
                ChatMessage.create({
                  user: game.user._id,
                  content: "Il fuoco si sta indebolendo...",
                  speaker: speaker
                }, {});
              });
            })(Object.assign({}, token.data));

            ((backup) => {
              game.Gametime.doIn({minutes:duration}, () => {
                ChatMessage.create({
                  user: game.user._id,
                  content: "Le fiamme si spengono, lasciandoti nel buio più profondo.",
                  speaker: speaker
                }, {});
                token.update({
                  vision: true,
                  dimSight: backup.dimSight,
                  brightSight: backup.brightSight,
                  dimLight: backup.dimLight,
                  brightLight:  backup.brightLight,
                  lightAngle: backup.lightAngle,
                  lockRotation: backup.lockRotation
                });
              });
            })(Object.assign({}, token.data));
          }
        }

        token.update({
          vision: true,
          brightLight: light,
          brightSight: 0
        });
      }
    }
  }

  /** @override */
  static async create(data, options = {}) {
    data.token = data.token || {};
    if (data.type === "character") {
      mergeObject(data.token, {
        actorLink: true,
        displayBars: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        vision: true,
        bar1: {
          attribute: "health"
        },
        bar2: {
          attribute: "mana"
        }
      }, {
        overwrite: false
      });
    }
    if (data.type === "npc") {
      mergeObject(data.token, {
        actorLink: false,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        vision: false,
        bar1: {
          attribute: "health"
        },
        bar2: {
          attribute: "mana"
        }
      }, {
        overwrite: false
      });
    }
    return super.create(data, options);
  }

  getDiceFormula(attribute, faces = 10, dice = 0, modifier = 0, isAttackOrDefense=false, useAttributeDice = true) {
    let diceNo = dice;
    if (diceNo === 0) diceNo = 1;

    let hasSpecialty = false;
    let mod = 0;

    const actorData = this.data.data;
    if (attribute !== "empty" && attribute !== "") {
      const attributeData = actorData.attributes[attribute];

      if (useAttributeDice) {
          diceNo = dice + attributeData.dice;
      }
      mod = parseInt(modifier + attributeData.modifier);

      if (attribute === "agility" && isAttackOrDefense) {
          const item = this.items.find(i => i.name === "Nano");
          if (item) {
              mod += 1;
          }
      }
    } else {
        if (isAttackOrDefense) {
            const item = this.items.find(i => i.name === "Nano");
            if (item) {
                mod += 1;
            }
        }
    }

    let formula = `${diceNo}d${faces}kh1`;
    if (mod !== 0) {
      formula += ` + ${mod}`;
    }
    return formula;
  }

  async createAttributeMacros() {
      const attributes = LUTActor.lutAttributes();

      for (let i = 1; i < 50; i++) {
          game.user.assignHotbarMacro(null, i);
      }

      const images = [
          'systems/ultima-torcia/images/icons/b_26_result.png',
          'systems/ultima-torcia/images/icons/b_01_result.png',
          'systems/ultima-torcia/images/icons/y_05_result.png',
          'systems/ultima-torcia/images/icons/r_15_result.png',
          'systems/ultima-torcia/images/icons/v_33_result.png',
          'systems/ultima-torcia/images/icons/b_21_result.png',
          'systems/ultima-torcia/images/icons/v_09_result.png',
          'systems/ultima-torcia/images/icons/y_04_result.png',
      ];

      let i = 1;
      for (const attribute of attributes) {
          const command = `game.ultimatorcia.rollAttributeMacro("${attribute}");`;
          let macro = game.macros.entities.find(m => (m.name === LUTActor.lutAttributeNames()[attribute]) && (m.command === command));
          if (!macro) {
            macro = await Macro.create({
              name: LUTActor.lutAttributeNames()[attribute],
              type: "script",
              img: images[i - 1],
              command: command,
              flags: { "ultimatorcia.itemMacro": true }
            });
          }
          game.user.assignHotbarMacro(macro, i);
          i++;
      }
  }

  async attributeCheck(attribute, isAttackOrDefense=false) {
    const token = this.token;

    const attributeName = LUTActor.lutAttributeNames()[attribute];
    const flavor = `effettua un test di ${attributeName}!`;

    const templateData = {
      actor: this,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      type: this.type,
      flavor: flavor
    };

    const roll = new Roll(this.getDiceFormula(attribute, 10, 0, 0, isAttackOrDefense)).roll();
    const d = roll.dice;

    const maxRolls = d[0].results.filter(r => r.result === 10 && !r.discarded);
    const fumbleRolls = d[0].results.filter(r => r.result === 1 && !r.discarded);

    const attributeData = this.data.data.attributes[attribute];

    templateData["formula"] = roll.formula;
    templateData["total"] = roll.total;
    templateData["dice"] = roll.dice;
    templateData["isCritical"] = maxRolls.length > 0;
    templateData["isFumble"] = maxRolls.length === 0 && fumbleRolls.length > 0;
    templateData["faces"] = 10;
    templateData["isCombat"] = isAttackOrDefense;
    templateData["attribute"] = attribute;

    if (attributeData.specialty) {
        const rerolls = d[0].results.filter(r => r.result === 1 || r.result === 2);
        templateData["specialtyRerolls"] = rerolls.length;
    } else {
        templateData["specialtyRerolls"] = 0;
    }

    const template = `systems/ultima-torcia/templates/chat/simple-card.html`;
    const html = await renderTemplate(template, templateData);

    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this._id,
        token: this.token,
        alias: this.name
      }
    };

    let rollMode = game.settings.get("core", "rollMode");
    if(["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") chatData["blind"] = true;

    return ChatMessage.create(chatData);
  }

  getInitiativeAttribute() {
    return "courage";
  }

  recoverHealth(health) {
    let h = this.data.data.health.value;
    h += health;

    if (h > this.data.data.health.max) h = this.data.data.health.max;

    this.update({
      'data.health.value': h
    })
  }

  consumeHealth(health) {
    let h = this.data.data.health.value;
    h -= health;

    if (h < -5) h = -5;

    this.update({
      'data.health.value': h
    })
  }

  recoverMana(mana) {
    let h = this.data.data.mana.value;
    h += mana;

    if (h > this.data.data.mana.max) h = this.data.data.mana.max;

    this.update({
      'data.mana.value': h
    })
  }

  consumeMana(mana) {
    let m = this.data.data.mana.value;
    m -= mana;

    if (m < 0) m = 0;

    this.update({
      'data.mana.value': m
    })
  }

  restoreRoll() {
    let hpFormula = '1d4';
    let mpFormula = '1d4';

    for (let item of this.items) {
      if (item.type === "passivefeature") {
        hpFormula = `${hpFormula} + ${item.data.data.healingmod}`;

        if (item.data.data.recovery) {
          if (item.data.data.recovery.hpFormula !== '') {
            hpFormula = item.data.data.recovery.hpFormula;
          }
          if (item.data.data.recovery.mpFormula !== '') {
            mpFormula = item.data.data.recovery.mpFormula;
          }
        }
      }
    }

    let r = new Roll(hpFormula);
    let roll = r.roll();
    let dice = roll.dice;

    const hpResult = dice[0].results.filter(res => res.active);
    this.recoverHealth(hpResult[0].result);

    r = new Roll(mpFormula);
    roll = r.roll();
    dice = roll.dice;

    const mpResult = dice[0].results.filter(res => res.active);
    this.recoverMana(mpResult[0].result);

    const flavor = `${this.name} tira di recupero... E recupera ${hpResult[0].result} punto/i Salute e ${mpResult[0].result} punto/i Mana!`;
    ChatMessage.create({
      content: flavor,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker()
    }, {});
  }

  consumeResources(roll=true) {
    let canRestore = true;

    let rations = this.data.data.survival.rations.value;
    rations -= 1;

    if (rations < 0) {
      rations = 0;
      canRestore = false;
    }

    let water = this.data.data.survival.water.value;
    water -= 1;

    if (water < 0) {
      water = 0;
      canRestore = false;
    }

    if (canRestore && roll) {
      this.restoreRoll();
    }

    this.update({
      'data.survival.rations.value': rations,
      'data.survival.water.value': water
    });

    return canRestore;
  }

  static chatListeners(html) {
    html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
  }

  async specialtyReroll(faces, rerolls, attribute, isCombat) {
      const diceText = rerolls === 1 ? " dado" : " dadi";

      const templateData = {
          actor: this,
          tokenId: this.token ? `${this.token.scene._id}.${this.token.id}` : null,
          item: this.data,
          type: this.type,
          flavor: "Sfrutta il pregio, ritirando " + rerolls + diceText + "!"
      };

      const attributeData = this.data.data.attributes[attribute];
      const roll = new Roll(this.getDiceFormula(attribute, faces, rerolls, 0, isCombat === "true", false)).roll();
      const d = roll.dice;

      const maxRolls = d[0].results.filter(r => r.result === 10 && !r.discarded);
      const fumbleRolls = d[0].results.filter(r => r.result === 1 && !r.discarded);

      templateData["formula"] = roll.formula;
      templateData["total"] = roll.total;
      templateData["dice"] = roll.dice;
      templateData["isCritical"] = maxRolls.length > 0;
      templateData["isFumble"] = maxRolls.length === 0 && fumbleRolls.length > 0;
      templateData["faces"] = 10;
      templateData["specialtyRerolls"] = 0;

      const template = `systems/ultima-torcia/templates/chat/simple-card.html`;
      const html = await renderTemplate(template, templateData);

      const chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: html,
        speaker: {
          actor: this._id,
          token: this.token,
          alias: this.name
        }
      };

      let rollMode = game.settings.get("core", "rollMode");
      if(["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      if (rollMode === "blindroll") chatData["blind"] = true;

      return ChatMessage.create(chatData);
  }

  static async _onChatCardAction(event) {
      event.preventDefault();

      // Extract card data
      const button = event.currentTarget;
      //button.disabled = true;
      const card = button.closest(".chat-card");
      const messageId = card.closest(".message").dataset.messageId;
      const message = game.messages.get(messageId);
      const action = button.dataset.action;

      // Validate permission to proceed with the roll
      if (!(game.user.isGM || message.isAuthor)) return;

      // Get the Actor from a synthetic Token
      const actor = this._getChatCardActor(card);
      if (!actor) return;

      if (action !== "specialtyRoll") return;

      const faces = button.dataset.dice;
      const rerolls = button.dataset.rerolls;
      const attribute = button.dataset.attribute;
      const combat = button.dataset.combat;

      const attributeData = actor.data.data.attributes[attribute];
      if (!attributeData) return;

      //button.remove();

      return actor.specialtyReroll(faces, rerolls, attribute, combat);
  }

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
}
