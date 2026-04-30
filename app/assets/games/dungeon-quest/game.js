// === JEU PRINCIPAL CORRIGÉ ===

let game = null;
let clickAction = null;
let isPaused = false;

function initGame() {
    game = {
        dungeon: null,
        player: null,
        running: true
    };
    game.player = new Player(0, 0);
    game.player.floor = 1;
    game.player.maxHp = 30;
    game.player.hp = 30;
    game.dungeon = new Dungeon(25, 18, game.player.floor);
    game.player.x = game.dungeon.playerStart.x;
    game.player.y = game.dungeon.playerStart.y;
    game.running = true;
    isPaused = false;
    combatActive = false;
    currentEnemy = null;
    messageQueue = [];
    addMessage("🌟 AVENTURE COMMENCE ! Utilisez les FLÈCHES pour explorer.");
    addMessage(`🗡️ ${game.dungeon.enemies.length} ennemis rôdent dans les salles...`);
    updatePauseButton();
    updateUI();
    drawGame();
}

function movePlayer(dx, dy) {
    if (isPaused || combatActive || !game.running) return;

    let newX = game.player.x + dx;
    let newY = game.player.y + dy;

    if (newY < 0 || newY >= game.dungeon.height || newX < 0 || newX >= game.dungeon.width) return;
    let tile = game.dungeon.map[newY]?.[newX];
    if (tile === '#') return;

    // Vérifier combat EN PRIORITÉ
    let enemyHere = game.dungeon.enemies.find(e => e.x === newX && e.y === newY);
    if (enemyHere) {
        startCombat(enemyHere);
        drawGame();
        return;
    }

    // Vérifier loot
    let itemIndex = game.dungeon.items.findIndex(i => i.x === newX && i.y === newY);
    if (itemIndex !== -1) {
        let lootObj = game.dungeon.items[itemIndex];
        if (lootObj.isChest) {
            addMessage(`🎁 COFFRE: ${lootObj.item.name} !`);
            if (lootObj.cursed) addMessage(`⚠️ MALÉDICTION: -2 défense permanente!`);
        } else {
            addMessage(`🎒 Vous ramassez: ${lootObj.item.name}!`);
        }
        game.player.addItem(lootObj.item);
        game.dungeon.items.splice(itemIndex, 1);
        updateUI();
    }

    // Déplacement
    game.player.x = newX;
    game.player.y = newY;

    // Escalier -> niveau suivant
    if (tile === '>') {
        game.player.floor++;
        addMessage(`🚪 VOUS DESCENDEZ au niveau ${game.player.floor} ! Les ennemis sont plus forts...`);
        game.dungeon = new Dungeon(25, 18, game.player.floor);
        game.player.x = game.dungeon.playerStart.x;
        game.player.y = game.dungeon.playerStart.y;
        game.player.heal(8);
        addMessage(`❤️ Vous récupérez 8 PV en trouvant une source sacrée.`);
        updateUI();
        drawGame();
    }

    drawGame();
}

function gameOver() {
    game.running = false;
    combatActive = false;
    addMessage(`💀 GAME OVER - Niveau atteint: ${game.player.floor} | Score: ${game.player.floor * 100}`);
    addMessage(`🔁 Cliquez sur "NOUVELLE AVENTURE" pour recommencer.`);
    drawGame();
}

function restartGame() {
    initGame();
}

function updatePauseButton() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.innerText = isPaused ? '▶ REPRENDRE' : '⏸ PAUSE';
}

function setPaused(value) {
    if (!game || !game.running) return;
    isPaused = value;
    updatePauseButton();
    drawGame();
}

function togglePause() {
    setPaused(!isPaused);
}

// Gestion clavier
window.removeEventListener('keydown', null);
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (!e.repeat) togglePause();
        e.preventDefault();
        return;
    }

    if (isPaused) {
        e.preventDefault();
        return;
    }

    if (combatActive) {
        if (e.key === ' ' || e.key === 'Space') {
            playerAttack();
            drawGame();
            e.preventDefault();
        } else if (e.key === 'f' || e.key === 'F') {
            fleeFromCombat();
            drawGame();
            e.preventDefault();
        }
        return;
    }
    if (e.key === 'ArrowUp') movePlayer(0, -1);
    if (e.key === 'ArrowDown') movePlayer(0, 1);
    if (e.key === 'ArrowLeft') movePlayer(-1, 0);
    if (e.key === 'ArrowRight') movePlayer(1, 0);
    e.preventDefault();
});

function setupCombatButtons() {
    let panel = document.querySelector('.ui-panel');
    let existing = document.getElementById('combatBtnGroup');
    if (existing) existing.remove();
    let div = document.createElement('div');
    div.id = 'combatBtnGroup';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';

    let attackBtn = document.createElement('button');
    attackBtn.innerText = '⚔️ ATTAQUER (ESPACE)';
    attackBtn.onclick = () => { if(combatActive && !isPaused) playerAttack(); drawGame(); };

    let fleeBtn = document.createElement('button');
    fleeBtn.innerText = '🏃‍♂️ FUIR (F)';
    fleeBtn.onclick = () => { if (!isPaused) fleeFromCombat(); drawGame(); };

    let healthWarning = document.createElement('span');
    healthWarning.id = 'combatHealth';
    healthWarning.style.color = '#ffaa66';

    div.appendChild(attackBtn);
    div.appendChild(fleeBtn);
    div.appendChild(healthWarning);
    panel.appendChild(div);
}

// Mettre à jour l'affichage combat
setInterval(() => {
    if (combatActive && currentEnemy) {
        let warn = document.getElementById('combatHealth');
        if (warn) warn.innerText = `❤️ vs ${currentEnemy.name} (PV:${currentEnemy.hp})`;
    } else if (document.getElementById('combatHealth')) {
        document.getElementById('combatHealth').innerText = '';
    }
}, 100);

document.getElementById('restartBtn').onclick = () => { restartGame(); };
document.getElementById('pauseBtn').onclick = () => { togglePause(); };
setupCombatButtons();
initGame();
