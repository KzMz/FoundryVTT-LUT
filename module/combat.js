export const _getInitiativeFormula = function(combatant) {
    const actor = combatant.actor;
    if (!actor) return "1d10";

    const initAttribute = actor.getInitiativeAttribute();
    if (!initAttribute) return "1d10";

    const modifier = actor.data.data.modifiers.initiative;
    return actor.getDiceFormula(initAttribute, 10, 0, modifier) + " + " + (actor.data.type === "character" ? 0.99 : 0.00);
};