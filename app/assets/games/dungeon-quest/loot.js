// === GÉNÉRATION DE LOOT ALCATOIRE ===

function generateRandomLoot() {
    let rng = Math.random();
    if (rng < 0.33) {
        let dmgBonus = 2 + Math.floor(Math.random() * 5);
        return new Item('weapon', `Épée +${dmgBonus}`, dmgBonus, 0, 0);
    } else if (rng < 0.66) {
        let defBonus = 1 + Math.floor(Math.random() * 4);
        return new Item('armor', `Armure +${defBonus}`, 0, defBonus, 0);
    } else {
        let healVal = 8 + Math.floor(Math.random() * 12);
        return new Item('potion', `Potion de soin`, 0, 0, healVal);
    }
}

function generateRareLoot(cursed = false) {
    if (cursed) {
        let cursedItem = new Item('weapon', 'Épée maudite', 6, -2, 0);
        addMessage(`⚠️ ATTENTION: Objet maudit! bonus dégâts +6 mais -2 défense!`);
        return cursedItem;
    } else {
        let legendary = new Item('armor', 'Cuirasse légendaire', 3, 4, 15);
        addMessage(`🌟 Objet légendaire trouvé! +3 dégâts +4 défense + soin 15!`);
        legendary.healAmount = 15;
        return legendary;
    }
}
