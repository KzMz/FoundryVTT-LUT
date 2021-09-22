/**
 * Optionally hide the display of chat card action buttons which cannot be performed by the user
 */
export const displayChatActionButtons = function(message, html, data) {
    const chatCard = html.find(".ultima-torcia.chat-card");
    if (chatCard.length > 0) {
        // If the user is the message author or the actor owner, proceed
        let actor = game.actors.get(data.message.speaker.actor);
        if (actor && actor.owner) return;
        else if (game.user.isGM || (data.author.id === game.user.id)) return;

        // Otherwise conceal action buttons except for saving throw
        const buttons = chatCard.find("button[data-action]");
        buttons.each((i, btn) => {
            if (btn.dataset.action === "save") return;
            btn.style.display = "none"
        });
    }
};