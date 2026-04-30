// === ENTITÉS ET CLASSES DE BASE ===

class Entity {
    constructor(x, y, char, color, name) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.color = color;
        this.name = name;
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, '@', '#7eff6e', 'Aventurier');
        this.maxHp = 30;
        this.hp = 30;
        this.baseDamage = 6;
        this.extraDamage = 0;
        this.defense = 0;
        this.inventory = [];
        this.floor = 1;
    }

    get totalDamage() {
        return this.baseDamage + this.extraDamage;
    }

    takeDamage(amount) {
        let mitigated = Math.max(1, amount - this.defense);
        this.hp -= mitigated;
        if (this.hp <= 0) this.hp = 0;
        return mitigated;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    addItem(item) {
        this.inventory.push(item);
        this.applyItemEffects(item);
    }

    applyItemEffects(item) {
        if (item.type === 'weapon') this.extraDamage += item.bonusDamage;
        if (item.type === 'armor') this.defense += item.bonusDefense;
        if (item.type === 'potion') this.heal(item.healAmount);
    }
}

class Enemy extends Entity {
    constructor(x, y, type, level) {
        let baseStats = Enemy.getBaseStats(type, level);
        super(x, y, baseStats.char, baseStats.color, baseStats.name);
        this.hp = baseStats.hp;
        this.maxHp = baseStats.hp;
        this.damage = baseStats.damage;
        this.type = type;
        this.pattern = baseStats.pattern;
        this.expReward = baseStats.exp;
    }

    static getBaseStats(type, level) {
        const scale = 1 + (level - 1) * 0.2;
        switch(type) {
            case 'goblin':
                return {
                    name: 'Goblin', char: 'g', color: '#6a994e',
                    hp: Math.floor(12 * scale), damage: Math.floor(4 * scale),
                    exp: 50, pattern: 'basic'
                };
            case 'skeleton':
                return {
                    name: 'Squelette', char: 's', color: '#bcb8b1',
                    hp: Math.floor(18 * scale), damage: Math.floor(6 * scale),
                    exp: 70, pattern: 'defensive'
                };
            case 'mage':
                return {
                    name: 'Mage Noir', char: 'm', color: '#9a6ea7',
                    hp: Math.floor(10 * scale), damage: Math.floor(9 * scale),
                    exp: 100, pattern: 'ranged'
                };
            case 'ogre':
                return {
                    name: 'Ogre', char: 'O', color: '#b36b3c',
                    hp: Math.floor(35 * scale), damage: Math.floor(11 * scale),
                    exp: 150, pattern: 'brute'
                };
            default:
                return {
                    name: 'Squelette', char: 's', color: '#bcb8b1',
                    hp: 15, damage: 5, exp: 60, pattern: 'basic'
                };
        }
    }

    attack(player) {
        let damageDealt = this.damage;
        // patterns spéciaux
        if (this.pattern === 'ranged' && Math.random() < 0.4) {
            damageDealt = Math.floor(this.damage * 1.3);
            addMessage(`⭐ ${this.name} lance un sort ! ${damageDealt} dégâts!`);
        }
        if (this.pattern === 'defensive' && Math.random() < 0.3) {
            addMessage(`🛡️ ${this.name} se défend, dégâts réduits de moitié`);
            damageDealt = Math.floor(damageDealt / 2);
        }
        if (this.pattern === 'brute' && Math.random() < 0.25) {
            damageDealt = Math.floor(this.damage * 1.6);
            addMessage(`💢 ${this.name} charge sauvagement! ${damageDealt} dégâts!`);
        }
        let finalDamage = player.takeDamage(damageDealt);
        addMessage(`⚔️ ${this.name} vous inflige ${finalDamage} dégâts.`);
        return finalDamage;
    }
}

class Item {
    constructor(type, name, bonusDamage = 0, bonusDefense = 0, healAmount = 0) {
        this.type = type;
        this.name = name;
        this.bonusDamage = bonusDamage;
        this.bonusDefense = bonusDefense;
        this.healAmount = healAmount;
    }
}

// Système de messages global
let messageQueue = [];
function addMessage(msg) {
    messageQueue.unshift(msg);
    if (messageQueue.length > 8) messageQueue.pop();
    updateMessageLog();
}
