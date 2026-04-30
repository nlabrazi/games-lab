// === INTERFACE UTILISATEUR & RENDU ===

function updateUI() {
    if (!game || !game.player) return;
    document.getElementById('healthValue').innerText = game.player.hp;
    document.getElementById('maxHealthValue').innerText = game.player.maxHp;
    document.getElementById('damageValue').innerText = game.player.totalDamage;
    document.getElementById('defenseValue').innerText = game.player.defense;
    document.getElementById('floorValue').innerText = game.player.floor;

    let invHtml = '';
    game.player.inventory.slice(-5).forEach(item => {
        invHtml += `<div>✨ ${item.name}</div>`;
    });
    if (invHtml === '') invHtml = '<div style="color:#888">-- vide --</div>';
    document.getElementById('inventoryList').innerHTML = invHtml;
}

function updateMessageLog() {
    let logDiv = document.getElementById('messageLog');
    logDiv.innerHTML = messageQueue.slice(0, 6).map(msg => `> ${msg}`).join('<br>');
}

function drawGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const cellW = canvas.width / game.dungeon.width;
    const cellH = canvas.height / game.dungeon.height;

    ctx.fillStyle = '#0a0c18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Afficher le donjon
    for (let y = 0; y < game.dungeon.height; y++) {
        for (let x = 0; x < game.dungeon.width; x++) {
            let tile = game.dungeon.map[y][x];
            let color = '#251f1a';
            if (tile === '.') color = '#3a2c28';
            if (tile === '#') color = '#0f0e12';
            if (tile === '>') color = '#c9ae74';
            ctx.fillStyle = color;
            ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);

            if (tile === '>') {
                ctx.fillStyle = '#ffcc66';
                ctx.font = `${cellW * 0.7}px monospace`;
                ctx.fillText('↓', x * cellW + 3, y * cellH + cellH - 5);
            }
        }
    }

    // Items
    for (let obj of game.dungeon.items) {
        ctx.fillStyle = '#f7d44a';
        ctx.fillRect(obj.x * cellW, obj.y * cellH, cellW, cellH);
        ctx.fillStyle = '#aa8844';
        ctx.font = `${cellW * 0.8}px monospace`;
        ctx.fillText('?', obj.x * cellW + 4, obj.y * cellH + cellH - 5);
    }

    // Ennemis
    for (let enemy of game.dungeon.enemies) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x * cellW, enemy.y * cellH, cellW, cellH);
        ctx.fillStyle = 'white';
        ctx.font = `${cellW * 0.7}px monospace`;
        ctx.fillText(enemy.char, enemy.x * cellW + 5, enemy.y * cellH + cellH - 6);
        // barre vie
        let hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#aa2222';
        ctx.fillRect(enemy.x * cellW, enemy.y * cellH - 5, cellW, 4);
        ctx.fillStyle = '#33ff66';
        ctx.fillRect(enemy.x * cellW, enemy.y * cellH - 5, cellW * hpPercent, 4);
    }

    // Joueur
    ctx.fillStyle = '#9bff7e';
    ctx.fillRect(game.player.x * cellW, game.player.y * cellH, cellW, cellH);
    ctx.fillStyle = '#000';
    ctx.font = `${cellW * 0.8}px monospace`;
    ctx.fillText('@', game.player.x * cellW + 5, game.player.y * cellH + cellH - 5);

    if (combatActive && currentEnemy) {
        ctx.fillStyle = '#000000aa';
        ctx.fillRect(0, 0, canvas.width, 80);
        ctx.fillStyle = 'red';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`COMBAT vs ${currentEnemy.name}  [PV:${currentEnemy.hp}]`, 20, 45);
        ctx.fillStyle = '#aaffaa';
        ctx.font = '14px monospace';
        ctx.fillText(`Cliquez sur ATTAQUER (bouton)`, 20, 75);
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#7fffd4';
        ctx.font = 'bold 42px monospace';
        ctx.fillText('⏸ PAUSE', canvas.width / 2 - 105, canvas.height / 2 - 20);
        ctx.fillStyle = '#f0ff70';
        ctx.font = '20px monospace';
        ctx.fillText('Appuyez sur P ou ECHAP pour reprendre', canvas.width / 2 - 205, canvas.height / 2 + 35);
    }
}
