// === COMBAT CORRIGÉ - Suppression de l'ennemi après défaite ===

let currentEnemy = null;
let combatActive = false;

function startCombat(enemy) {
    combatActive = true;
    currentEnemy = enemy;
    addMessage(`⚔️ COMBAT contre ${enemy.name} (PV: ${enemy.hp}/${enemy.maxHp}, Dégâts: ${enemy.damage}) !`);
    updateUI();
    drawGame();
}

function playerAttack() {
    if (!combatActive || !currentEnemy) return false;

    let damage = game.player.totalDamage + Math.floor(Math.random() * 5);
    let crit = Math.random() < 0.15;
    if (crit) {
        damage = Math.floor(damage * 1.7);
        addMessage(`⚡ COUP CRITIQUE! ${damage} dégâts!`);
    }

    currentEnemy.hp -= damage;
    addMessage(`🗡️ Vous infligez ${damage} dégâts à ${currentEnemy.name}.`);

    if (currentEnemy.hp <= 0) {
        addMessage(`💀 ${currentEnemy.name} est MORT! +${currentEnemy.expReward} XP de progression.`);

        // SUPPRIMER L'ENNEMI DU DONJON
        const enemyIndex = game.dungeon.enemies.findIndex(e => e === currentEnemy);
        if (enemyIndex !== -1) game.dungeon.enemies.splice(enemyIndex, 1);

        // Chance de drop
        if (Math.random() < 0.4) {
            let drop = generateRandomLoot();
            game.player.addItem(drop);
            addMessage(`🎁 ${currentEnemy.name} a laissé: ${drop.name}!`);
            updateUI();
        }

        combatActive = false;
        currentEnemy = null;
        updateUI();
        drawGame();

        // Vérifier si tous les ennemis sont morts
        if (game.dungeon.enemies.length === 0) {
            addMessage(`✨ TOUS LES ENNEMIS SONT MORTS! Cherchez les escaliers > pour continuer.`);
        }
        return true;
    }

    // Tour ennemi
    let dmg = currentEnemy.attack(game.player);
    if (game.player.hp <= 0) {
        gameOver();
        return false;
    }
    updateUI();
    drawGame();
    return true;
}

function fleeFromCombat() {
    if (!combatActive) return;
    let fleeChance = 0.45;
    if (Math.random() < fleeChance) {
        addMessage(`🏃‍♂️ FUITE RÉUSSIE! Vous êtes en sécurité... pour l'instant.`);
        combatActive = false;
        currentEnemy = null;
        updateUI();
        drawGame();
    } else {
        addMessage(`😰 FUITE ÉCHOUÉE! L'ennemi contre-attaque!`);
        currentEnemy.attack(game.player);
        if (game.player.hp <= 0) gameOver();
        updateUI();
        drawGame();
    }
}
